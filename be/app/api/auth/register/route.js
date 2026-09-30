import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { signToken } from '@/lib/auth';
import User from '@/models/User';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export function OPTIONS() {
  return preflight();
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').replace(/\s/g, '');
  const password = String(body.password || '');

  if (!EMAIL_RE.test(email)) {
    return json({ message: 'Email không hợp lệ' }, 400);
  }
  if (!PHONE_RE.test(phone)) {
    return json({ message: 'Số điện thoại không hợp lệ' }, 400);
  }
  if (password.length < 6) {
    return json({ message: 'Mật khẩu tối thiểu 6 ký tự' }, 400);
  }

  await connectDB();

  const existed = await User.findOne({ $or: [{ email }, { phone }] });
  if (existed) {
    if (existed.email === email) {
      const hint = existed.provider === 'google' ? ', hãy đăng nhập bằng Google' : '';
      return json({ message: `Email đã được sử dụng${hint}` }, 409);
    }
    return json({ message: 'Số điện thoại đã được sử dụng' }, 409);
  }

  const user = await User.create({
    email,
    phone,
    passwordHash: await bcrypt.hash(password, 10),
    name: email.split('@')[0],
    provider: 'local',
  });

  return json({ token: signToken(user), user: user.toPublic() }, 201);
}
