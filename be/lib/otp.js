import crypto from 'crypto';

export const OTP_TTL_MS = 5 * 60 * 1000; // mã có hiệu lực 5 phút
export const OTP_RESEND_MS = 60 * 1000; // chờ 60 giây giữa hai lần gửi
export const OTP_MAX_ATTEMPTS = 5; // sai quá 5 lần phải gửi mã mới
export const OTP_MAX_SENDS = 5; // tối đa 5 lần gửi cho một lượt đăng ký
export const PENDING_TTL_MS = 30 * 60 * 1000; // bỏ lượt đăng ký dở sau 30 phút

export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

// Chỉ lưu dấu băm của mã, không lưu mã gốc
export function hashCode(phone, code) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${phone}:${code}`).digest('hex');
}

export function codeMatches(phone, code, hash) {
  const a = Buffer.from(hashCode(phone, code));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// "0912 345 678" hoặc "+84912345678" -> "0912345678"
export function normalizePhone(raw) {
  const s = String(raw || '').replace(/[\s.-]/g, '');
  return s.startsWith('+84') ? `0${s.slice(3)}` : s;
}

export const PHONE_RE = /^0(3|5|7|8|9)\d{8}$/;

export function maskPhone(phone) {
  return `${phone.slice(0, 4)} *** ${phone.slice(-3)}`;
}
