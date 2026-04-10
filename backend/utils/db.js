const fs = require("fs");
const path = require("path");

// Resolve the absolute path to db.json safely from anywhere
const dbPath = path.join(__dirname, "..", "db.json");

const readDB = () => JSON.parse(fs.readFileSync(dbPath, "utf-8"));

const writeDB = (db) => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

const formatNum = (num) => num.toLocaleString("en-US");

module.exports = {
  readDB,
  writeDB,
  formatNum,
};
