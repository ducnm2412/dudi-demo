import { lazy, Suspense } from 'react';
import Icon from '../portal/Icon';
import { EVENT_TAGS, fmtDuration, fmtTime } from '../portal/format';

// three.js tải riêng, thẻ chào vẫn hiện ngay
const Mascot = lazy(() => import('../mascot/Mascot'));

export function Hero({ greetingText, displayName, now }) {
  const date = now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="card hero">
      <div className="hero-text">
        <p className="script hero-hello">Hello!</p>
        <h1>
          {greetingText},
          <br />
          {displayName} <span aria-hidden="true">👋</span>
        </h1>
        <p className="hero-sub">Hôm nay là một ngày tuyệt vời để làm những điều thật cool! 🚀</p>
        <p className="hero-date">
          <Icon name="calendar" size={18} />
          <span>{date}</span>
        </p>
      </div>
      <div className="hero-art">
        <Suspense fallback={<img src="/mascot/wave.webp" alt="" className="hero-fallback" />}>
          <Mascot className="hero-mascot" mood="wave" framing="hero" showGround={false} showSparkles={false} />
        </Suspense>
        <p className="script hero-bubble" aria-hidden="true">Let&apos;s do it!</p>
      </div>
    </section>
  );
}

export function CheckCard({ loaded, today, now, busy, error, onCheck }) {
  let time = '--:--';
  let status = 'Chưa vào ca';
  let dot = 'idle';
  let action = 'Check in';
  let icon = 'arrowRight';
  let disabled = !loaded || busy;

  if (today?.checkOut) {
    time = fmtTime(today.checkIn);
    status = `Đã xong ca, ${fmtTime(today.checkIn)} đến ${fmtTime(today.checkOut)}`;
    dot = 'done';
    action = 'Đã hoàn thành';
    icon = 'check';
    disabled = true;
  } else if (today) {
    time = fmtTime(today.checkIn);
    status = `Đang làm việc, ${fmtDuration(now - new Date(today.checkIn))}`;
    dot = 'working';
    action = 'Check out';
    icon = 'logout';
  }

  return (
    <section className="card check">
      <h2>Chấm công hôm nay</h2>
      <div className="check-time">
        <Icon name="clock" size={34} strokeWidth={2.2} />
        <strong>{time}</strong>
      </div>
      <p className="check-status">
        {status} <span className={`status-dot is-${dot}`} />
      </p>
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn-orange check-btn" disabled={disabled} onClick={onCheck}>
        {busy ? 'Đang chấm công...' : action}
        <Icon name={icon} size={20} />
      </button>
      <img src="/mascot/wave.webp" alt="" className="check-mascot" />
      <p className="script check-note" aria-hidden="true">Làm việc hiệu quả nhé!</p>
    </section>
  );
}

export function QuickCards({ items, onOpen }) {
  return (
    <section className="quick" aria-label="Truy cập nhanh">
      {items.map((it) => (
        <button key={it.id} type="button" className="card quick-card" onClick={() => onOpen(it.id)}>
          <span className="quick-icon">
            <Icon name={it.icon} size={24} />
          </span>
          <strong>{it.label}</strong>
          <span className="quick-sub">{it.sub}</span>
          <span className="quick-arrow">
            <Icon name="arrowRight" size={20} />
          </span>
        </button>
      ))}
    </section>
  );
}

