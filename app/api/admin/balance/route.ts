import {NextResponse} from 'next/server';
import {readDB,writeDB,userFromRequest,logActivity} from '../../../lib/server';
import {addSystemMessage} from '../../../lib/notifications';
export const runtime='nodejs';
export async function PATCH(req:Request){
  const admin=userFromRequest(req);
  if(!admin||admin.role!=='admin')return NextResponse.json({error:'Forbidden'},{status:403});
  const {userId,amount,mode}=await req.json();
  const db=readDB();
  const u=db.users.find((x:any)=>x.id===String(userId)&&x.role==='customer');
  const n=Math.round(Number(amount)*100)/100;
  if(!u||!Number.isFinite(n)||n<=0)return NextResponse.json({error:'Invalid balance adjustment amount'},{status:400});
  
  const currentBalance=Math.round(Number(u.balance||0)*100)/100;
  let newBalance=mode==='deduct'?(currentBalance-n):(currentBalance+n);
  if(newBalance<0)newBalance=0;
  u.balance=Math.round(newBalance*100)/100;
  
  logActivity(db,admin.id,mode==='deduct'?'BALANCE_DEDUCTED':'BALANCE_ADDED',`${mode==='deduct'?'Deducted':'Added'} $${n.toFixed(2)} for ${u.email}`);
  addSystemMessage(db,u.id,mode==='deduct'?`Your Total Balance has been reduced by $${n.toFixed(2)}. Your current balance is $${u.balance.toFixed(2)}.`:`Your Total Balance has been updated with a $${n.toFixed(2)} deposit. Your current balance is $${u.balance.toFixed(2)}.`);
  writeDB(db);
  return NextResponse.json({user:{id:u.id,balance:u.balance}});
}
