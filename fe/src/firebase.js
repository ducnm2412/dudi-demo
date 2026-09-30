// Khởi tạo Firebase một lần, dùng chung cho xác minh SĐT và đăng nhập Facebook
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const firebaseEnabled = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
auth.languageCode = 'vi'; // SMS, reCAPTCHA và popup bằng tiếng Việt
