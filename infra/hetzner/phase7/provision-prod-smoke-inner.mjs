import pg from "pg";
import bcrypt from "bcryptjs";

const email = process.env.SMOKE_EMAIL;
const pass = process.env.SMOKE_PASS;
if (!email || !pass || !process.env.DATABASE_URL) process.exit(2);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const hash = await bcrypt.hash(pass, 10);
const ex = await pool.query("select id from users where email=$1 limit 1", [email]);
if (ex.rowCount) {
  await pool.query(
    "update users set password_hash=$1, email_verified=true, is_banned=false where email=$2",
    [hash, email],
  );
} else {
  await pool.query(
    `insert into users (email, password_hash, name, phone, city, email_verified, is_banned)
     values ($1,$2,$3,$4,$5,true,false)`,
    [email, hash, "PROD Smoke VPS", "+4900000000999", "Berlin"],
  );
}
await pool.end();
console.log("OK_USER");
