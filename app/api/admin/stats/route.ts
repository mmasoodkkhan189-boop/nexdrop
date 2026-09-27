import { NextResponse } from "next/server";
import { readDB, userFromRequest } from "../../../lib/server";

export const runtime = "nodejs";


export async function GET(req: Request) {


  const admin = userFromRequest(req);


  if (!admin || admin.role !== "admin") {

    return NextResponse.json(
      {
        error:"Forbidden"
      },
      {
        status:403
      }
    );

  }



  const db = readDB();



  const users = db.users || [];
  const products = db.products || [];
  const orders = db.orders || [];




  const totalUsers = users.length;



  const totalSellers = users.filter(
    (u:any)=>u.role==="seller"
  ).length;




  const totalProducts = products.length;



  const totalOrders = orders.length;





  const pendingOrders = orders.filter(
    (o:any)=>
      o.status==="pending" ||
      o.status==="sent"
  ).length;




  const onWayOrders = orders.filter(
    (o:any)=>
      o.status==="on_the_way" ||
      o.status==="handed_over"
  ).length;




  const deliveredOrders = orders.filter(
    (o:any)=>
      o.status==="delivered"
  ).length;




  const completedOrders = orders.filter(
    (o:any)=>
      o.status==="completed"
  ).length;







  const totalSales = orders
    .filter((o:any)=>o.status==="completed")
    .reduce(
      (sum:number,o:any)=>
        sum + Number(o.orderAmount || 0),
      0
    );






  const totalCommission = orders
    .filter((o:any)=>o.status==="completed")
    .reduce(
      (sum:number,o:any)=>
        sum + Number(o.commission || 0),
      0
    );







  const activeProducts = products.filter(
    (p:any)=>p.status==="Active"
  ).length;






  const inactiveProducts = products.filter(
    (p:any)=>p.status==="Inactive"
  ).length;







  const outOfStockProducts = products.filter(
    (p:any)=>
      Number(p.stock || 0) <= 0
  ).length;







  const lowStockProducts = products.filter(
    (p:any)=>
      Number(p.stock || 0) > 0 &&
      Number(p.stock || 0) <= 10
  ).length;








  const pendingWithdrawals = db.withdrawRequests
    ? db.withdrawRequests.filter(
        (w:any)=>w.status==="Pending"
      ).length
    : 0;








  const activePackages = db.packages
    ? db.packages.filter(
        (p:any)=>p.status==="Active"
      ).length
    : 0;








  return NextResponse.json({

    totalUsers,

    totalSellers,

    totalProducts,

    totalOrders,


    pendingOrders,

    onWayOrders,

    deliveredOrders,

    completedOrders,


    totalSales,

    totalCommission,


    activeProducts,

    inactiveProducts,

    lowStockProducts,

    outOfStockProducts,


    pendingWithdrawals,

    activePackages

  });


}