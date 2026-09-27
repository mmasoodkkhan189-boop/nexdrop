import {NextResponse} from "next/server"; import {readDB,userFromRequest} from "../../lib/server";
export const runtime="nodejs";
export async function GET(req:Request){const user=userFromRequest(req);if(!user)return NextResponse.json({error:"Not authenticated"},{status:401});const db=readDB();return NextResponse.json({activity:user.role==="admin"?db.activity.slice(0,100):db.activity.filter(a=>a.userId===user.id).slice(0,50)});}
