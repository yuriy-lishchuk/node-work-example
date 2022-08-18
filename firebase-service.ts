import * as admin from 'firebase-admin';
import { FIREBASE_CONFIG } from './firebase-service-account-key';

admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_CONFIG as any),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
});

export default admin;
