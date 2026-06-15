import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'programs'");
  console.log("Programs columns:", res.rows.map(r => r.column_name));

  const res3 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'school_descriptions'");
  console.log("School Descriptions columns:", res3.rows.map(r => r.column_name));

  await client.end();
}
run();
