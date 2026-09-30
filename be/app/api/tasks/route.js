import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { getUserIdFromRequest } from '@/lib/auth';
import Task from '@/models/Task';

export function OPTIONS() {
  return preflight();
}

export async function GET(req) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return json({ message: 'Chưa đăng nhập' }, 401);

  await connectDB();
  const tasks = await Task.find({ user: userId }).sort({ done: 1, createdAt: -1 });
  return json({ tasks: tasks.map((t) => t.toPublic()) });
}

export async function POST(req) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return json({ message: 'Chưa đăng nhập' }, 401);

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) return json({ message: 'Hãy nhập tên công việc' }, 400);
  if (title.length > 200) return json({ message: 'Tên công việc tối đa 200 ký tự' }, 400);

  await connectDB();
  const task = await Task.create({ user: userId, title });
  return json({ task: task.toPublic() }, 201);
}
