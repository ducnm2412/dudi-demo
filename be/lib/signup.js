import { generateCode, hashCode, maskPhone, OTP_RESEND_MS, OTP_TTL_MS } from './otp';
import { sendSms, smsProvider } from './sms';

// Tạo mã mới cho lượt đăng ký, gửi SMS và trả về dữ liệu cho FE
export async function issueCode(pending) {
  const code = generateCode();
  const now = Date.now();
  pending.codeHash = hashCode(pending.phone, code);
  pending.expiresAt = new Date(now + OTP_TTL_MS);
  pending.lastSentAt = new Date(now);
  pending.attempts = 0;
  await pending.save();

  await sendSms(pending.phone, `Ma xac minh DUDI cua ban la ${code}. Ma co hieu luc trong 5 phut.`);

  return {
    phone: pending.phone,
    maskedPhone: maskPhone(pending.phone),
    expiresIn: OTP_TTL_MS / 1000,
    resendIn: OTP_RESEND_MS / 1000,
    // Chỉ khi chạy thử ở máy (không gửi SMS thật) mới trả mã về để tiện test
    ...(smsProvider() === 'console' && process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
  };
}
