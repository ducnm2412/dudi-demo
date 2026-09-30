import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client();

// remember = true: phiên dài (ghi nhớ đăng nhập), false: phiên ngắn 1 ngày
export function signToken(user, remember = true) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: remember ? process.env.JWT_EXPIRES_IN || '7d' : '1d',
  });
}

export function getUserIdFromRequest(req) {
  const header = req.headers.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).sub;
  } catch {
    return null;
  }
}

// Xác thực ID token do Google Identity Services trả về cho FE
export async function verifyGoogleCredential(credential) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}
