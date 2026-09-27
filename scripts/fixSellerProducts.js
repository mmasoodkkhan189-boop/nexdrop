/**
 * Ye script un purani "sellerProducts" entries ko clear karta hai
 * jo ab exist na hone wale products se link thi (products delete/replace
 * hone ki wajah se).
 *
 * Chalane ka tareeqa (project ke root folder se):
 *   node scripts/fixSellerProducts.js
 */

const fs = require("fs");
const path = require("path");

const dbPath = path.join(process.cwd(), "data", "db.json");

if (!fs.existsSync(dbPath)) {
  console.error("ERROR: data/db.json nahi mili. Project root se chalayein.");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

const validProductIds = new Set(
  (db.products || []).map((p) => String(p.id))
);

const before = (db.sellerProducts || []).length;

db.sellerProducts = (db.sellerProducts || []).filter((sp) =>
  validProductIds.has(String(sp.productId))
);

const after = db.sellerProducts.length;

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`Purani (orphaned) entries hati: ${before - after}`);
console.log(`Sahi (valid) entries bachi: ${after}`);
console.log("Done! Ab My Store page refresh kar ke check karein - khud fill ho jayega.");
