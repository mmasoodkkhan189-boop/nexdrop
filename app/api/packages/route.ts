import { NextResponse } from "next/server";
import { readDB } from "../../lib/server";

export const runtime = "nodejs";


export async function GET(){

  const db = readDB();


  return NextResponse.json({

    packages: db.packages || []

  });


}