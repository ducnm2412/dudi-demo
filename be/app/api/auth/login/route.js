import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { signToken } from '@/lib/auth';
import User from '@/models/User';

export function OPTIONS() {
  return preflight();
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return json({ message: 'Vui lòng nhập email và mật khẩu' }, 400);
  }

  await connectDB();

  const user = await User.findOne({ email }).select('+passwordHash');
  if (user && !user.passwordHash) {
    return json({ message: 'Tài khoản này được tạo bằng Google, hãy đăng nhập bằng Google' }, 401);
  }
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return json({ message: 'Email hoặc mật khẩu không đúng' }, 401);
  }

  return json({ token: signToken(user, body.remember !== false), user: user.toPublic() });
}
