/**
 * One-time migration: import existing bcrypt password hashes from usdusers
 * into Firebase Authentication, so existing users keep their passwords.
 *
 * Prerequisites:
 *   1. Real Firebase service-account credentials in env (see src/config/firebase.ts).
 *   2. The firebase_auth.sql migration applied (adds firebase_uid column).
 *
 * Run:
 *   npx ts-node scripts/migrate-bcrypt-to-firebase.ts
 *
 * For each migrated user we generate a Firebase UID, import the bcrypt hash,
 * and write that UID back to usdusers.firebase_uid so logins match immediately.
 *
 * AFTER verifying a known user can log in via Firebase, drop the password
 * column (see src/db/migrations/firebase_auth.sql).
 */
import "dotenv/config";
import crypto from "crypto";
import { firebaseAuth } from "../src/config/firebase";
import pool from "../src/db/client";

interface Row {
  id: number;
  email: string;
  password_hash: string;
}

async function main() {
  const { rows } = await pool.query<Row>(
    `SELECT id, email, password_hash
       FROM usdusers
      WHERE password_hash IS NOT NULL
        AND email IS NOT NULL
        AND firebase_uid IS NULL`,
  );

  if (rows.length === 0) {
    console.log("No bcrypt users to migrate.");
    await pool.end();
    return;
  }

  console.log(`Importing ${rows.length} users into Firebase…`);

  const users = rows.map((r) => ({
    uid: crypto.randomUUID(),
    email: r.email,
    passwordHash: Buffer.from(r.password_hash), // bcrypt hash string -> bytes
  }));

  const result = await firebaseAuth.importUsers(users, {
    hash: { algorithm: "BCRYPT" },
  });

  console.log(
    `Success: ${result.successCount}, Failures: ${result.failureCount}`,
  );

  const failedIndexes = new Set(result.errors.map((e) => e.index));
  for (const e of result.errors) {
    console.error(`  - row ${rows[e.index].email}: ${e.error.message}`);
  }

  // Write generated UIDs back for the successfully imported users.
  let linked = 0;
  for (let i = 0; i < users.length; i++) {
    if (failedIndexes.has(i)) continue;
    await pool.query(
      `UPDATE usdusers SET firebase_uid = $1, auth_provider = 'firebase' WHERE id = $2`,
      [users[i].uid, rows[i].id],
    );
    linked++;
  }

  console.log(`Linked ${linked} usdusers rows to their Firebase UID.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
