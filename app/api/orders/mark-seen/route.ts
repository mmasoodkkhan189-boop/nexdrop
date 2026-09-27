import { NextResponse } from "next/server";
import { readDB, writeDB, userFromRequest } from "../../../lib/server";

export const runtime = "nodejs";

// GET — return count of unseen orders for current customer
export async function GET(req: Request) {
  const user = userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = readDB();
  const count = db.orders.filter(
    (o: any) => o.customerId === user.id && !o.seenByCustomer
  ).length;

  return NextResponse.json({ unseenCount: count });
}

// POST — mark all orders as seen for current customer
export async function POST(req: Request) {
  const user = userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = readDB();
  let changed = 0;
  for (const o of db.orders) {
    if (o.customerId === user.id && !o.seenByCustomer) {
      o.seenByCustomer = true;
      changed++;
    }
  }
  if (changed > 0) writeDB(db);

  return NextResponse.json({ ok: true, marked: changed });
}
