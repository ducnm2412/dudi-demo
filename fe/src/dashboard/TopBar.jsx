import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../portal/Icon';
import { NAV_ITEMS } from './nav';

// Tìm trong công việc, lịch hôm nay và các mục menu
function useSearch(query, tasks, events) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hit = (s) => s.toLowerCase().includes(q);
    return [
      ...NAV_ITEMS.filter((i) => i.id !== 'home' && hit(i.label)).map((i) => ({ key: `nav-${i.id}`, label: i.label, kind: 'Mục', panel: i.id })),
      ...tasks.filter((t) => hit(t.title)).map((t) => ({ key: `task-${t.id}`, label: t.title, kind: t.done ? 'Việc đã xong' : 'Công việc', panel: 'tasks' })),
      ...events.filter((e) => hit(e.title)).map((e) => ({ key: `ev-${e.id}`, label: `${e.time} ${e.title}`, kind: 'Lịch', panel: 'calendar' })),
    ].slice(0, 8);
  }, [query, tasks, events]);
}

export default function TopBar({ user, displayName, alerts, tasks, events, onOpen, onMenu, onLogout }) {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const results = useSearch(query, tasks, events);
  const searchBox = useRef();
  const userBox = useRef();

  // Đóng dropdown khi bấm ra ngoài
  useEffect(() => {
    const onDown = (e) => {
      if (!searchBox.current?.contains(e.target)) setSearchOpen(false);
      if (!userBox.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const pick = (r) => {
    setSearchOpen(false);
    setQuery('');
    onOpen(r.panel);
  };

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Mở menu">
        <Icon name="menu" size={22} />
      </button>

      <div className="search" ref={searchBox}>
        <Icon name="search" size={20} />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearchOpen(false);
            if (e.key === 'Enter' && results[0]) {
              // Chặn Enter "rơi" sang nút Đóng của ngăn kéo vừa nhận focus
              e.preventDefault();
              pick(results[0]);
            }
          }}
          placeholder="Tìm kiếm công việc, lịch, ..."
          aria-label="Tìm kiếm"
        />
        {searchOpen && query.trim() && (
          <ul className="search-results">
            {results.length === 0 && <li className="search-empty">Không tìm thấy kết quả cho “{query.trim()}”</li>}
            {results.map((r) => (
              <li key={r.key}>
                <button type="button" onClick={() => pick(r)}>
                  <span>{r.label}</span>
                  <small>{r.kind}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="topbar-right">
        <button type="button" className="icon-btn bell" onClick={() => onOpen('notifications')} aria-label={`Thông báo, ${alerts} mục cần chú ý`}>
          <Icon name="bell" size={22} />
          {alerts > 0 && <span className="badge">{alerts}</span>}
        </button>

        <div className="user-menu" ref={userBox}>
          <button type="button" className="user-btn" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-haspopup="menu">
            <img src={user.avatar || '/mascot/wave.webp'} alt="" referrerPolicy="no-referrer" className={user.avatar ? '' : 'is-mascot'} />
            <span className="user-text">
              <strong>{displayName}</strong>
              <span>Nhân viên</span>
            </span>
            <Icon name="chevronDown" size={18} />
          </button>
          {menuOpen && (
            <ul className="user-dropdown" role="menu">
              <li>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onOpen('profile'); }}>
                  <Icon name="user" size={18} /> Hồ sơ
                </button>
              </li>
              <li>
                <button type="button" role="menuitem" onClick={onLogout}>
                  <Icon name="logout" size={18} /> Đăng xuất
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}
