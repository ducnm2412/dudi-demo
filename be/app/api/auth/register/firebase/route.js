import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { signToken } from '@/lib/auth';
import { verifyFirebasePhoneToken } from '@/lib/firebase';
import { normalizePhone } from '@/lib/otp';
import { validateSignup } from '@/lib/registration';
import User from '@/models/User';

export function OPTIONS() {
  return preflight();
}

// Tạo tài khoản sau khi Firebase đã xác minh SĐT.
// SĐT lấy từ token do Google ký, không tin số trình duyệt gửi lên.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.idToken) return json({ message: 'Thiếu mã xác minh Firebase' }, 400);

  let verifiedPhone;
  try {
    verifiedPhone = await verifyFirebasePhoneToken(body.idToken);
  } catch (err) {
    console.error('Firebase token lỗi:', err.code || err.message);
    return json({ message: 'Xác minh số điện thoại không hợp lệ, vui lòng thử lại' }, 401);
  }
  if (!verifiedPhone) {
    return json({ message: 'Phiên xác minh đã hết hạn, vui lòng gửi lại mã' }, 401);
  }

  const phone = normalizePhone(verifiedPhone);
  await connectDB();
  const result = await validateSignup({ ...body, phone });
  if (result.error) return json({ message: result.error }, result.status);

  let user;
  try {
    user = await User.create({
      username: result.username,
      phone,
      phoneVerified: true,
      passwordHash: await bcrypt.hash(result.password, 10),
      name: result.username,
      provider: 'local',
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern?.username ? 'Tên đăng nhập' : 'Số điện thoại';
      return json({ message: `${field} đã được sử dụng` }, 409);
    }
    throw err;
  }

  return json({ token: signToken(user), user: user.toPublic() }, 201);
}