export function NotifCard({ notices, onOpen }) {
  return (
    <section className="card notif">
      <header className="card-head">
        <h2>Thông báo</h2>
        <button type="button" className="link-orange" onClick={() => onOpen('notifications')}>Xem tất cả</button>
      </header>
      {notices.length === 0 ? (
        <p className="empty">Không có thông báo mới.</p>
      ) : (
        <ul className="notif-list">
          {notices.slice(0, 4).map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => onOpen(n.action?.panel || 'notifications')}>
                <span className="notif-dot" />
                <span className="notif-text">{n.text}</span>
                <span className="notif-time">{n.time}</span>
                <Icon name="chevronRight" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const QUOTES = [
  [0, 'Từng việc một, bạn làm được mà!'],
  [50, 'Cố lên! Bạn đang làm rất tốt!'],
  [100, 'Xong hết rồi, tuyệt vời quá!'],
];

export function ProgressCard({ tasks, loaded, onToggle, onOpen }) {
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const quote = tasks.length ? QUOTES.filter(([min]) => pct >= min).pop()[1] : 'Thêm việc đầu tiên để bắt đầu ngày mới nhé!';
  const R = 62;
  const C = 2 * Math.PI * R;

  return (
    <section className="card progress">
      <header className="card-head">
        <h2>
          <Icon name="checkSquare" size={22} /> Tiến độ công việc
        </h2>
      </header>

      <div className="progress-body">
        <div className="donut" role="img" aria-label={`Đã xong ${done} trên ${tasks.length} việc, ${pct}%`}>
          <svg viewBox="0 0 150 150">
            <circle cx="75" cy="75" r={R} className="donut-track" />
            <circle cx="75" cy="75" r={R} className="donut-value" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
          </svg>
          <div className="donut-label">
            <strong>{pct}%</strong>
            <span>
              {done}/{tasks.length} việc
              <br />
              đã xong
            </span>
          </div>
        </div>

        {loaded && tasks.length === 0 ? (
          <div className="progress-empty">
            <p className="empty">Chưa có công việc nào.</p>
            <button type="button" className="link-orange" onClick={() => onOpen('tasks')}>
              Thêm công việc
            </button>
          </div>
        ) : (
          <ul className="checklist">
            {tasks.slice(0, 4).map((t) => (
              <li key={t.id}>
                <label className={t.done ? 'is-done' : ''}>
                  <input type="checkbox" checked={t.done} onChange={() => onToggle(t)} />
                  <span className="check-mark" aria-hidden="true">
                    {t.done && <Icon name="check" size={12} strokeWidth={3.5} />}
                  </span>
                  <span>{t.title}</span>
                </label>
              </li>
            ))}
            {tasks.length > 4 && (
              <li>
                <button type="button" className="link-orange" onClick={() => onOpen('tasks')}>
                  Xem thêm {tasks.length - 4} việc
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <figure className="quote">
        <img src="/mascot/wave.webp" alt="" />
        <blockquote>“{quote}” ❤️</blockquote>
        <figcaption>DUDI</figcaption>
      </figure>
    </section>
  );
}

export function ScheduleCard({ events, loaded, onOpen }) {
  return (
    <section className="card schedule">
      <header className="card-head">
        <h2>
          <Icon name="calendar" size={22} /> Lịch hôm nay
        </h2>
        <button type="button" className="link-orange" onClick={() => onOpen('calendar')}>
          {events.length ? 'Xem tất cả' : 'Thêm lịch'}
        </button>
      </header>
      {loaded && events.length === 0 ? (
        <p className="empty">Hôm nay chưa có lịch. Thêm cuộc họp hay giờ nghỉ để theo dõi trong ngày.</p>
      ) : (
        <ol className="timeline">
          {events.slice(0, 5).map((e) => (
            <li key={e.id}>
              <span className="tl-time">{e.time}</span>
              <span className="tl-title">{e.title}</span>
              <span className={`tag tag-${e.tag}`}>{EVENT_TAGS[e.tag]}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function PromoCard() {
  return (
    <section className="card promo" aria-label="DUDI Software">
      <p className="script promo-title">
        Dream
        <br />
        Build
        <br />
        Grow
      </p>
      <p className="promo-text">
        Cùng <strong>DUDI</strong> tạo nên những điều tuyệt vời!
      </p>
      <Icon name="heart" size={22} />
      <img src="/mascot/full.webp" alt="" className="promo-mascot" />
    </section>
  );
}

export function FooterBanner() {
  const pulse = (
    <svg viewBox="0 0 120 24" aria-hidden="true">
      <path d="M0 12h44l6-9 8 18 6-12 4 3h52" />
    </svg>
  );
  return (
    <footer className="banner">
      {pulse}
      <p>Better People · Better Tomorrow</p>
      {pulse}
      <span className="banner-du" aria-hidden="true">DU</span>
    </footer>
  );
}
