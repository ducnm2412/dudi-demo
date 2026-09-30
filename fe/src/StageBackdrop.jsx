import { useEffect, useRef } from 'react';

// Đường mạch điện (lấy cảm hứng từ hoạ tiết neon trên mũ DUDI), toạ độ trong khung 1000x800
const TRACES = [
  'M0 170 H170 L230 230 H400',
  'M0 390 H80 L120 430 H210',
  'M0 590 H130 L190 530 H320',
  'M1000 130 H830 L770 190 H650',
  'M1000 410 H920 L880 370 H800',
  'M1000 640 H870 L810 580 H720',
  'M760 0 V80 L720 120 H610',
  'M300 0 V60 L340 100 H440',
  'M620 800 V720 L660 680 H760',
];

// Mỗi đường có một xung sáng chạy, lệch thời gian để không đồng loạt
const PULSES = [
  { i: 0, dur: 5.5, delay: 0 },
  { i: 2, dur: 6.5, delay: 1.8 },
  { i: 3, dur: 5, delay: 0.9 },
  { i: 5, dur: 7, delay: 2.6 },
  { i: 6, dur: 4.5, delay: 3.4 },
  { i: 7, dur: 6, delay: 4.1 },
  { i: 8, dur: 5.5, delay: 1.2 },
];

const endPoint = (d) => d.match(/[\d.]+/g).slice(-2).map(Number);

function Doodle({ kind }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (kind) {
    case 'sparkle':
      return <path {...common} d="M12 2c.6 5 2 7 7 8-5 1-6.4 3-7 8-.6-5-2-7-7-8 5-1 6.4-3 7-8Z" />;
    case 'circle':
      return <circle {...common} cx="12" cy="12" r="8" />;
    case 'squiggle':
      return <path {...common} d="M2 14c3-6 5 6 8 0s5 6 8 0 3-4 4-2" />;
    case 'plus':
      return <path {...common} d="M12 5v14M5 12h14" />;
    default:
      return <circle cx="12" cy="12" r="3" fill="currentColor" />;
  }
}

const DOODLES = [
  { kind: 'sparkle', top: '14%', left: '26%', size: 28, delay: 0 },
  { kind: 'circle', top: '72%', left: '38%', size: 22, delay: 1.5 },
  { kind: 'squiggle', top: '22%', left: '76%', size: 44, delay: 0.8 },
  { kind: 'plus', top: '58%', left: '84%', size: 20, delay: 2.2 },
  { kind: 'sparkle', top: '82%', left: '70%', size: 20, delay: 3 },
  { kind: 'dot', top: '40%', left: '16%', size: 14, delay: 1.1 },
];

// Hiệu ứng nền khung trái của trang đăng nhập / đăng ký
export default function StageBackdrop() {
  const root = useRef();

  // Parallax nhẹ theo chuột: cập nhật biến CSS, gộp theo từng khung hình
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        root.current?.style.setProperty('--mx', x.toFixed(3));
        root.current?.style.setProperty('--my', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div className="backdrop" ref={root} aria-hidden="true">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <svg className="circuits" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice">
        <g className="traces">
          {TRACES.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g className="pads">
          {TRACES.map((d) => {
            const [x, y] = endPoint(d);
            return <circle key={d} cx={x} cy={y} r="4" />;
          })}
        </g>
        <g className="pulses">
          {PULSES.map(({ i, dur, delay }) => (
            <path key={i} d={TRACES[i]} pathLength="100" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }} />
          ))}
        </g>
      </svg>

      <div className="doodles">
        {DOODLES.map((d) => (
          <svg
            key={`${d.kind}-${d.top}`}
            className="doodle"
            viewBox="0 0 24 24"
            width={d.size}
            height={d.size}
            style={{ top: d.top, left: d.left, animationDelay: `${d.delay}s` }}
          >
            <Doodle kind={d.kind} />
          </svg>
        ))}
      </div>
    </div>
  );
}
