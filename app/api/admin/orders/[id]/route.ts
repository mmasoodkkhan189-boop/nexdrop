import {NextResponse} from "next/server";
import {readDB,writeDB,userFromRequest,logActivity} from "../../../../lib/server";
import {addSystemMessage} from "../../../../lib/notifications";
import {orderStatusLabel, ALL_ORDER_STATUSES} from "../../../../order-statuses";

export const runtime="nodejs";

const VALID_STATUSES = ALL_ORDER_STATUSES.map(s => s.value);

// Withdraw an order the customer hasn't grabbed yet. No money has moved for a
// 'sent' order, so it can simply be removed; anything later has to go through
// the normal status flow.
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
 const admin=userFromRequest(req); if(!admin||admin.role!=="admin")return NextResponse.json({error:"Forbidden"},{status:403});
 const {id}=await params; const db=readDB();
 const idx=(db.orders||[]).findIndex((x:any)=>x.id===id);
 if(idx===-1)return NextResponse.json({error:"Order not found"},{status:404});
 const o=db.orders[idx];
 if(o.status!=="sent"||o.grabbedAt){
   return NextResponse.json({error:"Only orders the customer hasn't grabbed yet can be withdrawn."},{status:409});
 }
 db.orders.splice(idx,1);
 addSystemMessage(db,o.customerId,`The order ${o.productName} has been withdrawn and is no longer available.`);
 logActivity(db,admin.id,"ORDER_WITHDRAWN",`Withdrew ${o.productName}`);
 writeDB(db);
 return NextResponse.json({ok:true});
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const admin=userFromRequest(req); if(!admin||admin.role!=="admin")return NextResponse.json({error:"Forbidden"},{status:403});
 const {id}=await params; const body=await req.json(); const status=String(body.status||""); const db=readDB(); const o=(db.orders||[]).find((x:any)=>x.id===id);
 if(!o)return NextResponse.json({error:"Order not found"},{status:404});
 if(status===o.status)return NextResponse.json({order:o});

 if(!VALID_STATUSES.includes(status as any)){
   return NextResponse.json({error:`Invalid status: ${status}`},{status:400});
 }

 const customer=db.users.find((u:any)=>u.id===o.customerId);

 // Completed orders are final: payout already happened, and reversing it
 // could push the customer's balance below zero. The UI shows them as locked.
 if(o.status==="completed"){
   return NextResponse.json({error:"Completed orders are locked and can't be changed."},{status:409});
 }

 // A 'sent' order is waiting for the customer. Only the customer can grab it
 // (that's when the order amount is deducted, with a balance check), so the
 // admin must not move it forward and charge the customer on their behalf.
 if(o.status==="sent" && status!=="sent" && !o.grabbedAt){
   return NextResponse.json({error:"This order is still waiting for the customer to grab it."},{status:409});
 }

 // If status is becoming 'completed' and wasn't before
 if(status==="completed" && o.status!=="completed"){
   if(!customer)return NextResponse.json({error:"Customer not found"},{status:404});
   customer.balance=Number(customer.balance||0)+Number(o.orderAmount)+Number(o.commission);
   customer.profit=Number(customer.profit||0)+Number(o.commission);
   o.status="completed"; o.completedAt=new Date().toISOString();
   addSystemMessage(db,customer.id,`Your order ${o.productName} is completed. $${Number(o.orderAmount).toFixed(2)} order amount and $${Number(o.commission).toFixed(2)} commission have been added to your Total Balance. Your Total Profit is now $${Number(customer.profit).toFixed(2)}.`);
   logActivity(db,admin.id,"ORDER_COMPLETED",`Completed ${o.productName}; returned $${Number(o.orderAmount).toFixed(2)} + $${Number(o.commission).toFixed(2)} commission`);
   writeDB(db); return NextResponse.json({order:o,customer:{balance:customer.balance,profit:customer.profit}});
 }

 // If status is moved back to 'sent' from active processing, refund the grab
 if(o.status!=="sent" && status==="sent" && o.grabbedAt){
   if(customer){
     customer.balance=Number(customer.balance||0)+Number(o.orderAmount);
   }
   delete o.grabbedAt;
 }

 o.status=status; o.statusUpdatedAt=new Date().toISOString();
 const label=orderStatusLabel(status);
 addSystemMessage(db,o.customerId,`Your order ${o.productName} status has been updated to ${label}.`);
 logActivity(db,admin.id,"ORDER_STATUS_UPDATED",`Changed ${o.productName} status to ${status}`);
 writeDB(db); return NextResponse.json({order:o,customer:customer?{balance:customer.balance,profit:customer.profit}:undefined});
}

