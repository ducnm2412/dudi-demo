import { connectDB } from '@/lib/db';
import { json, preflight } from '@/lib/http';
import { getUserIdFromRequest } from '@/lib/auth';
import { vnDateKey } from '@/lib/time';
import Event, { EVENT_TAGS } from '@/models/Event';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function OPTIONS() {
  return preflight();
}

// GET /api/events?date=YYYY-MM-DD (mặc định hôm nay theo giờ Việt Nam)
export async function GET(req) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return json({ message: 'Chưa đăng nhập' }, 401);

  const date = new URL(req.url).searchParams.get('date') || vnDateKey();
  if (!DATE_RE.test(date)) return json({ message: 'Ngày không hợp lệ, dùng dạng YYYY-MM-DD' }, 400);

  await connectDB();
  const events = await Event.find({ user: userId, date }).sort({ time: 1 });
  return json({ date, events: events.map((e) => e.toPublic()) });
}

export async function POST(req) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return json({ message: 'Chưa đăng nhập' }, 401);

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const time = String(body.time || '');
  const date = String(body.date || vnDateKey());
  const tag = EVENT_TAGS.includes(body.tag) ? body.tag : 'offline';

  if (!title) return json({ message: 'Hãy nhập tên sự kiện' }, 400);
  if (title.length > 120) return json({ message: 'Tên sự kiện tối đa 120 ký tự' }, 400);
  if (!TIME_RE.test(time)) return json({ message: 'Giờ không hợp lệ, dùng dạng HH:mm' }, 400);
  if (!DATE_RE.test(date)) return json({ message: 'Ngày không hợp lệ' }, 400);

  await connectDB();
  const event = await Event.create({ user: userId, date, time, title, tag });
  return json({ event: event.toPublic() }, 201);
}
