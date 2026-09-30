import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { getUserIdFromRequest } from '@/lib/auth';
import { vnDateKey, vnMonthKey } from '@/lib/time';
import Attendance from '@/models/Attendance';

export function OPTIONS() {
  return preflight();
}

// GET /api/attendance?month=YYYY-MM -> bản ghi hôm nay + các ngày trong tháng
export async function GET(req) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return json({ message: 'Chưa đăng nhập' }, 401);

  const month = new URL(req.url).searchParams.get('month') || vnMonthKey();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return json({ message: 'Tháng không hợp lệ, dùng dạng YYYY-MM' }, 400);
  }

  await connectDB();
  const records = await Attendance.find({ user: userId, date: { $regex: `^${month}-` } }).sort({ date: -1 });
  const today = await Attendance.findOne({ user: userId, date: vnDateKey() });

  return json({
    today: today ? today.toPublic() : null,
    month,
    records: records.map((r) => r.toPublic()),
  });
}
