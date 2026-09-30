import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { signToken } from '@/lib/auth';
import { verifyFirebaseFacebookToken } from '@/lib/firebase';
import User from '@/models/User';

export function OPTIONS() {
  return preflight();
}

// Dùng chung cho đăng ký và đăng nhập bằng Facebook
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.idToken) {
    return json({ message: 'Thiếu Firebase ID token' }, 400);
  }

  let profile;
  try {
    profile = await verifyFirebaseFacebookToken(body.idToken);
  } catch (err) {
    console.error(err);
    // Thiếu cấu hình là lỗi server; còn lại là token sai/hết hạn
    if (err.message.includes('FIREBASE_PROJECT_ID')) {
      return json({ message: 'Server chưa cấu hình Firebase' }, 500);
    }
    profile = null;
  }
  if (!profile) {
    return json({ message: 'Phiên đăng nhập Facebook không hợp lệ' }, 401);
  }

  await connectDB();

  const email = profile.email?.toLowerCase();
  const avatar = profile.picture || undefined;
  let user = await User.findOne({ facebookId: profile.id });
  let isNew = false;

  if (!user && email) {
    // Đã có tài khoản cùng email (Google hoặc đăng ký trước đó) -> gắn Facebook vào
    user = await User.findOne({ email });
    if (user) {
      user.facebookId = profile.id;
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
    }
  }

  if (!user) {
    isNew = true;
    user = await User.create({
      facebookId: profile.id,
      email,
      name: profile.name,
      avatar,
      provider: 'facebook',
    });
  }

  const token = signToken(user, body.remember !== false);
  return json({ token, user: user.toPublic(), isNew }, isNew ? 201 : 200);
}
