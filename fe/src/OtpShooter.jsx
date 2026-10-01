import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

// Mini game nhập OTP kiểu bắn trứng: kéo quả số lên rồi thả để bắn vào ô.
// Chỉ khi đủ 6 ô mới gửi mã đi kiểm tra; FE không biết mã đúng nên không báo đúng/sai từng ô.
const LENGTH = 6;
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const EMPTY = Array(LENGTH).fill('');
const TAP_DISTANCE = 8; // kéo ít hơn mức này coi như chạm
const WRONG_MS = 600;

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Tâm của phần tử, tính trong hệ toạ độ của khung game
function centerIn(el, box) {
  const r = el.getBoundingClientRect();
  return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
}

// Quả số đang bay: chạy theo đường cong rồi báo đã chạm ô
function Flight({ flight, onLand }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const { from, to } = flight;
    if (reduceMotion() || !ref.current.animate) {
      onLand(flight);
      return;
    }
    // Đường cong bậc hai, điểm uốn lệch sang ngang để quả số bay vòng nhẹ
    const ctrl = { x: from.x + (to.x - from.x) * 0.2, y: (from.y + to.y) / 2 };
    const frames = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * ctrl.x + t ** 2 * to.x;
      const y = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * ctrl.y + t ** 2 * to.y;
      frames.push({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${1 - 0.15 * t})` });
    }
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const anim = ref.current.animate(frames, {
      duration: Math.min(220 + distance * 1.2, 520),
      easing: 'cubic-bezier(0.25, 0.7, 0.35, 1)',
      fill: 'forwards',
    });
    anim.onfinish = () => onLand(flight);
    return () => anim.cancel();
  }, [flight, onLand]);

  return (
    <span
      ref={ref}
      className="otp-ball otp-flying"
      style={{ transform: `translate(${flight.from.x}px, ${flight.from.y}px) translate(-50%, -50%)` }}
      aria-hidden="true"
    >
      {flight.digit}
    </span>
  );
}

export default function OtpShooter({ ref, disabled, onChange, onFocus, onBlur }) {
  const box = useRef(null);
  const slotRefs = useRef([]);
  const ballRefs = useRef({});
  const nextId = useRef(0);
  const timers = useRef([]);
  const latest = useRef(onChange);

  const [digits, setDigits] = useState(EMPTY);
  const [flights, setFlights] = useState([]);
  const [pops, setPops] = useState(() => Array(LENGTH).fill(0));
  const [drag, setDrag] = useState(null); // { digit, start, pos, slots, moved }
  const [wrong, setWrong] = useState(false);

  useLayoutEffect(() => {
    latest.current = onChange;
  });

  useEffect(() => {
    box.current?.focus({ preventScroll: true });
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // Đủ 6 ô và không còn quả nào đang bay thì báo mã cho form, còn thiếu thì báo chuỗi rỗng
  const complete = flights.length === 0 && digits.every(Boolean);
  const value = complete ? digits.join('') : '';
  useEffect(() => {
    latest.current?.(value);
  }, [value]);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  // Form gọi khi mã sai (rung rồi xoá hết) hoặc khi gửi lại mã (xoá luôn)
  useImperativeHandle(ref, () => ({
    reject() {
      setWrong(true);
      later(() => {
        setDigits(EMPTY);
        setWrong(false);
        box.current?.focus({ preventScroll: true });
      }, WRONG_MS);
    },
    clear() {
      setDigits(EMPTY);
      setFlights([]);
    },
  }));

  const blocked = disabled || wrong;
  const isFree = (i) => !digits[i] && !flights.some((f) => f.slot === i);
  const firstFree = () => digits.findIndex((_, i) => isFree(i));

  const onLand = useCallback((flight) => {
    setDigits((d) => d.map((v, i) => (i === flight.slot ? flight.digit : v)));
    setFlights((list) => list.filter((f) => f.id !== flight.id));
    setPops((p) => p.map((n, i) => (i === flight.slot ? n + 1 : n)));
  }, []);

  // Bắn một số vào ô `slot` (mặc định ô trống đầu tiên), xuất phát từ `from` hoặc từ quả số bên dưới
  const shoot = (digit, slot = firstFree(), from) => {
    if (blocked || slot < 0 || !box.current) return;
    const rect = box.current.getBoundingClientRect();
    const to = centerIn(slotRefs.current[slot], rect);
    const start = from || centerIn(ballRefs.current[digit], rect);
    // Bắn đè ô đã có số: bỏ số cũ ngay để ô không bị tính là đủ
    setDigits((d) => d.map((v, i) => (i === slot ? '' : v)));
    setFlights((list) => [...list.filter((f) => f.slot !== slot), { id: nextId.current++, digit, slot, from: start, to }]);
  };

  // Chạm vào ô đã có số: bắn rơi số đó để bắn lại
  const knockOut = (slot) => {
    if (blocked || !digits[slot]) return;
    setDigits((d) => d.map((v, i) => (i === slot ? '' : v)));
  };

  // Hướng ngắm: kéo dài đường từ điểm bắt đầu qua ngón tay tới hàng ô, chọn ô gần nhất
  const aimOf = (d) => {
    if (!d?.moved) return null;
    const dy = d.pos.y - d.start.y;
    if (dy > -20) return null;
    const rowY = d.slots[0].y;
    const x = d.start.x + ((d.pos.x - d.start.x) * (rowY - d.start.y)) / dy;
    let slot = 0;
    d.slots.forEach((s, i) => {
      if (Math.abs(s.x - x) < Math.abs(d.slots[slot].x - x)) slot = i;
    });
    return { slot, x: d.slots[slot].x, y: rowY };
  };
  const aim = aimOf(drag);

  const pointerPos = (e) => {
    const rect = box.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (digit) => (e) => {
    if (blocked || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    box.current.focus({ preventScroll: true });
    const rect = box.current.getBoundingClientRect();
    setDrag({
      digit,
      start: centerIn(e.currentTarget, rect),
      pos: pointerPos(e),
      slots: slotRefs.current.map((el) => centerIn(el, rect)),
      moved: false,
    });
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const pos = pointerPos(e);
    const moved = drag.moved || Math.hypot(pos.x - drag.start.x, pos.y - drag.start.y) > TAP_DISTANCE;
    setDrag({ ...drag, pos, moved });
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (!drag.moved) shoot(drag.digit);
    else if (aim) shoot(drag.digit, aim.slot, drag.pos);
    setDrag(null);
  };

  const onKeyDown = (e) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      shoot(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const last = digits.findLastIndex(Boolean);
      if (last >= 0) knockOut(last);
    }
  };

  // Dán cả mã: bắn lần lượt từng số vào các ô trống
  const onPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted || blocked) return;
    e.preventDefault();
    const free = digits.map((_, i) => i).filter(isFree);
    [...pasted].slice(0, free.length).forEach((d, i) => later(() => shoot(d, free[i]), i * 90));
  };

  const active = firstFree();

  return (
    <div
      ref={box}
      className={`otp-game${blocked ? ' is-blocked' : ''}`}
      tabIndex={0}
      role="group"
      aria-label="Nhập mã xác minh: bấm số hoặc gõ phím số"
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className={`otp-slots${wrong ? ' is-wrong' : ''}`}>
        {digits.map((d, i) => (
          <button
            key={i}
            ref={(el) => (slotRefs.current[i] = el)}
            type="button"
            tabIndex={-1}
            className={`otp-slot${d ? ' is-filled' : ''}${i === active && !drag ? ' is-next' : ''}${aim?.slot === i ? ' is-aimed' : ''}`}
            onClick={() => knockOut(i)}
            aria-label={d ? `Ô ${i + 1}: ${d}, bấm để bắn rơi` : `Ô ${i + 1}: trống`}
          >
            {d && (
              <span key={pops[i]} className="otp-egg">
                {d}
              </span>
            )}
          </button>
        ))}
      </div>

      <svg className="otp-aim" aria-hidden="true">
        {aim && <line x1={drag.start.x} y1={drag.start.y} x2={aim.x} y2={aim.y} />}
      </svg>

      <div className="otp-balls">
        {DIGITS.map((d) => (
          <button
            key={d}
            ref={(el) => (ballRefs.current[d] = el)}
            type="button"
            className={`otp-ball${drag?.digit === d ? ' is-held' : ''}`}
            disabled={blocked}
            onPointerDown={onPointerDown(d)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
            // Chỉ nhận click từ bàn phím (Enter/Space); chuột và cảm ứng đã xử lý ở pointer
            onClick={(e) => e.detail === 0 && shoot(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {drag?.moved && (
        <span
          className="otp-ball otp-flying is-dragged"
          style={{ transform: `translate(${drag.pos.x}px, ${drag.pos.y}px) translate(-50%, -50%)` }}
          aria-hidden="true"
        >
          {drag.digit}
        </span>
      )}

      {flights.map((f) => (
        <Flight key={f.id} flight={f} onLand={onLand} />
      ))}
    </div>
  );
}
