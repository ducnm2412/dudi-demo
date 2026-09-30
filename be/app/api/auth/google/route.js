import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { signToken, verifyGoogleCredential } from '@/lib/auth';
import User from '@/models/User';

export function OPTIONS() {
  return preflight();
}

// Dùng chung cho cả đăng ký và đăng nhập bằng Google:
// chưa có tài khoản thì tạo mới, có rồi thì đăng nhập.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.credential) {
    return json({ message: 'Thiếu Google credential' }, 400);
  }

  let payload;
  try {
    payload = await verifyGoogleCredential(body.credential);
  } catch {
    return json({ message: 'Google credential không hợp lệ' }, 401);
  }
  if (!payload.email || !payload.email_verified) {
    return json({ message: 'Email Google chưa được xác minh' }, 401);
  }

  await connectDB();

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ googleId: payload.sub });
  let isNew = false;

  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      // Đã đăng ký bằng email này trước đó -> gắn Google vào tài khoản sẵn có
      user.googleId = payload.sub;
      if (!user.avatar) user.avatar = payload.picture;
      await user.save();
    } else {
      isNew = true;
      user = await User.create({
        googleId: payload.sub,
        email,
        name: payload.name,
        avatar: payload.picture,
        provider: 'google',
      });
    }
  }

  const token = signToken(user, body.remember !== false);
  return json({ token, user: user.toPublic(), isNew }, isNew ? 201 : 200);
}
