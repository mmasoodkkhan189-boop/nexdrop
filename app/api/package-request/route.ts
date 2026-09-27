import { NextResponse } from "next/server";
import { readDB, writeDB, userFromRequest } from "../../lib/server";
import crypto from "node:crypto";

export const runtime = "nodejs";


// GET PACKAGE REQUESTS
export async function GET(req: Request) {

  const user = userFromRequest(req);

  if (!user) {

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );

  }

  const db = readDB();

  const requests = [...(db.packageRequests || [])]
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )
    .map((request: any) => {

      const customer = (db.users || []).find(
        (u: any) =>
          u.id === request.userId
      );

      const pkg = (db.packages || []).find(
        (p: any) =>
          p.id === request.packageId
      );

      return {
        ...request,

        user: customer
          ? {
              id: customer.id,
              name: customer.name,
              shopName: customer.shopName,
              email: customer.email
            }
          : null,

        package: pkg
          ? {
              id: pkg.id,
              name: pkg.name,
              price: pkg.price,
              productLimit: pkg.productLimit,
              commission: pkg.commission
            }
          : null
      };

    });

  return NextResponse.json({
    requests
  });

}



// CREATE PACKAGE REQUEST
export async function POST(req: Request) {

  const user = userFromRequest(req);

  if (!user || user.role !== "customer") {

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );

  }

  const body = await req.json();

  if (!body.packageId) {

    return NextResponse.json(
      { error: "Package required" },
      { status: 400 }
    );

  }

  const db = readDB();

  const pkg = (db.packages || []).find(
    (p: any) =>
      p.id === body.packageId
  );

  if (!pkg) {

    return NextResponse.json(
      { error: "Package not found" },
      { status: 404 }
    );

  }

  const existing = (db.packageRequests || []).find(
    (r: any) =>
      r.userId === user.id &&
      r.status === "pending"
  );

  if (existing) {

    return NextResponse.json(
      { error: "Request already pending" },
      { status: 400 }
    );

  }

  const request = {

    id: crypto.randomUUID(),

    userId: user.id,

    packageId: body.packageId,

    status: "pending",

    createdAt: new Date().toISOString()

  };

  if (!db.packageRequests) {

    db.packageRequests = [];

  }

  db.packageRequests.push(request);

  writeDB(db);

  return NextResponse.json({
    success: true,
    request
  });

}



// APPROVE / REJECT PACKAGE REQUEST
export async function PATCH(req: Request) {

  const admin = userFromRequest(req);

  if (!admin || admin.role !== "admin") {

    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );

  }

  const body = await req.json();

  if (!body.id || !body.status) {

    return NextResponse.json(
      {
        error:
          "Request id and status required"
      },
      {
        status: 400
      }
    );

  }

  if (
    body.status !== "approved" &&
    body.status !== "rejected"
  ) {

    return NextResponse.json(
      {
        error: "Invalid status"
      },
      {
        status: 400
      }
    );

  }

  const db = readDB();

  const request = (db.packageRequests || []).find(
    (r: any) =>
      r.id === body.id
  );

  if (!request) {

    return NextResponse.json(
      {
        error:
          "Package request not found"
      },
      {
        status: 404
      }
    );

  }

  if (request.status !== "pending") {

    return NextResponse.json(
      {
        error:
          "Request already processed"
      },
      {
        status: 400
      }
    );

  }

  const pkg = (db.packages || []).find(
    (p: any) =>
      p.id === request.packageId
  );

  const customer = (db.users || []).find(
    (u: any) =>
      u.id === request.userId
  );

  if (!customer) {

    return NextResponse.json(
      {
        error: "Customer not found"
      },
      {
        status: 404
      }
    );

  }


  /*
    APPROVE PACKAGE
  */

  if (body.status === "approved") {

    if (!pkg) {

      return NextResponse.json(
        {
          error: "Package not found"
        },
        {
          status: 404
        }
      );

    }


    const newProductLimit =
      Number(pkg.productLimit || 0);


    if (newProductLimit <= 0) {

      return NextResponse.json(
        {
          error:
            "This package has no valid product limit."
        },
        {
          status: 400
        }
      );

    }


    /*
      Make sure sellerProducts exists
    */

    if (!db.sellerProducts) {

      db.sellerProducts = [];

    }


    /*
      Count products already assigned
      to this seller.
    */

    const existingSellerProducts =
      db.sellerProducts.filter(
        (p: any) =>
          p.sellerId === customer.id
      );


    const existingCount =
      existingSellerProducts.length;


    /*
      Only add the missing number.

      Example:

      0 / 100  -> add 100
      50 / 100 -> add 50
      100 / 100 -> add 0

      Same package approval will
      therefore NOT duplicate products.
    */

    const productsNeeded =
      Math.max(
        newProductLimit -
        existingCount,
        0
      );


    /*
      Select products that this seller
      does NOT already have.
    */

    const availableProducts =
      (db.products || []).filter(
        (product: any) =>
          !existingSellerProducts.some(
            (sellerProduct: any) =>
              sellerProduct.productId ===
              product.id
          )
      );


    /*
      Randomize available products.
    */

    const shuffledProducts =
      [...availableProducts].sort(
        () => Math.random() - 0.5
      );


    const selectedProducts =
      shuffledProducts.slice(
        0,
        productsNeeded
      );


    /*
      Add only the required products.
    */

    selectedProducts.forEach(
      (product: any) => {

        db.sellerProducts.push({

          id: crypto.randomUUID(),

          sellerId: customer.id,

          productId: product.id,

          addedDate:
            new Date().toISOString(),

          status: "active"

        });

      }
    );


    /*
      Activate package
    */

    customer.currentPackage =
      pkg.id;

    customer.currentPackageName =
      pkg.name;

    customer.packageStatus =
      "active";

    customer.productLimit =
      newProductLimit;

    customer.commissionRate =
      Number(pkg.commission || 0);

    customer.packageExpiry =
      null;


    /*
      If there are not enough products
      in the catalog, don't silently
      exceed the package limit.
    */

    const finalCount =
      db.sellerProducts.filter(
        (p: any) =>
          p.sellerId === customer.id
      ).length;


    if (finalCount > newProductLimit) {

      const sellerItems =
        db.sellerProducts.filter(
          (p: any) =>
            p.sellerId === customer.id
        );


      const keep =
        sellerItems.slice(
          0,
          newProductLimit
        );


      const keepIds =
        new Set(
          keep.map(
            (p: any) => p.id
          )
        );


      db.sellerProducts =
        db.sellerProducts.filter(
          (p: any) =>
            p.sellerId !== customer.id ||
            keepIds.has(p.id)
        );

    }


    request.status =
      "approved";

    request.reviewedAt =
      new Date().toISOString();

    request.reviewedBy =
      admin.id || "admin";

  }


  /*
    REJECT PACKAGE
  */

  if (body.status === "rejected") {

    request.status =
      "rejected";

    request.reviewedAt =
      new Date().toISOString();

    request.reviewedBy =
      admin.id || "admin";


    if (
      !customer.currentPackage ||
      customer.packageStatus !== "active"
    ) {

      customer.packageStatus =
        "none";

      customer.productLimit =
        0;

    }

  }


  writeDB(db);


  return NextResponse.json({

    success: true,

    request

  });

}