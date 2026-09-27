import { NextResponse } from "next/server";
import { readDB, writeDB, userFromRequest } from "../../lib/server";

export const runtime = "nodejs";


// GET CUSTOMER STORE PRODUCTS

export async function GET(req:Request){

  const user = userFromRequest(req);


  if(!user || user.role !== "customer"){

    return NextResponse.json(
      {
        error:"Unauthorized"
      },
      {
        status:401
      }
    );

  }


  const db = readDB();
  if(!db.sellerProducts) db.sellerProducts = [];

  let items = db.sellerProducts.filter(
    (p:any)=>p.sellerId === user.id
  );

  const limit = Number(user.productLimit || 0);

  // Auto-populate from catalog if user has an active package with limit
  if(limit > 0 && items.length < limit && (db.products || []).length > 0){
    const existingIds = new Set(items.map((it:any)=>String(it.productId)));
    const available = (db.products || []).filter((p:any)=>!existingIds.has(String(p.id)));
    const needed = limit - items.length;
    const toAdd = available.slice(0, needed);

    for(const prod of toAdd){
      db.sellerProducts.push({
        id: crypto.randomUUID(),
        sellerId: user.id,
        productId: prod.id,
        addedDate: new Date().toISOString(),
        status: "active"
      });
    }

    if(toAdd.length > 0){
      writeDB(db);
      items = db.sellerProducts.filter((p:any)=>p.sellerId === user.id);
    }
  }


  const products = items.map((item:any)=>{

    const product = (db.products || [])
      .find(
        (p:any)=>String(p.id) === String(item.productId)
      );


    return {
      ...item,
      product
    };

  }).filter((item:any) => Boolean(item.product));


  return NextResponse.json({
    products
  });


}





// ADD PRODUCT TO STORE

export async function POST(req:Request){

  const user = userFromRequest(req);


  if(!user || user.role !== "customer"){

    return NextResponse.json(
      {
        error:"Unauthorized"
      },
      {
        status:401
      }
    );

  }



  const body = await req.json();



  if(!body.productId){

    return NextResponse.json(
      {
        error:"Product ID required"
      },
      {
        status:400
      }
    );

  }


if(user.packageStatus !== "active"){

  return NextResponse.json(
    {
      error:"Please select a package and wait for admin approval."
    },
    {
      status:403
    }
  );

}


  const db = readDB();



  if(!db.sellerProducts){

    db.sellerProducts=[];

  }



  const alreadyAdded = db.sellerProducts.find(
    (p:any)=>
      p.sellerId === user.id &&
      p.productId === body.productId
  );



  if(alreadyAdded){

    return NextResponse.json(
      {
        error:"Product already added"
      },
      {
        status:400
      }
    );

  }



  const newProduct = {

    id:crypto.randomUUID(),

    sellerId:user.id,

    productId:body.productId,

    addedDate:new Date().toISOString(),

    status:"Active"

  };



  db.sellerProducts.push(newProduct);



  writeDB(db);



  return NextResponse.json({

    success:true,

    product:newProduct

  });


}
export async function DELETE(req:Request){

  const user = userFromRequest(req);


  if(!user || user.role !== "customer"){

    return NextResponse.json(
      {
        error:"Unauthorized"
      },
      {
        status:401
      }
    );

  }



  const body = await req.json();



  if(!body.id){

    return NextResponse.json(
      {
        error:"Product id required"
      },
      {
        status:400
      }
    );

  }



  const db = readDB();



  db.sellerProducts =
    (db.sellerProducts || [])
    .filter(
      (p:any)=>
        !(
          p.id === body.id &&
          p.sellerId === user.id
        )
    );



  writeDB(db);



  return NextResponse.json({
    success:true
  });

}