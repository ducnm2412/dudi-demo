import { useEffect, useState } from 'react';
import { api } from './api';

const ENABLED = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

// Tải module Firebase một lần cho cả app
let modPromise;
function loadAuth() {
  if (!modPromise) {
    modPromise = import('./facebookAuth').catch((err) => {
      modPromise = null;
      throw err;
    });
  }
  return modPromise;
}

const FbLogo = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" />
    <path fill="#fff" d="m16.7 15.5.5-3.5h-3.4V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.7 0-4.5 1.6-4.5 4.7V12h-3v3.5h3v8.4a12 12 0 0 0 3.7 0v-8.4h2.9Z" />
  </svg>
);

// text: 'signin' | 'signup'
export default function FacebookButton({ text = 'signin', remember = true, onSuccess, onError }) {
  const [mod, setMod] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ENABLED) return;
    let alive = true;
    loadAuth()
      .then((m) => alive && setMod(m))
      .catch(() => alive && onError('Không tải được Firebase'));
    return () => {
      alive = false;
    };
  }, [onError]);

  if (!ENABLED) {
    return <p className="hint">Chưa cấu hình Firebase (VITE_FIREBASE_*) nên chưa dùng được Facebook.</p>;
  }

  // Module đã tải sẵn để signInWithPopup chạy ngay trong sự kiện click, nếu không trình duyệt sẽ chặn popup
  const onClick = () => {
    setBusy(true);
    mod
      .signInWithFacebook()
      .then((idToken) => api('/api/auth/facebook', { method: 'POST', body: { idToken, remember } }))
      .then(onSuccess)
      .catch((err) => onError(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <button type="button" className="social-btn" onClick={onClick} disabled={!mod || busy}>
      <FbLogo />
      <span>{busy ? 'Đang xử lý...' : text === 'signup' ? 'Đăng ký bằng Facebook' : 'Đăng nhập bằng Facebook'}</span>
    </button>
  );
}
