import crypto from "node:crypto";
import {NextResponse} from "next/server";

import {readDB,writeDB,userFromRequest,logActivity} from "../../../lib/server";

export const runtime="nodejs";

function admin(req:Request){
  const u=userFromRequest(req);
  return u?.role==="admin"?u:null;
}

export async function GET(req:Request){
  const a=admin(req);
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});

  const db=readDB();
  const now=Date.now();
  const invites=db.invites.map((i:any)=>{
    const usedBy=i.usedBy ? db.users.find((u:any)=>u.id===i.usedBy) : null;
    const used=!!i.usedAt;
    const revoked=!used && !!i.revokedAt;
    const expired=!used && !revoked && Number(i.expiresAt)<now;
    return {
      ...i,
      used,
      revoked,
      expired,
      status: used ? "used" : revoked ? "revoked" : expired ? "expired" : "available",
      usedByUser: usedBy ? { id:usedBy.id, name:usedBy.name, email:usedBy.email, profileImage:usedBy.profileImage || "" } : null
    };
  });

  return NextResponse.json({invites});
}

export async function POST(req:Request){
  const a=admin(req);
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});

  const body=await req.json().catch(()=>({}));
  const days=Math.min(Math.max(Number(body.days)||7,1),30);

  const token=crypto.randomBytes(18).toString("base64url");

  const now=new Date();

  const invite={
    id:crypto.randomUUID(),
    token,
    createdBy:a.id,
    createdAt:now.toISOString(),
    expiresAt:Date.now()+days*86400000
  };

  const db=readDB();

  db.invites.unshift(invite);

  logActivity(
    db,
    a.id,
    "INVITE_CREATED",
    `Invitation created; expires in ${days} day(s)`
  );

  writeDB(db);

  const origin =
    req.headers.get("x-forwarded-proto") &&
    req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
      : new URL(req.url).origin;

  return NextResponse.json({
    invite:{
      ...invite,
      url:`${origin}/register?invite=${token}`
    }
  });
}