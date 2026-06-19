import { initializeApp, getApps, cert, Credential } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

/**
 * Firebase Admin initialization.
 *
 * Credentials are read from the environment — never committed. Two sources,
 * tried in order:
 *
 *   1. A service-account JSON file, via FIREBASE_SERVICE_ACCOUNT_PATH or the
 *      standard GOOGLE_APPLICATION_CREDENTIALS. Preferred — avoids any
 *      newline-escaping issues with the private key.
 *   2. Assembled from FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL +
 *      FIREBASE_PRIVATE_KEY. The private key in .env usually contains literal
 *      "\n" sequences, which we normalize back into real newlines.
 */

/** True if the value is empty or an obvious placeholder (e.g. contains `<...>`). */
function isPlaceholder(value: string | undefined): boolean {
  return (
    !value || value.trim() === "" || /[<>]/.test(value) || value.includes("xxx")
  );
}

/** Normalize escaped newlines, but only if the key hasn't got real ones already. */
function normalizePrivateKey(key: string): string {
  return key.includes("\\n") && !key.includes("\n")
    ? key.replace(/\\n/g, "\n")
    : key;
}

function buildCredential(): Credential {
  // 1. Service-account JSON file (path-based) — no newline escaping to worry about.
  const jsonPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (jsonPath) {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(
        `Firebase service-account file not found at "${jsonPath}". ` +
          "Check FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS.",
      );
    }
    const serviceAccount = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    return cert(serviceAccount);
  }

  // 2. Assemble from individual env vars.
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  const missing: string[] = [];
  if (isPlaceholder(projectId)) missing.push("FIREBASE_PROJECT_ID");
  if (isPlaceholder(clientEmail)) missing.push("FIREBASE_CLIENT_EMAIL");
  if (isPlaceholder(rawPrivateKey)) missing.push("FIREBASE_PRIVATE_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Firebase admin credentials missing or still placeholders: ${missing.join(", ")}. ` +
        "Provide a real service account — either set FIREBASE_SERVICE_ACCOUNT_PATH / " +
        "GOOGLE_APPLICATION_CREDENTIALS to the JSON file, or fill in the three " +
        "FIREBASE_* values with real values (not the example placeholders).",
    );
  }

  const privateKey = normalizePrivateKey(rawPrivateKey as string);

  // A valid service-account key is a PEM block. Catch the common mistake of
  // pasting an API key / wrong value here, before OpenSSL throws an opaque error.
  if (!privateKey.includes("BEGIN") || !privateKey.includes("PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY does not look like a PEM private key (expected a " +
        '"-----BEGIN PRIVATE KEY-----" block). This is usually the service-account ' +
        "private key, not a web/API key. Prefer FIREBASE_SERVICE_ACCOUNT_PATH to a JSON file.",
    );
  }

  return cert({ projectId, clientEmail, privateKey });
}

if (!getApps().length) {
  try {
    initializeApp({ credential: buildCredential() });
    console.log(
      `✅ firebase-admin initialized (project: ${
        process.env.FIREBASE_PROJECT_ID || "from service-account file"
      })`,
    );
  } catch (err) {
    console.error(
      "❌ firebase-admin initialization FAILED — /auth/login will not work:\n   " +
        (err instanceof Error ? err.message : String(err)),
    );
    throw err;
  }
}

export const firebaseAuth = getAuth();
