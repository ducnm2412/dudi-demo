import Icon from '../portal/Icon';
import { NAV } from './nav';

export default function Sidebar({ open, onClose, onOpen, onLogout }) {
  const go = (id) => {
    onClose();
    if (id !== 'home') onOpen(id);
  };

  return (
    <>
      <div className={`side-backdrop${open ? ' is-open' : ''}`} onClick={onClose} />
      <aside className={`side${open ? ' is-open' : ''}`} aria-label="Điều hướng">
        <a className="side-brand" href="/">
          <img src="/dudisoftware1.webp" alt="" width="36" height="36" />
          <span>DUDI</span>
        </a>

        <nav className="side-nav">
          {NAV.map((g) => (
            <div key={g.group || 'main'} className="side-group">
              {g.group && <p className="side-label">{g.group}</p>}
              <ul>
                {g.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`side-link${item.id === 'home' ? ' is-active' : ''}`}
                      aria-current={item.id === 'home' ? 'page' : undefined}
                      onClick={() => go(item.id)}
                    >
                      <Icon name={item.icon} size={20} strokeWidth={1.9} />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="side-cheer">
          <img src="/mascot/wave.webp" alt="" />
          <p className="script">Cố lên nhé! DUDI luôn ở đây đồng hành cùng bạn!</p>
        </div>

        <button type="button" className="side-link side-logout" onClick={onLogout}>
          <Icon name="logout" size={20} strokeWidth={1.9} />
          Đăng xuất
        </button>
      </aside>
    </>
  );
}
