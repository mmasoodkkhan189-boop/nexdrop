import {NextResponse} from "next/server";
import {
  readDB,
  verifyPassword,
  safeUser,
} from "../../../lib/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const {email, password} = await req.json();

    const db = readDB();

    const user = db.users.find(
      u => u.email === String(email || "").trim().toLowerCase()
    );

    if (!user || !verifyPassword(String(password || ""), user)) {
      return NextResponse.json(
        {error: "Invalid email or password."},
        {status: 401}
      );
    }

    if (user.status === "Suspended") {
      return NextResponse.json(
        {error: "This account is suspended. Please contact support."},
        {status: 403}
      );
    }

    return NextResponse.json({
      user: safeUser(user),
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {error: "Unable to sign in."},
      {status: 500}
    );
  }
}