// Firebase configuration
// Replace these values with your actual Firebase project config
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// Note: @react-native-firebase/app auto-initializes from
// google-services.json (Android) and GoogleService-Info.plist (iOS).
// For development, we provide mock helpers below.

// Collection references as constants
export const COLLECTIONS = {
  USERS: 'users',
  ACTIVITIES: 'activities',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
} as const;
