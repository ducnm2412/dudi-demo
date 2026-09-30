import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { getUserIdFromRequest } from '@/lib/auth';
import { vnDateKey } from '@/lib/time';
import Attendance from '@/models/Attendance';

export function OPTIONS() {
  return preflight();
}

// POST /api/attendance/check: lần đầu trong ngày là vào ca, lần hai là ra ca
export async function POST(req) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return json({ message: 'Chưa đăng nhập' }, 401);

  await connectDB();
  const date = vnDateKey();
  const now = new Date();
  const record = await Attendance.findOne({ user: userId, date });

  if (!record) {
    try {
      const created = await Attendance.create({ user: userId, date, checkIn: now });
      return json({ action: 'checkIn', today: created.toPublic() }, 201);
    } catch (err) {
      // Hai request vào ca gần như cùng lúc: bản ghi đã được tạo bởi request kia
      if (err.code === 11000) return json({ message: 'Bạn vừa vào ca rồi' }, 409);
      throw err;
    }
  }

  if (record.checkOut) {
    return json({ message: 'Hôm nay bạn đã hoàn thành ca làm việc' }, 409);
  }

  record.checkOut = now;
  await record.save();
  return json({ action: 'checkOut', today: record.toPublic() });
}
