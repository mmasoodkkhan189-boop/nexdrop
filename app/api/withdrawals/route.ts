import { NextResponse } from "next/server";
import crypto from "node:crypto";

import {
  readDB,
  writeDB,
  userFromRequest
} from "../../lib/server";

export const runtime = "nodejs";


export async function GET(req: Request){

  const user = userFromRequest(req);

  if(!user){

    return NextResponse.json(
      {
        error:"Not authenticated"
      },
      {
        status:401
      }
    );

  }


  const db = readDB();

  const withdrawals =
    (db as any).withdrawals || [];


  const pendingBalance =
    (db.orders || [])
      .filter(
        (order:any) =>
          order.customerId === user.id &&
          [
            "pending",
            "handed_over",
            "on_the_way",
            "delivered"
          ].includes(order.status)
      )
      .reduce(
        (total:number, order:any) =>
          total + Number(order.orderAmount || 0),
        0
      );


  const requests =
    withdrawals
      .filter(
        (item:any) =>
          user.role === "admin"
            ? true
            : item.userId === user.id
      )
      .sort(
        (a:any,b:any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );


  const customer =
    (db.users || []).find(
      (u:any) => u.id === user.id
    );


  return NextResponse.json(
    {
      requests,

      balance:
        Number(customer?.balance || 0),

      pendingBalance,

      guaranteeMoney:
        Number(
          customer?.guaranteeMoney || 0
        )
    },
    {
      headers:{
        "Cache-Control":"no-store"
      }
    }
  );

}



export async function POST(req: Request){

  const user = userFromRequest(req);


  if(
    !user ||
    user.role !== "customer"
  ){

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


  const amount =
    Number(body.amount);


  const withdrawType =
    String(
      body.withdrawType || ""
    );


  const accountDetails =
    String(
      body.accountDetails || ""
    ).trim();


  const message =
    String(
      body.message || ""
    ).trim();


  const transactionPassword =
    String(
      body.transactionPassword || ""
    ).trim();


  if(
    !amount ||
    amount <= 0
  ){

    return NextResponse.json(
      {
        error:
          "Invalid withdrawal amount."
      },
      {
        status:400
      }
    );

  }


  if(
    withdrawType !== "Wallet Balance" &&
    withdrawType !== "Guarantee Money"
  ){

    return NextResponse.json(
      {
        error:
          "Invalid withdrawal balance selected."
      },
      {
        status:400
      }
    );

  }


  if(!accountDetails){

    return NextResponse.json(
      {
        error:
          "Account details are required."
      },
      {
        status:400
      }
    );

  }


  if(!transactionPassword){

    return NextResponse.json(
      {
        error:
          "Transaction password is required."
      },
      {
        status:400
      }
    );

  }


  const db = readDB();


  const customer =
    (db.users || []).find(
      (u:any) => u.id === user.id
    );


  if(!customer){

    return NextResponse.json(
      {
        error:
          "Customer account not found."
      },
      {
        status:404
      }
    );

  }


  if(
    String(customer.transactionPassword || "") !==
    transactionPassword
  ){

    return NextResponse.json(
      {
        error:
          "Transaction password is incorrect."
      },
      {
        status:400
      }
    );

  }


  const availableBalance =
    withdrawType === "Guarantee Money"
      ? Number(
          customer.guaranteeMoney || 0
        )
      : Number(
          customer.balance || 0
        );


  if(amount > availableBalance){

    return NextResponse.json(
      {
        error:
          `Insufficient ${withdrawType.toLowerCase()}.`
      },
      {
        status:400
      }
    );

  }


  if(
    !Array.isArray(
      (db as any).withdrawals
    )
  ){

    (db as any).withdrawals = [];

  }


  const existingPending =
    (db as any).withdrawals.find(
      (item:any) =>
        item.userId === user.id &&
        item.status === "Pending"
    );


  if(existingPending){

    return NextResponse.json(
      {
        error:
          "You already have a pending withdrawal request."
      },
      {
        status:400
      }
    );

  }


  const request = {

    id:
      crypto.randomUUID(),

    userId:
      user.id,

    customerName:
      (user as any).name || "",

    email:
      (user as any).email || "",

    amount,

    withdrawType,

    accountDetails,

    message,

    status:
      "Pending",

    createdAt:
      new Date().toISOString()

  };


  (db as any).withdrawals.unshift(
    request
  );


  writeDB(db);


  return NextResponse.json(
    {
      success:true,
      request
    },
    {
      status:201
    }
  );

}



export async function PATCH(req: Request){

  const admin =
    userFromRequest(req);


  if(
    !admin ||
    admin.role !== "admin"
  ){

    return NextResponse.json(
      {
        error:"Forbidden"
      },
      {
        status:403
      }
    );

  }


  const body =
    await req.json();


  const id =
    String(body.id || "");


  const action =
    String(body.action || "");


  if(
    action !== "approved" &&
    action !== "rejected"
  ){

    return NextResponse.json(
      {
        error:
          "Invalid withdrawal action."
      },
      {
        status:400
      }
    );

  }


  const db =
    readDB();


  const withdrawals =
    (db as any).withdrawals || [];


  const request =
    withdrawals.find(
      (item:any) =>
        item.id === id
    );


  if(!request){

    return NextResponse.json(
      {
        error:
          "Withdrawal request not found."
      },
      {
        status:404
      }
    );

  }


  if(
    request.status !== "Pending"
  ){

    return NextResponse.json(
      {
        error:
          "This withdrawal request has already been processed."
      },
      {
        status:409
      }
    );

  }


  /*
   * REJECT
   *
   * Balance mein koi change nahi hoga.
   */

  if(
    action === "rejected"
  ){

    request.status =
      "Rejected";

    request.processedAt =
      new Date().toISOString();

    request.processedBy =
      admin.id;


    writeDB(db);


    return NextResponse.json({
      success:true,
      request
    });

  }


  /*
   * APPROVE
   *
   * Wallet Balance:
   * customer.balance se amount deduct.
   *
   * Guarantee Money:
   * customer.guaranteeMoney se amount deduct.
   */


  const customer =
    (db.users || []).find(
      (u:any) =>
        u.id === request.userId
    );


  if(!customer){

    return NextResponse.json(
      {
        error:
          "Customer account not found."
      },
      {
        status:404
      }
    );

  }


  const amount =
    Number(
      request.amount || 0
    );


  if(
    !Number.isFinite(amount) ||
    amount <= 0
  ){

    return NextResponse.json(
      {
        error:
          "Invalid withdrawal amount."
      },
      {
        status:400
      }
    );

  }


  if(
    request.withdrawType ===
    "Wallet Balance"
  ){

    const balance =
      Number(
        customer.balance || 0
      );


    if(amount > balance){

      return NextResponse.json(
        {
          error:
            "Customer wallet balance is insufficient."
        },
        {
          status:409
        }
      );

    }


    customer.balance =
      balance - amount;

  }


  else if(
    request.withdrawType ===
    "Guarantee Money"
  ){

    const guaranteeMoney =
      Number(
        customer.guaranteeMoney || 0
      );


    if(
      amount > guaranteeMoney
    ){

      return NextResponse.json(
        {
          error:
            "Customer Guarantee Money is insufficient."
        },
        {
          status:409
        }
      );

    }


    customer.guaranteeMoney =
      guaranteeMoney - amount;

  }


  else{

    return NextResponse.json(
      {
        error:
          "Invalid withdrawal balance type."
      },
      {
        status:400
      }
    );

  }


  request.status =
    "Approved";


  request.processedAt =
    new Date().toISOString();


  request.processedBy =
    admin.id;


  writeDB(db);


  return NextResponse.json({
    success:true,
    request
  });

}