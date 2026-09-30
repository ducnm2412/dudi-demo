import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { validateSignup } from '@/lib/registration';

export function OPTIONS() {
  return preflight();
}

// Kiểm tra thông tin trước khi nhờ Firebase gửi SMS, tránh tốn tin cho lượt đăng ký chắc chắn thất bại
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  await connectDB();
  const result = await validateSignup(body);
  if (result.error) return json({ message: result.error }, result.status);
  return json({ ok: true, phone: result.phone });
}
