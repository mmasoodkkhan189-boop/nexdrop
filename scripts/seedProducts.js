/**
 * Ye script purane sare products (data/db.json me) delete kar ke
 * naye 300 products add kar deta hai (products_seed.json se).
 *
 * Chalane ka tareeqa (project ke root folder me, jaha "app" folder hai wahan se):
 *   node scripts/seedProducts.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dbPath = path.join(process.cwd(), "data", "db.json");
const seedPath = path.join(__dirname, "products_seed.json");

if (!fs.existsSync(dbPath)) {
  console.error("ERROR: data/db.json nahi mili. Ye script project ke root folder se chalayein.");
  process.exit(1);
}

if (!fs.existsSync(seedPath)) {
  console.error("ERROR: scripts/products_seed.json nahi mili.");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const seedProducts = JSON.parse(fs.readFileSync(seedPath, "utf8"));

const oldCount = (db.products || []).length;

// Har naye product ko unique id + createdAt dena
const now = new Date().toISOString();
const newProducts = seedProducts.map((p) => ({
  id: crypto.randomUUID(),
  ...p,
  createdAt: now,
}));

db.products = newProducts;

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`Purane products delete ho gaye: ${oldCount}`);
console.log(`Naye products add ho gaye: ${newProducts.length}`);
console.log("Done! Ab admin panel me products dekhein.");
