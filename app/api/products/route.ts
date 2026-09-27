import { NextResponse } from "next/server";
import { readDB, writeDB, userFromRequest } from "../../lib/server";
import crypto from "node:crypto";

export const runtime = "nodejs";


// GET PRODUCTS
export async function GET() {

  const db = readDB();

  return NextResponse.json(
    {
      products: db.products || []
    },
    {
      headers:{
        "Cache-Control":"no-store"
      }
    }
  );

}



// CREATE PRODUCT
export async function POST(req:Request) {

  const admin = userFromRequest(req);


  if(!admin || admin.role !== "admin") {

    return NextResponse.json(
      {
        error:"Forbidden"
      },
      {
        status:403
      }
    );

  }



  const body = await req.json();



  if(!body.name || !body.price) {

    return NextResponse.json(
      {
        error:"Product name and price required"
      },
      {
        status:400
      }
    );

  }



  const db = readDB();



  const product = {

    id: crypto.randomUUID(),

    sku:
      body.sku ||
      `DZ-${Date.now()}`,

    name:
      body.name,


    brand:
      body.brand || "",


    supplier:
      body.supplier || "",


    category:
      body.category || "Uncategorized",


    description:
      body.description || "",


    purchasePrice:
      Number(body.purchasePrice || 0),


    price:
      Number(body.price),


    image:
      body.image || "",


    stock:
      Number(body.stock || 0),


    lowStockLimit:
      Number(body.lowStockLimit || 5),


    status:
      body.status || "Active",


    createdAt:
      new Date().toISOString()

  };



  if(!db.products) {
    db.products=[];
  }



  db.products.push(product);



  writeDB(db);



  return NextResponse.json({
    product
  });

}