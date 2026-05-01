const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const PASSWORD = "StrongPass1!";
const USERS = [
  {
    email: "e2e_user_a@example.com",
    name: "E2E User A",
    phone: "+201111111111",
    city: "Cairo",
  },
  {
    email: "e2e_user_b@example.com",
    name: "E2E User B",
    phone: "+202222222222",
    city: "Alexandria",
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const hash = await bcrypt.hash(PASSWORD, 10);
    for (const u of USERS) {
      const found = await client.query("select id from users where email = $1", [u.email]);
      if (found.rows.length === 0) {
        await client.query(
          "insert into users (email, password_hash, name, phone, city, email_verified) values ($1,$2,$3,$4,$5,true)",
          [u.email, hash, u.name, u.phone, u.city],
        );
        console.log("created", u.email);
      } else {
        await client.query(
          "update users set password_hash = $2, email_verified = true, name = $3, phone = $4, city = $5 where email = $1",
          [u.email, hash, u.name, u.phone, u.city],
        );
        console.log("updated", u.email);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
