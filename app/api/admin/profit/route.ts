import {NextResponse} from "next/server";
import {userFromRequest} from "../../../lib/server";
export const runtime="nodejs";
export async function PATCH(req:Request){
  const admin=userFromRequest(req);
  if(!admin||admin.role!=="admin")return NextResponse.json({error:"Forbidden"},{status:403});
  return NextResponse.json({error:"Manual profit adjustments are disabled. Total Profit is earned from completed order commissions only."},{status:410});
}
