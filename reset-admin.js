// reset-admin.js
// Usage: node reset-admin.js
// Ye script data/db.json mein admin@dropzone.com ka password reset kar degi.
// Naya password neeche NEW_PASSWORD line mein likh do.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const NEW_EMAIL = "admin@dropzone.com"; // ye email login pe use karo
const NEW_PASSWORD = "Admin@123456";     // <-- yahan apna marzi ka password likh do

const dbPath = path.join(process.cwd(), "data", "db.json");

if (!fs.existsSync(dbPath)) {
  console.error("data/db.json nahi mila. Ye script project ke root folder se chalao (jahan 'data' folder hai).");
  process.exit(1);
}

const raw = fs.readFileSync(dbPath, "utf8");
const db = JSON.parse(raw);

const admin = db.users.find(u => u.email === NEW_EMAIL || u.role === "admin");

if (!admin) {
  console.error("Koi admin user nahi mila db.json mein.");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(NEW_PASSWORD, Buffer.from(salt, "hex"), 64).toString("hex");

admin.email = NEW_EMAIL;
admin.passwordHash = hash;
admin.salt = salt;
admin.status = "Active";
admin.role = "admin";

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log("Admin password reset ho gaya!");
console.log("Login karo is se:");
console.log("Email:   " + NEW_EMAIL);
console.log("Password: " + NEW_PASSWORD);
