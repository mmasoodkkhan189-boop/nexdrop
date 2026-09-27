import {NextResponse} from "next/server"; import {readDB,safeUser,userFromRequest} from "../../../lib/server";
export const runtime="nodejs";
export async function GET(req:Request){const admin=userFromRequest(req);if(!admin||admin.role!=="admin")return NextResponse.json({error:"Forbidden"},{status:403});const db=readDB();return NextResponse.json({users:db.users.map(safeUser)});}
