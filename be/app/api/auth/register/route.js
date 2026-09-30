import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { OTP_MAX_SENDS, OTP_RESEND_MS, PENDING_TTL_MS } from '@/lib/otp';
import { validateSignup } from '@/lib/registration';
import { issueCode } from '@/lib/signup';
import PendingSignup from '@/models/PendingSignup';

export function OPTIONS() {
  return preflight();
}

// OTP tự gửi (console/Twilio), dùng khi FE không cấu hình Firebase.
// Bước 1: kiểm tra thông tin, lưu tạm và gửi OTP tới SĐT. Chưa tạo tài khoản.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  await connectDB();
  const result = await validateSignup(body);
  if (result.error) return json({ message: result.error }, result.status);
  const { username, phone, password } = result;

  const now = Date.now();
  let pending = await PendingSignup.findOne({ phone });
  if (pending && now - pending.lastSentAt.getTime() < OTP_RESEND_MS) {
    const wait = Math.ceil((OTP_RESEND_MS - (now - pending.lastSentAt.getTime())) / 1000);
    return json({ message: `Vui lòng chờ ${wait} giây trước khi gửi lại mã`, retryAfter: wait }, 429);
  }

  if (pending && pending.sends >= OTP_MAX_SENDS) {
    return json({ message: 'Bạn đã yêu cầu gửi mã quá nhiều lần, vui lòng thử lại sau 30 phút' }, 429);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  if (pending) {
    // Đăng ký lại cùng SĐT: cập nhật thông tin mới, đếm như một lần gửi lại
    pending.username = username;
    pending.passwordHash = passwordHash;
    pending.sends += 1;
  } else {
    pending = new PendingSignup({
      phone,
      username,
      passwordHash,
      codeHash: '-',
      expiresAt: new Date(now),
      lastSentAt: new Date(now),
      purgeAt: new Date(now + PENDING_TTL_MS),
    });
  }

  try {
    return json(await issueCode(pending), 202);
  } catch (err) {
    console.error(err);
    return json({ message: 'Không gửi được mã xác minh, vui lòng thử lại sau' }, 502);
  }
}
