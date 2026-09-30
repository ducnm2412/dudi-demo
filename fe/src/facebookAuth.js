// Đăng nhập Facebook qua Firebase Auth. Module được import động nên Firebase SDK
// chỉ tải khi trang có nút Facebook.
import { FacebookAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './firebase';

const provider = new FacebookAuthProvider();
provider.addScope('email');

const MESSAGES = {
  'auth/popup-closed-by-user': 'Bạn đã huỷ đăng nhập Facebook',
  'auth/cancelled-popup-request': 'Bạn đã huỷ đăng nhập Facebook',
  'auth/user-cancelled': 'Bạn đã huỷ đăng nhập Facebook',
  'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập, hãy cho phép popup rồi thử lại',
  'auth/unauthorized-domain': 'Tên miền này chưa được thêm vào Authorized domains của Firebase',
  'auth/operation-not-allowed': 'Firebase chưa bật đăng nhập Facebook (Authentication > Sign-in method > Facebook)',
  'auth/account-exists-with-different-credential': 'Email của tài khoản Facebook này đã gắn với một cách đăng nhập khác trên Firebase',
  'auth/network-request-failed': 'Lỗi mạng, vui lòng kiểm tra kết nối',
  'auth/invalid-api-key': 'API key Firebase không đúng, kiểm tra VITE_FIREBASE_API_KEY',
};

// Trả về ID token Firebase để BE kiểm tra; không giữ phiên Firebase vì app dùng JWT riêng
export async function signInWithFacebook() {
  try {
    const cred = await signInWithPopup(auth, provider);
    const idToken = await cred.user.getIdToken();
    await signOut(auth);
    return idToken;
  } catch (err) {
    console.error('Firebase:', err?.code, err?.message, err);
    const message = MESSAGES[err?.code] || 'Không đăng nhập được bằng Facebook, vui lòng thử lại';
    throw new Error(err?.code && !MESSAGES[err.code] ? `${message} (${err.code})` : message);
  }
}
