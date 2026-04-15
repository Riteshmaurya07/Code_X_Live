const admin = require("firebase-admin");
const logger = require("../utils/logger");

let firebaseApp = null;

try {
  // Option 1: Use FIREBASE_SERVICE_ACCOUNT_JSON env var (full JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    logger.info("Firebase Admin initialized with service account JSON");
  }
  else if (process.env.FIREBASE_PROJECT_ID) {
    let formattedKey = process.env.FIREBASE_PRIVATE_KEY || "";
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.slice(1, -1);
    }
    formattedKey = formattedKey.replace(/\\n/g, "\n");

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    });
    logger.info("Firebase Admin initialized with env vars");
  }
  // Option 3: Default credentials (for GCP-hosted environments)
  else {
    firebaseApp = admin.initializeApp();
    logger.info("Firebase Admin initialized with default credentials");
  }
} catch (error) {
  logger.warn(`Firebase Admin initialization failed: ${error.message}. OAuth login will not work.`);
}

/**
 * Verify a Firebase ID token and return decoded user info
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<object>} - Decoded token with uid, email, name, picture
 */
const verifyFirebaseToken = async (idToken) => {
  if (!firebaseApp) {
    throw new Error("Firebase Admin is not initialized");
  }
  return admin.auth().verifyIdToken(idToken);
};

module.exports = { verifyFirebaseToken, firebaseApp };
