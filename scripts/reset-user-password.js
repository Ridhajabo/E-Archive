const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const [, , username, password] = process.argv;

if (!username || !password || password.length < 8) {
  console.error("Usage: node scripts/reset-user-password.js <username> <new-password-8-chars-min>");
  process.exit(1);
}

const dataDir = path.resolve(process.env.EARCHIVE_DATA_DIR || path.join(__dirname, "..", "data"));
const dataFile = path.join(dataDir, "db.json");
const db = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const user = (db.users || []).find(item => item.username === username);

if (!user) {
  console.error(`User not found: ${username}`);
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const passwordHash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");

user.salt = salt;
user.passwordHash = passwordHash;
user.active = true;
user.updatedAt = new Date().toISOString();
db.sessions = (db.sessions || []).filter(item => item.userId !== user.id);
db.meta = db.meta || {};
db.meta.updatedAt = new Date().toISOString();

fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), "utf8");
console.log(`Password reset for ${username}.`);
