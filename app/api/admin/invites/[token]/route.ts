import {NextResponse} from "next/server";

import {readDB,writeDB,userFromRequest,logActivity} from "../../../../lib/server";
export const runtime="nodejs";
export async function DELETE(req:Request,{params}:{params:Promise<{token:string}>}){
  const a=userFromRequest(req);
  if(!a||a.role!=="admin") return NextResponse.json({error:"Forbidden"},{status:403});
  const {token}=await params;
  const db=readDB();
  const idx=db.invites.findIndex((x:any)=>x.token===token);
  if(idx===-1) return NextResponse.json({error:"Invitation not found"},{status:404});
  const invite=db.invites[idx];
  if(invite.usedAt) return NextResponse.json({error:"This invitation was already used."},{status:409});
  // Revoke rather than erase: the register flow already rejects revoked
  // tokens, and keeping the record lets the Revoked tab show it.
  if(!invite.revokedAt){
    invite.revokedAt=new Date().toISOString();
    invite.revokedBy=a.id;
  }
  logActivity(db,a.id,"INVITE_REVOKED","Invitation revoked");
  writeDB(db);
  return NextResponse.json({ok:true});
}
