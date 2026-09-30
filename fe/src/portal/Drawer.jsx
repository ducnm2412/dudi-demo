import { useEffect, useRef } from 'react';
import Icon from './Icon';

// Ngăn kéo trượt từ bên phải, đóng bằng Esc, nút X hoặc bấm ra ngoài
export default function Drawer({ title, onClose, children }) {
  const closeBtn = useRef();
  const lastFocus = useRef(null);

  useEffect(() => {
    lastFocus.current = document.activeElement;
    closeBtn.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="drawer-root">
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-head">
          <h2 id="drawer-title">{title}</h2>
          <button ref={closeBtn} type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
