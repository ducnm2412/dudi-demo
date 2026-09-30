import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { getUserIdFromRequest } from '@/lib/auth';
import Event from '@/models/Event';

export function OPTIONS() {
  return preflight();
}

export async function DELETE(req, { params }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return json({ message: 'Chưa đăng nhập' }, 401);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return json({ message: 'Không tìm thấy sự kiện' }, 404);

  await connectDB();
  const result = await Event.deleteOne({ _id: id, user: userId });
  if (!result.deletedCount) return json({ message: 'Không tìm thấy sự kiện' }, 404);
  return json({ ok: true });
}
