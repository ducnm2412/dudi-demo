import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { getUserIdFromRequest } from '@/lib/auth';
import User from '@/models/User';

export function OPTIONS() {
  return preflight();
}

export async function GET(req) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return json({ message: 'Chưa đăng nhập' }, 401);

  await connectDB();
  const user = await User.findById(userId);
  if (!user) return json({ message: 'Tài khoản không tồn tại' }, 401);

  return json({ user: user.toPublic() });
}
