// Xác minh SĐT bằng Firebase Phone Auth. Module này được import động khi đăng ký,
// nên Firebase SDK không làm nặng trang đăng nhập.
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { auth } from './firebase';

const MESSAGES = {
  'auth/invalid-phone-number': 'Số điện thoại không hợp lệ',
  'auth/missing-phone-number': 'Vui lòng nhập số điện thoại',
  'auth/too-many-requests': 'Bạn đã yêu cầu quá nhiều lần, vui lòng thử lại sau',
  'auth/quota-exceeded': 'Hệ thống tạm hết lượt gửi SMS, vui lòng thử lại sau',
  'auth/invalid-verification-code': 'Mã xác minh không đúng',
  'auth/code-expired': 'Mã đã hết hạn, hãy bấm gửi lại mã',
  'auth/captcha-check-failed': 'Không xác minh được reCAPTCHA. Kiểm tra tên miền đã được thêm vào Authorized domains của Firebase',
  'auth/unauthorized-domain': 'Tên miền này chưa được thêm vào Authorized domains của Firebase',
  'auth/operation-not-allowed': 'Firebase chưa bật đăng nhập bằng số điện thoại (Authentication > Sign-in method > Phone)',
  'auth/billing-not-enabled': 'Firebase chưa bật thanh toán nên không gửi được SMS thật. Hãy dùng số điện thoại thử đã khai báo trong Firebase',
  'auth/network-request-failed': 'Lỗi mạng, vui lòng kiểm tra kết nối',
  'auth/invalid-app-credential': 'Firebase từ chối reCAPTCHA của trang này. Kiểm tra Authorized domains và thử tải lại trang',
  'auth/missing-app-credential': 'Thiếu xác minh reCAPTCHA, vui lòng tải lại trang và thử lại',
  'auth/error-code:-39': 'Firebase chặn gửi SMS tới số này. Kiểm tra SMS region policy đã cho phép Vietnam, hoặc project chưa bật thanh toán',
  'auth/invalid-api-key': 'API key Firebase không đúng, kiểm tra VITE_FIREBASE_API_KEY',
  'auth/app-not-authorized': 'Ứng dụng chưa được phép dùng Firebase Auth với API key này',
  'auth/admin-restricted-operation': 'Thao tác bị Firebase hạn chế, kiểm tra cấu hình Authentication',
};

function friendly(err) {
  console.error('Firebase:', err?.code, err?.message, err);
  if (!err?.code) {
    // Lỗi không đến từ Firebase Auth (ví dụ reCAPTCHA không tải được): hiện nguyên văn để dễ tra cứu
    return new Error(`Không xác minh được số điện thoại: ${err?.message || err}`);
  }
  const message = MESSAGES[err.code] || 'Không xác minh được số điện thoại, vui lòng thử lại';
  // Kèm mã lỗi gốc để dễ tra cứu khi gặp lỗi chưa có trong danh sách
  return new Error(`${message} (${err.code})`);
}

// reCAPTCHA ẩn: mỗi lần gửi mã render vào một thẻ con MỚI.
// Render lại vào cùng thẻ cũ sẽ lỗi "reCAPTCHA has already been rendered in this element".
let verifier;
function freshVerifier(containerId) {
  try {
    verifier?.clear();
  } catch {
    // widget cũ đã bị gỡ khỏi DOM
  }
  const host = document.getElementById(containerId);
  host.replaceChildren();
  const el = document.createElement('div');
  host.appendChild(el);
  verifier = new RecaptchaVerifier(auth, el, { size: 'invisible' });
  return verifier;
}

// phone dạng "0912345678"
export async function sendCode(phone, containerId) {
  try {
    return await signInWithPhoneNumber(auth, `+84${phone.slice(1)}`, freshVerifier(containerId));
  } catch (err) {
    // Gửi lỗi thì bỏ widget để lần sau dựng lại từ đầu
    try {
      verifier?.clear();
    } catch {
      // bỏ qua
    }
    verifier = null;
    throw friendly(err);
  }
}

// Trả về ID token để BE kiểm tra; không giữ phiên Firebase vì app dùng JWT riêng
export async function confirmCode(confirmation, code) {
  try {
    const cred = await confirmation.confirm(code);
    const idToken = await cred.user.getIdToken();
    await signOut(auth);
    return idToken;
  } catch (err) {
    throw friendly(err);
  }
}
