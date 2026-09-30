/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, useCallback, useState } from 'react';
import Logo from './Logo';
import StageBackdrop from './StageBackdrop';

// Tách three.js ra chunk riêng để form hiện ngay, robot tải sau
const Mascot = lazy(() => import('./mascot/Mascot'));

const PASSWORD_FIELDS = ['password', 'confirm'];

const BUBBLES = {
  shy: 'Mình không nhìn đâu.',
  peek: 'Chỉ liếc một chút thôi.',
};

// Suy ra biểu cảm của robot từ ô đang nhập trong form
export function useMascotMood() {
  const [focus, setFocus] = useState(null);
  const [visible, setVisible] = useState({});
  const [shakeKey, setShakeKey] = useState(0);

  let mood = 'idle';
  if (PASSWORD_FIELDS.includes(focus)) mood = visible[focus] ? 'peek' : 'shy';
  else if (focus) mood = 'watch';

  const bind = useCallback(
    (name) => ({
      onFocus: () => setFocus(name),
      onBlur: () => setFocus((f) => (f === name ? null : f)),
    }),
    []
  );

  const onVisibleChange = useCallback(
    (name) => (v) => setVisible((s) => ({ ...s, [name]: v })),
    []
  );

  const shake = useCallback(() => setShakeKey((k) => k + 1), []);

  return { mood, shakeKey, bind, onVisibleChange, shake };
}

export default function AuthLayout({ mood, shakeKey, children }) {
  return (
    <div className="auth">
      <section className="stage">
        <StageBackdrop />
        <Logo />

        <Suspense fallback={null}>
          <Mascot mood={mood} shakeKey={shakeKey} />
        </Suspense>

        <p className={`bubble${BUBBLES[mood] ? ' is-shown' : ''}`} aria-hidden="true">
          {BUBBLES[mood] || ' '}
        </p>

        <div className="stage-copy">
          <p className="stage-hello" aria-hidden="true">Xin chào!</p>
          <p className="stage-title">Giải pháp phần mềm thông minh</p>
          <p className="stage-sub">Một tài khoản để theo dõi mọi dự án bạn làm cùng DUDI Software.</p>
        </div>
      </section>

      <main className="panel">
        <div className="panel-inner">{children}</div>
      </main>
    </div>
  );
}
