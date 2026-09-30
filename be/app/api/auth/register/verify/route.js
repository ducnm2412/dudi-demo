import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { signToken } from '@/lib/auth';
import { codeMatches, normalizePhone, OTP_MAX_ATTEMPTS } from '@/lib/otp';
import PendingSignup from '@/models/PendingSignup';
import User from '@/models/User';

export function OPTIONS() {
  return preflight();
}

// Bước 2: nhập đúng mã thì mới tạo tài khoản
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);
  const code = String(body.code || '').trim();

  if (!/^\d{6}$/.test(code)) {
    return json({ message: 'Mã xác minh gồm 6 chữ số' }, 400);
  }

  await connectDB();
  const pending = await PendingSignup.findOne({ phone });
  if (!pending) {
    return json({ message: 'Phiên đăng ký đã hết hạn, vui lòng điền lại thông tin' }, 404);
  }
  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    return json({ message: 'Bạn đã nhập sai quá nhiều lần, hãy bấm gửi lại mã' }, 429);
  }
  if (pending.expiresAt.getTime() < Date.now()) {
    return json({ message: 'Mã đã hết hạn, hãy bấm gửi lại mã' }, 400);
  }
  if (!codeMatches(phone, code, pending.codeHash)) {
    pending.attempts += 1;
    await pending.save();
    const left = OTP_MAX_ATTEMPTS - pending.attempts;
    return json({ message: left > 0 ? `Mã không đúng, còn ${left} lần thử` : 'Bạn đã nhập sai quá nhiều lần, hãy bấm gửi lại mã' }, 400);
  }

  let user;
  try {
    user = await User.create({
      username: pending.username,
      phone,
      phoneVerified: true,
      passwordHash: pending.passwordHash,
      name: pending.username,
      provider: 'local',
    });
  } catch (err) {
    // Có người vừa đăng ký cùng tên hoặc SĐT trong lúc chờ OTP
    if (err.code === 11000) {
      const field = err.keyPattern?.username ? 'Tên đăng nhập' : 'Số điện thoại';
      return json({ message: `${field} đã được sử dụng` }, 409);
    }
    throw err;
  }
  await pending.deleteOne();

  return json({ token: signToken(user), user: user.toPublic() }, 201);
}
