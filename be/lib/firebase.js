import { createRemoteJWKSet, jwtVerify } from 'jose';

// Khoá công khai Google dùng để ký ID token của Firebase Auth
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

const MAX_AGE_S = 10 * 60; // chỉ nhận token vừa xác minh trong 10 phút

// Kiểm tra chữ ký, issuer, audience và độ mới của ID token Firebase.
// Chỉ cần projectId, không cần service account.
async function verifyFirebaseToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Thiếu FIREBASE_PROJECT_ID trên server');

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
  });

  if (!payload.sub) return null;
  if (Date.now() / 1000 - payload.auth_time > MAX_AGE_S) return null;
  return payload;
}

// Trả về số điện thoại đã xác minh ("+849...")
export async function verifyFirebasePhoneToken(idToken) {
  const payload = await verifyFirebaseToken(idToken);
  return payload?.phone_number || null;
}

// Trả về hồ sơ Facebook từ token của lần đăng nhập Facebook qua Firebase.
// id là Facebook user ID (app-scoped), giống id mà Graph API /me trả về.
export async function verifyFirebaseFacebookToken(idToken) {
  const payload = await verifyFirebaseToken(idToken);
  if (payload?.firebase?.sign_in_provider !== 'facebook.com') return null;

  const id = payload.firebase.identities?.['facebook.com']?.[0];
  if (!id) return null;
  return { id: String(id), email: payload.email, name: payload.name, picture: payload.picture };
}
