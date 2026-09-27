import { NextResponse } from "next/server";
import { readDB, writeDB, userFromRequest } from "../../lib/server";
import crypto from "node:crypto";

export const runtime = "nodejs";


// GET CUSTOMER STORE PRODUCTS
export async function GET(req: Request) {

  const user = userFromRequest(req);

  if (!user || user.role !== "customer") {

    return NextResponse.json(
      {
        error: "Unauthorized"
      },
      {
        status: 401
      }
    );

  }

  const db = readDB();

  const sellerProducts = (db.sellerProducts || [])
    .filter(
      (p: any) => p.sellerId === user.id
    );

  const products = sellerProducts.map((item: any) => {

    const product = (db.products || [])
      .find(
        (p: any) => p.id === item.productId
      );

    return {
      ...item,
      product
    };

  });

  return NextResponse.json({
    products
  });

}


// ADD PRODUCT TO MY STORE
export async function POST(req: Request) {

  const user = userFromRequest(req);

  if (!user || user.role !== "customer") {

    return NextResponse.json(
      {
        error: "Unauthorized"
      },
      {
        status: 401
      }
    );

  }

  try {

    const body = await req.json();

    if (!body.productId) {

      return NextResponse.json(
        {
          error: "Product ID required"
        },
        {
          status: 400
        }
      );

    }

    const db = readDB();

    if (!db.sellerProducts) {

      db.sellerProducts = [];

    }


    /*
      Get the latest customer record directly
      from the database.

      This prevents an old session/user object
      from bypassing the package limit.
    */

    const customer = (db.users || [])
      .find(
        (u: any) =>
          u.id === user.id &&
          u.role === "customer"
      );


    if (!customer) {

      return NextResponse.json(
        {
          error: "Customer account not found"
        },
        {
          status: 404
        }
      );

    }


    /*
      PRODUCT LIMIT

      Example:
      Diamond = 300

      If seller already has 300 products,
      the 301st product is blocked.
    */

    const productLimit = Number(
      customer.productLimit || 0
    );


    const sellerProductCount =
      db.sellerProducts.filter(
        (p: any) =>
          p.sellerId === customer.id
      ).length;


    if (productLimit <= 0) {

      return NextResponse.json(
        {
          error:
            "Your package is not active or your product limit is not available."
        },
        {
          status: 403
        }
      );

    }


    if (sellerProductCount >= productLimit) {

      return NextResponse.json(
        {
          error:
            `Product limit reached. Your package allows ${productLimit} products.`
        },
        {
          status: 403
        }
      );

    }


    /*
      Check duplicate product
    */

    const alreadyAdded =
      db.sellerProducts.find(
        (p: any) =>
          p.sellerId === customer.id &&
          p.productId === body.productId
      );


    if (alreadyAdded) {

      return NextResponse.json(
        {
          error: "Product already added"
        },
        {
          status: 400
        }
      );

    }


    /*
      Check product exists
    */

    const product =
      (db.products || [])
        .find(
          (p: any) =>
            p.id === body.productId
        );


    if (!product) {

      return NextResponse.json(
        {
          error: "Product not found"
        },
        {
          status: 404
        }
      );

    }


    /*
      Create seller product
    */

    const sellerProduct = {

      id: crypto.randomUUID(),

      sellerId: customer.id,

      productId: body.productId,

      addedDate: new Date().toISOString(),

      status: "active"

    };


    db.sellerProducts.push(
      sellerProduct
    );


    writeDB(db);


    return NextResponse.json({

      success: true,

      sellerProduct,

      productsAdded:
        sellerProductCount + 1,

      productLimit,

      remainingSlots:
        Math.max(
          productLimit -
          (sellerProductCount + 1),
          0
        )

    });


  } catch (error) {

    console.error(
      "STORE PRODUCT ADD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to add product"
      },
      {
        status: 500
      }
    );

  }

}