import {NextResponse} from "next/server";
import {
  readDB,
  writeDB,
  verifyPassword,
  logActivity,
  newSession,
  safeUser
} from "../../../lib/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const {email, password, remember} = await req.json();

    const db = readDB();

    const user = db.users.find(
      u => u.email === String(email || "").trim().toLowerCase()
    );

    if (!user || !verifyPassword(String(password || ""), user)) {
      return NextResponse.json(
        {error:"Invalid email or password."},
        {status:401}
      );
    }

    if (user.status === "Suspended") {
      return NextResponse.json(
        {error:"This account is suspended. Please contact support."},
        {status:403}
      );
    }

    logActivity(
      db,
      user.id,
      "LOGIN",
      "Successful login"
    );

    const days = remember === true ? 30 : 1;

    const token = newSession(
      db,
      user.id,
      days
    );

    writeDB(db);

    return NextResponse.json({
      user:safeUser(user),
      token
    });

  } catch(error) {

    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {error:"Unable to sign in."},
      {status:500}
    );
  }
}