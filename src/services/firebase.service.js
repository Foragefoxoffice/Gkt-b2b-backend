import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// You must set the FIREBASE_SERVICE_ACCOUNT environment variable with the base64 encoded JSON
// Or load it from a file (e.g. firebase-service-account.json)
export const initFirebaseAdmin = async () => {
  try {
    if (admin.apps.length > 0) return; // Already initialized

    let credential;

    // Check if the environment variable is set
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(
          Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
        );
        credential = admin.credential.cert(serviceAccount);
      } catch (e) {
        console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT env var is invalid base64 json. Trying raw JSON...');
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          credential = admin.credential.cert(serviceAccount);
        } catch (e2) {
          console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable.', e2);
        }
      }
    } else {
      // Fallback: try to load from a local file in the backend directory
      try {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.resolve(process.cwd(), 'firebase-service-account.json');
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const serviceAccount = JSON.parse(fileContent);
          credential = admin.credential.cert(serviceAccount);
          console.log('✅ Loaded Firebase credentials from firebase-service-account.json');
        }
      } catch (e) {
        console.warn('⚠️ Could not load firebase-service-account.json fallback.');
      }
    }

    if (credential) {
      admin.initializeApp({
        credential,
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      console.warn('⚠️ Firebase Admin SDK not initialized. Please provide FIREBASE_SERVICE_ACCOUNT in .env');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
  }
};

/**
 * Send a push notification using Firebase Cloud Messaging
 * @param {string} token - The FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
export const sendPushNotification = async (token, title, body, data = {}) => {
  if (!token) {
    console.warn('⚠️ No FCM token provided for push notification');
    return false;
  }

  if (admin.apps.length === 0) {
    console.warn('⚠️ Firebase Admin SDK not initialized, cannot send push notification');
    return false;
  }

  const message = {
    // Including 'notification' and 'android.priority: high' forces Google Play Services
    // to display the notification directly, bypassing Xiaomi/Vivo/Oppo battery killers!
    notification: {
      title: title || 'New Notification',
      body: body || 'You have a new message',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default_channel',
      },
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Successfully sent push notification:', response);
    return true;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return false;
  }
};
