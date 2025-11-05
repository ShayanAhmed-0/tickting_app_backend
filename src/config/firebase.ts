import * as admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = () => {
  try {
    if (!firebaseApp) {
      const serviceAccountPath = path.join(__dirname, 'los-mismos-staging-8432b3d3637a.json');
      
      const serviceAccount = require(serviceAccountPath);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: 'los-mismos-staging'
      });
      
      console.log('✅ Firebase Admin SDK initialized successfully');
    }
    return firebaseApp;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
};

export const getFirebaseApp = (): admin.app.App => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};

export const getFirebaseMessaging = (): admin.messaging.Messaging => {
  const app = getFirebaseApp();
  return admin.messaging(app);
};

export default { initializeFirebase, getFirebaseApp, getFirebaseMessaging };

