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
  const login = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!login || !password) {
    return json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, 400);
  }

  await connectDB();

  // Đăng nhập bằng tên đăng nhập. Vẫn nhận email để tài khoản tạo từ trước (đăng ký bằng email) không bị khoá ngoài.
  const query = login.includes('@') ? { email: login } : { username: login };
  const user = await User.findOne(query).select('+passwordHash');
  if (user && !user.passwordHash) {
    const via = user.provider === 'facebook' ? 'Facebook' : 'Google';
    return json({ message: `Tài khoản này được tạo bằng ${via}, hãy đăng nhập bằng ${via}` }, 401);
  }
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' }, 401);
  }

  return json({ token: signToken(user, body.remember !== false), user: user.toPublic() });
}
