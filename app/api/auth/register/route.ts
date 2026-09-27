import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { readDB, writeDB, hashPassword, logActivity, newSession, safeUser } from "../../../lib/server";
import { getCountry, getCountryByCode } from "../../../countries";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const {
  name,
  shopName,
  email,
  phone,
  countryCode,
  country,
  password,
  transactionPassword,
  remember,
  inviteToken,

  certificateType,
  certificateFront,
  certificateBack,
  selfie

} = await req.json();

    if (!name?.trim() || !email?.trim() || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Name, email and a password of at least 6 characters are required." },
        { status: 400 }
      );
    }

    if (!transactionPassword || String(transactionPassword).length !== 6) {
      return NextResponse.json(
        { error: "Transaction password must be exactly 6 digits." },
        { status: 400 }
      );
    }

    const selected = getCountry(String(country || ""));
    const selectedCode = getCountryByCode(String(country || ""), String(countryCode || ""));

    if (!selected || !selectedCode) {
      return NextResponse.json(
        { error: "Please select a valid country and country code." },
        { status: 400 }
      );
    }

    const normalizedPhone = String(phone || "").replace(/\D/g, "");

    if (normalizedPhone.length !== selected.digits) {
      return NextResponse.json(
        { error: `Phone number must contain exactly ${selected.digits} digits for ${selected.country}.` },
        { status: 400 }
      );
    }

    const db = readDB();

    const normalized = email.trim().toLowerCase();

    const invite = db.invites.find(
      (i: any) => i.token === String(inviteToken || "")
    );

    if (!invite) {
      return NextResponse.json(
        { error: "A valid invitation link is required." },
        { status: 403 }
      );
    }

    if (invite.usedAt || invite.revokedAt || invite.expiresAt < Date.now()) {
      return NextResponse.json(
        { error: "This invitation is not available." },
        { status: 410 }
      );
    }

    if (db.users.some(u => u.email === normalized)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const { salt, hash } = hashPassword(password);

    const user = {
      id: crypto.randomUUID(),
      name: name.trim(),
      shopName: String(shopName || "").trim(),
      email: normalized,
      phone: normalizedPhone,
      countryCode: selected.code,
      country: selected.country,
      profileImage: "",

      passwordHash: hash,
      salt,

      transactionPassword: String(transactionPassword),

      emailVerified: false,

kycStatus: "Pending",

kycDocuments: [
  {
    certificateType,
    certificateFront,
    certificateBack,
    selfie
  }
],

      currentPackage: "",
currentPackageName: "",
packageStatus: "none",
packageExpiry: "",
commissionRate: 0,
productLimit: 0,

      walletBalance: 0,
      pendingBalance: 0,
      guaranteeMoney: 0,
      sellerRating: 0,

      role: "customer" as const,
      status: "Active" as const,

      createdAt: new Date().toISOString(),

      balance: 0,
      profit: 0
    };

    db.users.push(user);


    invite.usedAt = new Date().toISOString();
    invite.usedBy = user.id;

    logActivity(
      db,
      user.id,
      "ACCOUNT_CREATED",
      "Account created using invitation"
    );

    const days = remember === true ? 30 : 1;

    const token = newSession(db, user.id, days);

    writeDB(db);

    return NextResponse.json({
      user: safeUser(user),
      token
    });

  } catch (err) {

  console.log("REGISTER ERROR:", err);

  return NextResponse.json(
    { 
      error: String(err)
    },
    { status: 500 }
  );

}
}