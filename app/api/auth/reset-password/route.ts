import { NextResponse } from "next/server";
import { readDB, writeDB, hashPassword } from "../../../lib/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        {
          error: "Email and password of at least 6 characters are required."
        },
        {
          status: 400
        }
      );
    }

    const db = readDB();

    const user = db.users.find(
      (u: any) =>
        u.email === String(email).toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found."
        },
        {
          status: 404
        }
      );
    }

    const { salt, hash } = hashPassword(newPassword);

    user.passwordHash = hash;
    user.salt = salt;

    writeDB(db);

    return NextResponse.json({
      message: "Password updated successfully."
    });

  } catch {

    return NextResponse.json(
      {
        error: "Unable to reset password."
      },
      {
        status: 500
      }
    );

  }
}