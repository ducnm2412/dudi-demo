import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { getUserIdFromRequest } from '@/lib/auth';
import Task from '@/models/Task';

export function OPTIONS() {
  return preflight();
}

async function findOwnTask(req, params) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return { error: json({ message: 'Chưa đăng nhập' }, 401) };

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return { error: json({ message: 'Không tìm thấy công việc' }, 404) };

  await connectDB();
  const task = await Task.findOne({ _id: id, user: userId });
  if (!task) return { error: json({ message: 'Không tìm thấy công việc' }, 404) };
  return { task };
}

export async function PATCH(req, { params }) {
  const { task, error } = await findOwnTask(req, params);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  if (typeof body.done === 'boolean') task.done = body.done;
  if (typeof body.title === 'string') {
    const title = body.title.trim();
    if (!title) return json({ message: 'Hãy nhập tên công việc' }, 400);
    task.title = title.slice(0, 200);
  }
  await task.save();
  return json({ task: task.toPublic() });
}

export async function DELETE(req, { params }) {
  const { task, error } = await findOwnTask(req, params);
  if (error) return error;

  await task.deleteOne();
  return json({ ok: true });
}
