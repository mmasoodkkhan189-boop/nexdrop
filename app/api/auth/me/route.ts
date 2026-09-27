import {NextResponse} from "next/server"; import {readDB,safeUser,userFromRequest} from "../../../lib/server";
export const runtime="nodejs";
export async function GET(req:Request){const user=userFromRequest(req);if(!user)return NextResponse.json({error:"Not authenticated"},{status:401});const db=readDB();return NextResponse.json({user:safeUser(user),activity:db.activity.filter(a=>a.userId===user.id).slice(0,20)});}
