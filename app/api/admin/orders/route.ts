import {NextResponse} from 'next/server';
import crypto from 'node:crypto';
import {readDB,writeDB,userFromRequest,logActivity} from '../../../lib/server';

import {addSystemMessage} from '../../../lib/notifications';
export const runtime='nodejs';
export async function GET(req:Request){const admin=userFromRequest(req);if(!admin||admin.role!=='admin')return NextResponse.json({error:'Forbidden'},{status:403});const db=readDB();return NextResponse.json({orders:db.orders||[],users:db.users.map((u:any)=>({
id:u.id,
name:u.name,
email:u.email,
profileImage:u.profileImage || "",
shopName:u.shopName || "",
balance:Number(u.balance||0),
profit:Number(u.profit||0),
status:u.status,
role:u.role,
currentPackage: u.currentPackage || u.currentPackageName || "",
currentPackageName: u.currentPackageName || u.currentPackage || "",
commissionRate: Number(u.commissionRate || 0),
productLimit: Number(
  u.productLimit ||
  (db.packages?.find((p:any) => p.id?.toLowerCase() === String(u.currentPackage || u.currentPackageName || "").toLowerCase())?.productLimit) ||
  (String(u.currentPackage || u.currentPackageName || "").toLowerCase().includes("diamond") ? 300 : String(u.currentPackage || u.currentPackageName || "").toLowerCase().includes("bronze") ? 200 : 100)
)
}))},{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:Request){

  const admin = userFromRequest(req);

  if(!admin || admin.role!=="admin")
    return NextResponse.json(
      {error:"Forbidden"},
      {status:403}
    );


  const body = await req.json();


  const customerInput = String(
    body.customerId || ""
  ).trim();

  const productId = String(
    body.productId || ""
  ).trim();


  const db = readDB();


  const customer = (db.users || []).find(
    (u:any)=>
      u.role !== "admin" && (
        String(u.id).toLowerCase() === customerInput.toLowerCase() ||
        String(u.email || "").toLowerCase() === customerInput.toLowerCase() ||
        String(u.username || "").toLowerCase() === customerInput.toLowerCase()
      )
  );


  const productIndex = (db.products || []).findIndex(
    (p:any)=>
      String(p.id) === productId
  );

  const product = productIndex !== -1 ? db.products[productIndex] : null;


  if(!customer){

    return NextResponse.json(
      {
        error:"Customer not found. Please select a valid customer from the list."
      },
      {
        status:404
      }
    );

  }

  if(!product){

    return NextResponse.json(
      {
        error:"Product not found. Please select a valid product from the list."
      },
      {
        status:404
      }
    );

  }

  const customerLimit = Number(
    customer.productLimit ||
    (db.packages?.find((p:any) => p.id?.toLowerCase() === String(customer.currentPackage || customer.currentPackageName || "").toLowerCase())?.productLimit) ||
    (String(customer.currentPackage || customer.currentPackageName || "").toLowerCase().includes("diamond") ? 300 : String(customer.currentPackage || customer.currentPackageName || "").toLowerCase().includes("bronze") ? 200 : 100)
  );

  if (customerLimit > 0 && productIndex >= customerLimit) {
    const planName = customer.currentPackageName || customer.currentPackage || "Customer's";
    return NextResponse.json(
      {
        error: `This product (#${productIndex + 1}) exceeds ${customer.name}'s ${planName} package limit of ${customerLimit} products. Please select a product within the allowed ${customerLimit} products.`
      },
      { status: 400 }
    );
  }




  const commissionPercent = Number(
    (customer as any).commissionRate || 0
  );



  if(
    !commissionPercent ||
    commissionPercent <= 0
  ){

    return NextResponse.json(
      {
        error:"Customer package commission not found."
      },
      {
        status:400
      }
    );

  }



  const orderAmount = Number(
    product.price || 0
  );


  const commission =
    Math.round(
      orderAmount *
      commissionPercent
    ) / 100;



  const order = {
    id:crypto.randomUUID(),
    customerId: customer.id,
    productId: String(product.id),
    productName: product.name,
    image: product.image,
    orderAmount,
    commission,
    commissionPercent,
    totalAmount: orderAmount + commission,
    status:"sent",
    createdAt: new Date().toISOString(),
    seenByCustomer: false
  };



  if(!db.orders)
    db.orders=[];


  db.orders.unshift(order);



  logActivity(
    db,
    admin.id,
    "ORDER_SENT",
    `Sent ${product.name} to ${customer.name}`
  );



  addSystemMessage(
    db,
    customer.id,
    `A new order is available: ${product.name}. Order Amount: $${orderAmount.toFixed(2)}. Commission: $${commission.toFixed(2)} (${commissionPercent}%).`
  );



  writeDB(db);



  return NextResponse.json({
    order
  });


}
