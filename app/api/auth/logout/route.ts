import {NextResponse} from "next/server"; import crypto from "node:crypto"; import {readDB,writeDB,userFromRequest,tokenFromRequest} from "../../../lib/server";
export const runtime="nodejs";
export async function POST(req:Request){const token=tokenFromRequest(req);const user=userFromRequest(req);const db=readDB();if(token)delete db.sessions[token];if(user)db.activity.unshift({id:crypto.randomUUID(),userId:user.id,action:"LOGOUT",description:"Logged out",createdAt:new Date().toISOString()});writeDB(db);return NextResponse.json({ok:true});}
