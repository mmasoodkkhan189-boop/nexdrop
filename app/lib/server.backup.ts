import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type User = { id:string; name:string; username?:string; email:string; phone?:string; countryCode?:string; country?:string; profileImage?:string; passwordHash:string; salt:string; role:"customer"|"admin"; status:"Active"|"Suspended"; createdAt:string; balance?:number; profit?:number };
type Message = { id:string; conversationId:string; senderId:string; text:string; imageUrl?:string; createdAt:string; readBy?:string[] };
type Conversation = { id:string; customerId:string; status:"open"|"closed"; updatedAt:string };
type Invite = { id:string; token:string; createdBy:string; createdAt:string; expiresAt:number; usedAt?:string; usedBy?:string; revokedAt?:string };
type DB = { users:User[]; sessions:Record<string,{userId:string;expiresAt:number}>; activity:{id:string;userId:string;action:string;description:string;createdAt:string}[]; conversations:Conversation[]; messages:Message[]; invites:Invite[]; products?:any[]; orders?:any[] };
const file=path.join(process.cwd(),"data","db.json");
function ensure(){if(!fs.existsSync(file)){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({users:[],sessions:{},activity:[],conversations:[],messages:[],invites:[]},null,2));}}
export function readDB():DB{ensure();const db=JSON.parse(fs.readFileSync(file,"utf8")); if(!db.invites) db.invites=[]; if(!db.products) db.products=[]; if(!db.orders) db.orders=[]; if(!db.conversations) db.conversations=[]; if(!db.messages) db.messages=[]; for(const m of db.messages){if(!Array.isArray(m.readBy))m.readBy=[];} return db;}
export function writeDB(db:DB){fs.writeFileSync(file,JSON.stringify(db,null,2));}
export function hashPassword(password:string,salt?:string){const s=salt||crypto.randomBytes(16).toString("hex");return {salt:s,hash:crypto.scryptSync(password,Buffer.from(s,"hex"),64).toString("hex")};}
export function verifyPassword(password:string,user:User){const hash=crypto.scryptSync(password,Buffer.from(user.salt,"hex"),64).toString("hex");return crypto.timingSafeEqual(Buffer.from(hash,"hex"),Buffer.from(user.passwordHash,"hex"));}
export function safeUser(u:User){return {id:u.id,name:u.name,username:u.username||"",email:u.email,phone:u.phone||"",countryCode:u.countryCode||"+1",country:u.country||"United States",profileImage:u.profileImage||"",role:u.role,status:u.status,createdAt:u.createdAt,balance:Number((u as any).balance||0),profit:Number((u as any).profit||0)};}
export function logActivity(db:DB,userId:string,action:string,description:string){db.activity.unshift({id:crypto.randomUUID(),userId,action,description,createdAt:new Date().toISOString()});db.activity=db.activity.slice(0,5000);}
export function newSession(db:DB,userId:string,days=7){const token=crypto.randomBytes(32).toString("hex");db.sessions[token]={userId,expiresAt:Date.now()+1000*60*60*24*days};return token;}
export function userFromToken(token?:string|null){if(!token)return null;const db=readDB();const s=db.sessions[token];if(!s)return null;if(s.expiresAt<Date.now()){delete db.sessions[token];writeDB(db);return null;}return db.users.find(u=>u.id===s.userId)||null;}

export function tokenFromRequest(req:Request){
  const auth=req.headers.get("authorization")||"";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
}
export function userFromRequest(req:Request){return userFromToken(tokenFromRequest(req));}
