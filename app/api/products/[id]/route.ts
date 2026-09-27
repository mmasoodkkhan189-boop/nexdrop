import { NextResponse } from "next/server";
import { readDB, writeDB, userFromRequest } from "../../../lib/server";


export const runtime = "nodejs";



// UPDATE PRODUCT
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {


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



  const { id } = await context.params;
  const db = readDB();


  const product = db.products?.find(
    (p:any)=>p.id === id
  );



  if(!product){

    return NextResponse.json(
      {
        error:"Product not found"
      },
      {
        status:404
      }
    );

  }



  const body = await req.json();



  Object.assign(product,{

    sku:
      body.sku ?? product.sku,


    name:
      body.name ?? product.name,


    brand:
      body.brand ?? product.brand,


    supplier:
      body.supplier ?? product.supplier,


    category:
      body.category ?? product.category,


    description:
      body.description ?? product.description,


    purchasePrice:
      body.purchasePrice !== undefined
        ? Number(body.purchasePrice)
        : product.purchasePrice,


    price:
      body.price !== undefined
        ? Number(body.price)
        : product.price,


    image:
      body.image ?? product.image,


    stock:
      body.stock !== undefined
        ? Number(body.stock)
        : product.stock,


    lowStockLimit:
      body.lowStockLimit !== undefined
        ? Number(body.lowStockLimit)
        : product.lowStockLimit,


    status:
      body.status ?? product.status

});

  writeDB(db);



  return NextResponse.json({
    product
  });


}





// DELETE PRODUCT
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {


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



  const { id } = await context.params;
  const db = readDB();



  const index = db.products?.findIndex(
    (p:any)=>p.id === id
  );



  if(index === -1 || index === undefined){

    return NextResponse.json(
      {
        error:"Product not found"
      },
      {
        status:404
      }
    );

  }



  db.products!.splice(index,1);



  writeDB(db);



  return NextResponse.json({
    success:true
  });


}