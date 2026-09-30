import { useEffect, useState } from 'react';
import Icon from './Icon';
import { dayLabel, EVENT_TAGS, fmtDuration, fmtTime, monthKey, monthLabel, shiftMonth } from './format';

export function ProfilePanel({ user }) {
  return (
    <dl className="facts">
      <div><dt>Họ tên</dt><dd>{user.name || 'Chưa đặt'}</dd></div>
      {user.username && <div><dt>Tên đăng nhập</dt><dd>{user.username}</dd></div>}
      <div><dt>Email</dt><dd>{user.email || 'Chưa có'}</dd></div>
      <div>
        <dt>Số điện thoại</dt>
        <dd>
          {user.phone || 'Chưa thêm'}
          {user.phone && user.phoneVerified && ' (đã xác minh)'}
        </dd>
      </div>
      <div>
        <dt>Cách đăng nhập</dt>
        <dd>
          {{ google: 'Google', facebook: 'Facebook' }[user.provider] || 'Tên đăng nhập và mật khẩu'}
          {user.provider !== 'google' && user.googleLinked && ', đã liên kết Google'}
          {user.provider !== 'facebook' && user.facebookLinked && ', đã liên kết Facebook'}
        </dd>
      </div>
      <div>
        <dt>Ngày tạo</dt>
        <dd>{new Date(user.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
      </div>
    </dl>
  );
}

export function AttendancePanel({ loadAttendance, now }) {
  const [month, setMonth] = useState(() => monthKey());
  const [state, setState] = useState({ loading: true, records: [], error: '' });

  useEffect(() => {
    let cancelled = false;
    loadAttendance(month)
      .then((d) => !cancelled && setState({ loading: false, records: d.records, error: '' }))
      .catch((err) => !cancelled && setState({ loading: false, records: [], error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [month, loadAttendance]);

  const duration = (r) => (r.checkOut ? new Date(r.checkOut) : now) - new Date(r.checkIn);
  const total = state.records.reduce((sum, r) => sum + duration(r), 0);
  const isCurrent = month === monthKey();

  const go = (delta) => {
    setState((s) => ({ ...s, loading: true }));
    setMonth((m) => shiftMonth(m, delta));
  };

  return (
    <div className="attendance">
      <div className="month-nav">
        <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Tháng trước">
          <Icon name="chevronLeft" size={20} />
        </button>
        <span>{monthLabel(month)}</span>
        <button type="button" className="icon-btn" onClick={() => go(1)} disabled={isCurrent} aria-label="Tháng sau">
          <Icon name="chevronRight" size={20} />
        </button>
      </div>

      {state.error && <p className="error">{state.error}</p>}

      {!state.loading && !state.error && (
        <>
          <p className="summary">
            <strong>{state.records.length}</strong> ngày công, tổng <strong>{fmtDuration(total)}</strong>
          </p>
          {state.records.length === 0 ? (
            <p className="empty">
              {isCurrent ? 'Tháng này chưa có ngày công nào. Nhấn giữ nút vân tay ở trang chủ để vào ca.' : 'Không có ngày công nào trong tháng này.'}
            </p>
          ) : (
            <ul className="records">
              {state.records.map((r) => (
                <li key={r.id}>
                  <span className="records-day">{dayLabel(r.date)}</span>
                  <span className="records-time">
                    {fmtTime(r.checkIn)} – {r.checkOut ? fmtTime(r.checkOut) : 'đang làm'}
                  </span>
                  <span className="records-dur">{fmtDuration(duration(r))}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {state.loading && <p className="empty">Đang tải...</p>}
    </div>
  );
}

export function TasksPanel({ tasks, loaded, addTask, toggleTask, removeTask }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = tasks.filter((t) => !t.done).length;

  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await run(async () => {
      await addTask(title.trim());
      setTitle('');
    });
    setSaving(false);
  };

  return (
    <div className="tasks">
      <form className="task-form" onSubmit={onSubmit}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thêm công việc, ví dụ: Gửi báo cáo tuần" maxLength={200} aria-label="Tên công việc" />
        <button type="submit" className="primary" disabled={saving || !title.trim()}>
          <Icon name="plus" size={18} /> Thêm
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loaded && (
        <p className="summary">
          {tasks.length === 0 ? 'Chưa có công việc nào. Thêm việc đầu tiên ở ô bên trên.' : pending ? `Còn ${pending} việc chưa xong` : 'Đã xong hết mọi việc'}
        </p>
      )}

      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t.id} className={t.done ? 'is-done' : ''}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => run(() => toggleTask(t))} />
              <span>{t.title}</span>
            </label>
            <button type="button" className="icon-btn" onClick={() => run(() => removeTask(t))} aria-label={`Xoá "${t.title}"`}>
              <Icon name="trash" size={18} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EventsPanel({ events, loaded, addEvent, removeEvent }) {
  const [form, setForm] = useState({ time: '09:00', title: '', tag: 'online' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addEvent({ ...form, title: form.title.trim() });
      setForm((f) => ({ ...f, title: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ev) => {
    setError('');
    try {
      await removeEvent(ev);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="events">
      <form className="event-form" onSubmit={onSubmit}>
        <div className="event-form-row">
          <input type="time" name="time" value={form.time} onChange={onChange} required aria-label="Giờ" />
          <select name="tag" value={form.tag} onChange={onChange} aria-label="Hình thức">
            {Object.entries(EVENT_TAGS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <input name="title" value={form.title} onChange={onChange} placeholder="Tên sự kiện, ví dụ: Họp team dự án" maxLength={120} aria-label="Tên sự kiện" />
        <button type="submit" className="primary" disabled={saving || !form.title.trim()}>
          <Icon name="plus" size={18} /> Thêm vào lịch hôm nay
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {loaded && events.length === 0 && <p className="empty">Hôm nay chưa có sự kiện nào.</p>}

      <ul className="event-list">
        {events.map((ev) => (
          <li key={ev.id}>
            <span className="event-time">{ev.time}</span>
            <span className="event-title">{ev.title}</span>
            <span className={`tag tag-${ev.tag}`}>{EVENT_TAGS[ev.tag]}</span>
            <button type="button" className="icon-btn" onClick={() => remove(ev)} aria-label={`Xoá "${ev.title}"`}>
              <Icon name="trash" size={18} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NotificationsPanel({ notices, onOpen }) {
  if (!notices.length) return <p className="empty">Không có thông báo mới.</p>;
  return (
    <ul className="notices">
      {notices.map((n) => (
        <li key={n.id}>
          <p>{n.text}</p>
          <span className="notice-time">{n.time}</span>
          {n.action && (
            <button type="button" className="link-btn" onClick={() => onOpen(n.action.panel)}>
              {n.action.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SoonPanel({ name }) {
  return <p className="empty">Tính năng {name.toLowerCase()} đang được xây dựng. Khi có dữ liệu, nội dung sẽ hiện ở đây.</p>;
}
