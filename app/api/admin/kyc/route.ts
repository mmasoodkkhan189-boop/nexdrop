import { NextResponse } from "next/server";
import { readDB, writeDB, userFromRequest, logActivity } from "../../../lib/server";
import crypto from "node:crypto";

export const runtime = "nodejs";


// GET pending KYC applications
export async function GET(req: Request){

  const admin = userFromRequest(req);

  if(!admin || admin.role !== "admin"){
    return NextResponse.json(
      {error:"Forbidden"},
      {status:403}
    );
  }


  const db = readDB();


  const url = new URL(req.url);

const status = url.searchParams.get("status") || "pending";


const applications = db.users
    .filter((u:any)=>{

      if(u.role !== "customer") return false;


      if(status==="pending"){
        return u.kycStatus !== "Approved" && u.kycStatus !== "Rejected";
      }


      if(status==="approved"){
        return u.kycStatus === "Approved";
      }


      if(status==="rejected"){
        return u.kycStatus === "Rejected";
      }
      // "all" lets the review page load every tab (and its counts) in one call
      return status==="all";
    })
    .map((u:any)=>({

      id:u.id,

      name:u.name,

      shopName:u.shopName || "",

      email:u.email,
      country:u.country || "",
      profileImage:u.profileImage || "",
      createdAt:u.createdAt || null,
      kycStatus:u.kycStatus || "Pending",

      documents:u.kycDocuments || []

    }));


  return NextResponse.json({
    applications
  });

}



// APPROVE / REJECT KYC
export async function PATCH(req:Request){

  const admin = userFromRequest(req);


  if(!admin || admin.role !== "admin"){
    return NextResponse.json(
      {error:"Forbidden"},
      {status:403}
    );
  }


  const body = await req.json();


  const {
    userId,
    action
  } = body;



  const db = readDB();


  const user = db.users.find(
    (u:any)=>u.id===String(userId)
  );


  if(!user){

    return NextResponse.json(
      {error:"User not found"},
      {status:404}
    );

  }



  if(action==="approve"){

    user.kycStatus="Approved";
    user.status="Active";


    // Default Silver Package Activation

    const silverPackage = db.packages.find(
      (p:any)=>p.name==="Silver"
    );


    if(silverPackage){

      user.currentPackage = silverPackage.id;

      user.currentPackageName = silverPackage.name;

      user.packageStatus = "active";

      user.productLimit = Number(
        silverPackage.productLimit || 100
      );

      user.commissionRate = Number(
        silverPackage.commission || 20
      );

      user.packageExpiry = null;


      if(!db.sellerProducts){
        db.sellerProducts=[];
      }


      const existingProducts =
        db.sellerProducts.filter(
          (p:any)=>p.sellerId===user.id
        );


      const needed =
        user.productLimit - existingProducts.length;


      if(needed > 0){

        const availableProducts =
          (db.products || []).filter(
            (product:any)=>
              !existingProducts.some(
                (sp:any)=>
                  sp.productId===product.id
              )
          );


        const selected =
          availableProducts
          .sort(()=>Math.random()-0.5)
          .slice(0,needed);


        selected.forEach(
          (product:any)=>{

            db.sellerProducts.push({

              id: crypto.randomUUID(),

              sellerId:user.id,

              productId:product.id,

              addedDate:new Date().toISOString(),

              status:"active"

            });

          }
        );

      }

    }


    logActivity(
      db,
      admin.id,
      "KYC_APPROVED",
      `Approved KYC for ${user.email}`
    );

}


  if(action==="reject"){

    user.kycStatus="Rejected";


    logActivity(
      db,
      admin.id,
      "KYC_REJECTED",
      `Rejected KYC for ${user.email}`
    );

  }



  writeDB(db);


  return NextResponse.json({
    ok:true,
    status:user.kycStatus
  });

}