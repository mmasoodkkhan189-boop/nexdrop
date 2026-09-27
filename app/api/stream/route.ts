import { NextResponse } from "next/server";
import { readDB, userFromToken, getDBRevision, safeUser } from "../../lib/server";
import { markAgentSeen } from "../../lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientSnapshot(user: any) {
  const db = readDB();
  const revision = getDBRevision();

  if (user.role === "admin") {
    const pendingOrders = (db.orders || []).filter((o: any) => o.status === "sent" || o.status === "pending").length;
    const pendingKyc = (db.users || []).filter((u: any) => (u as any).kycStatus === "pending" && (u as any).documents?.length).length;
    const pendingWithdrawals = ((db as any).withdrawals || []).filter((w: any) => (w.status || "").toLowerCase() === "pending").length;
    const pendingPackageRequests = ((db as any).packageRequests || []).filter((p: any) => p.status === "pending").length;
    const totalUsers = (db.users || []).filter((u: any) => u.role !== "admin").length;
    const totalOrders = (db.orders || []).length;
    const totalSales = (db.orders || [])
      .filter((o: any) => ["delivered", "completed"].includes(o.status))
      .reduce((sum: number, o: any) => sum + Number(o.orderAmount || 0), 0);

    return {
      role: "admin",
      revision,
      pendingOrders,
      pendingKyc,
      pendingWithdrawals,
      pendingPackageRequests,
      totalUsers,
      totalOrders,
      totalSales,
      timestamp: Date.now()
    };
  }

  // Customer snapshot
  const freshUser = db.users.find((u: any) => u.id === user.id);
  const userSafe = freshUser ? safeUser(freshUser) : safeUser(user);
  const userOrders = (db.orders || []).filter((o: any) => o.customerId === user.id);
  const pendingOrders = userOrders.filter((o: any) => o.status === "sent" || o.status === "pending").length;

  return {
    role: "customer",
    revision,
    user: userSafe,
    pendingOrders,
    orderCount: userOrders.length,
    timestamp: Date.now()
  };
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const user = userFromToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let timer: any;
  let lastRevision = -1;

  const stream = new ReadableStream({
    start(controller) {
      const send = (force = false) => {
        if (closed) return;
        try {
          const currentRev = getDBRevision();
          if (force || currentRev !== lastRevision) {
            lastRevision = currentRev;
            const data = getClientSnapshot(user);
            controller.enqueue(encoder.encode(`event: sync\ndata: ${JSON.stringify(data)}\n\n`));
          }
        } catch {
          closed = true;
          clearInterval(timer);
        }
      };

      // Send initial snapshot immediately
      send(true);

      // Check for changes every 500ms
      timer = setInterval(() => {
        if (user.role === "admin") markAgentSeen(user.id);
        send(false);
      }, 500);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      closed = true;
      clearInterval(timer);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
