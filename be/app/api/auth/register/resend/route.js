import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { normalizePhone, OTP_MAX_SENDS, OTP_RESEND_MS } from '@/lib/otp';
import { issueCode } from '@/lib/signup';
import PendingSignup from '@/models/PendingSignup';

export function OPTIONS() {
  return preflight();
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);

  await connectDB();
  const pending = await PendingSignup.findOne({ phone });
  if (!pending) {
    return json({ message: 'Phiên đăng ký đã hết hạn, vui lòng điền lại thông tin' }, 404);
  }

  const since = Date.now() - pending.lastSentAt.getTime();
  if (since < OTP_RESEND_MS) {
    const wait = Math.ceil((OTP_RESEND_MS - since) / 1000);
    return json({ message: `Vui lòng chờ ${wait} giây trước khi gửi lại mã`, retryAfter: wait }, 429);
  }
  if (pending.sends >= OTP_MAX_SENDS) {
    return json({ message: 'Bạn đã yêu cầu gửi mã quá nhiều lần, vui lòng thử lại sau 30 phút' }, 429);
  }

  pending.sends += 1;
  try {
    return json(await issueCode(pending));
  } catch (err) {
    console.error(err);
    return json({ message: 'Không gửi được mã xác minh, vui lòng thử lại sau' }, 502);
  }
}
