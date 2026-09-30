import { useEffect, useRef, useState } from 'react';

const HOLD_MS = 1100;

// Các nét vân tay (theo icon "fingerprint" của Lucide, ISC license)
const STROKES = [
  'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4',
  'M14 13.12c0 2.38 0 6.38-1 8.88',
  'M17.29 21.02c.12-.6.43-2.3.5-3.02',
  'M2 12a10 10 0 0 1 18-6',
  'M2 16h.01',
  'M21.8 16c.2-2 .131-5.354 0-6',
  'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2',
  'M8.65 22c.21-.66.45-1.32.57-2',
  'M9 6.8a6 6 0 0 1 9 5.2v2',
];

// Nhấn giữ để chấm công: các nét vân tay sáng dần theo thời gian giữ
export default function Fingerprint({ status, label, detail, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const raf = useRef(0);
  const start = useRef(0);
  const disabled = status === 'done' || status === 'loading' || busy;

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const finish = async () => {
    setHolding(false);
    setBusy(true);
    try {
      await onComplete();
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const begin = () => {
    if (disabled || holding) return;
    setHolding(true);
    start.current = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start.current) / HOLD_MS);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else finish();
    };
    raf.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (!holding) return;
    cancelAnimationFrame(raf.current);
    setHolding(false);
    setProgress(0);
  };

  const onKeyDown = (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      begin();
    }
  };
  const onKeyUp = (e) => {
    if (e.key === ' ' || e.key === 'Enter') cancel();
  };

  const lit = status === 'done' || flash ? 1 : progress;

  return (
    <div className={`fingerprint is-${status}${holding ? ' is-holding' : ''}${flash ? ' is-flash' : ''}`}>
      <button
        type="button"
        className="fingerprint-btn"
        disabled={disabled}
        aria-label={label}
        aria-describedby="fingerprint-detail"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          begin();
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <g className="fp-base">
            {STROKES.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          {/* Ẩn hẳn lớp sáng khi chưa giữ, tránh đầu nét bo tròn hiện thành chấm */}
          <g className="fp-lit" opacity={lit > 0 ? 1 : 0}>
            {STROKES.map((d) => (
              <path key={d} d={d} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - lit} />
            ))}
          </g>
        </svg>
      </button>
      <p className="fingerprint-label">{busy ? 'Đang chấm công...' : label}</p>
      <p className="fingerprint-detail" id="fingerprint-detail">{detail}</p>
    </div>
  );
}
