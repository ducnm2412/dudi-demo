/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import Logo from './Logo';
import StageBackdrop from './StageBackdrop';

// Tách three.js ra chunk riêng để form hiện ngay, robot tải sau
const Mascot = lazy(() => import('./mascot/Mascot'));

const PASSWORD_FIELDS = ['password', 'confirm'];

const BUBBLES = {
  shy: 'Mình không nhìn đâu.',
  peek: 'Chỉ liếc một chút thôi.',
};

const WORDS = ['phần mềm thông minh.', 'sản phẩm đỉnh cao.', 'điều chưa ai làm.'];
const FEATURES = ['Dự án', 'Công việc', 'Lịch', 'Chấm công'];

// Cụm từ nổi bật trong tiêu đề, đổi luân phiên (đứng yên khi người dùng giảm chuyển động)
function RotatingWord() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="stage-rotator">
      <span key={i} className="stage-word">
        {WORDS[i]}
      </span>
    </span>
  );
}

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
          <p className="stage-kicker">
            <span className="stage-kicker-dot" aria-hidden="true" />
            DUDI Software · Workspace
          </p>
          <p className="stage-hello" aria-hidden="true">Xin chào!</p>
          <p className="stage-title">
            Sẵn sàng để build
            <RotatingWord />
          </p>
          <p className="stage-sub">Dự án, công việc, lịch và chấm công — gói gọn trong một tài khoản DUDI.</p>
          <ul className="stage-chips" aria-label="Tính năng">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </section>

      <main className="panel">
        <div className="panel-inner">{children}</div>
      </main>
    </div>
  );
}
