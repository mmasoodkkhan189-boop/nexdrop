import { NextResponse } from "next/server";
import { readDB, writeDB, userFromRequest } from "../../../lib/server";

export const runtime = "nodejs";

// POST — admin sets store views range for a customer
export async function POST(req: Request) {
  const admin = userFromRequest(req);
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { userId, min, max } = body;

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const minV = Math.max(0, Number(min) || 0);
  const maxV = Math.max(minV, Number(max) || 0);

  const db = readDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  user.storeViewsMin = minV;
  user.storeViewsMax = maxV;

  writeDB(db);
  return NextResponse.json({ ok: true, storeViewsMin: minV, storeViewsMax: maxV });
}
