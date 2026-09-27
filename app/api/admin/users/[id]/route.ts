import {NextResponse} from "next/server";
import {
  readDB,
  writeDB,
  safeUser,
  userFromRequest,
  logActivity
} from "../../../../lib/server";

export const runtime="nodejs";


export async function PATCH(
  req:Request,
  {params}:{params:Promise<{id:string}>}
){

  const admin=userFromRequest(req);

  if(!admin || admin.role!=="admin"){
    return NextResponse.json(
      {error:"Forbidden"},
      {status:403}
    );
  }


  const {id}=await params;

  const body=await req.json();

  const db=readDB();

  const user=db.users.find(
    (u:any)=>u.id===id
  );


  if(!user){
    return NextResponse.json(
      {error:"User not found"},
      {status:404}
    );
  }


  if(
    body.status &&
    (["Active","Suspended"] as string[]).includes(
      body.status
    )
  ){

    user.status=body.status;

    logActivity(
      db,
      admin.id,
      "USER_STATUS_CHANGED",
      `${user.email} changed to ${user.status}`
    );

  }


  if(
    typeof body.name==="string" &&
    body.name.trim()
  ){

    user.name=body.name.trim();

    logActivity(
      db,
      admin.id,
      "USER_UPDATED",
      `${user.email} name updated`
    );

  }


  if(
    body.guaranteeMoney !== undefined
  ){

    const amount=Number(
      body.guaranteeMoney
    );


    if(
      !Number.isFinite(amount) ||
      amount < 0
    ){

      return NextResponse.json(
        {
          error:
            "Guarantee Money must be a valid amount."
        },
        {
          status:400
        }
      );

    }


    user.guaranteeMoney=amount;


    logActivity(
      db,
      admin.id,
      "GUARANTEE_MONEY_UPDATED",
      `${user.email} Guarantee Money updated to $${amount.toFixed(2)}`
    );

  }
  if(
    body.sellerRating !== undefined
  ){

    const rating = Number(
      body.sellerRating
    );


    if(
      !Number.isFinite(rating) ||
      rating < 0 ||
      rating > 5
    ){

      return NextResponse.json(
        {
          error:
            "Seller Rating must be between 0 and 5."
        },
        {
          status:400
        }
      );

    }


    user.sellerRating = rating;
console.log("SAVED USER:", user);


    logActivity(
      db,
      admin.id,
      "SELLER_RATING_UPDATED",
      `${user.email} rating updated to ${rating}`
    );

  }

  writeDB(db);


  return NextResponse.json({
    user:safeUser(user)
  });

}



export async function DELETE(
  req:Request,
  {params}:{params:Promise<{id:string}>}
){

  const admin=userFromRequest(req);

  if(!admin || admin.role!=="admin"){
    return NextResponse.json(
      {error:"Forbidden"},
      {status:403}
    );
  }


  const {id}=await params;

  const db=readDB();

  const idx=db.users.findIndex(
    (u:any)=>
      u.id===id &&
      u.role==="customer"
  );


  if(idx<0){
    return NextResponse.json(
      {error:"Customer not found"},
      {status:404}
    );
  }


  const [removed]=db.users.splice(
    idx,
    1
  );


  db.conversations=db.conversations.filter(
    (c:any)=>c.customerId!==id
  );


  db.messages=db.messages.filter(
    (m:any)=>{

      const c=db.conversations.find(
        (x:any)=>x.id===m.conversationId
      );

      return !!c;

    }
  );


  db.orders=(db.orders||[]).filter(
    (o:any)=>o.customerId!==id
  );


  logActivity(
    db,
    admin.id,
    "USER_DELETED",
    `${removed.email} deleted`
  );


  writeDB(db);


  return NextResponse.json({
    ok:true
  });

}



export async function GET(
  req:Request,
  {params}:{params:Promise<{id:string}>}
){

  const admin=userFromRequest(req);


  if(!admin || admin.role!=="admin"){
    return NextResponse.json(
      {error:"Forbidden"},
      {status:403}
    );
  }


  const {id}=await params;

  const db=readDB();


  const user=db.users.find(
    (u:any)=>u.id===id
  );


  if(!user){
    return NextResponse.json(
      {error:"User not found"},
      {status:404}
    );
  }


  const orders=(db.orders||[]).filter(
    (o:any)=>o.customerId===id
  );


  return NextResponse.json({

    user:safeUser(user),

    orders

  });

}