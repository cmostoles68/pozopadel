const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  });

  try {
    await client.connect();
    const sql = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
    await client.query(sql);
    console.log("Seed aplicado correctamente.");
  } catch (err) {
    console.error("Error aplicando el seed:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
