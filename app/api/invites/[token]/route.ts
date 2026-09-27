import {NextResponse} from "next/server";
import {readDB} from "../../../lib/server";
export const runtime="nodejs";
export async function GET(_req:Request,{params}:{params:Promise<{token:string}>}){const {token}=await params;const db=readDB();const i=db.invites.find((x:any)=>x.token===token);if(!i)return NextResponse.json({valid:false,error:"Invitation not found."},{status:404});if(i.usedAt||i.revokedAt||i.expiresAt<Date.now())return NextResponse.json({valid:false,error:i.usedAt?"This invitation has already been used.":i.revokedAt?"This invitation has been revoked.":"This invitation has expired."},{status:410});return NextResponse.json({valid:true,expiresAt:i.expiresAt});}
