import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

// Mini game nhập OTP kiểu bắn trứng: kéo quả số lùi về sau như ná cao su rồi thả để bắn lên.
// Từ ô 3 trở đi, ô còn trống chạy qua lại, ô sau nhanh hơn ô trước. Trượt thì bắn lại.
// Chỉ khi đủ 6 ô mới gửi mã đi kiểm tra; FE không biết mã đúng nên không báo đúng/sai từng ô.
const LENGTH = 6;
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const EMPTY = Array(LENGTH).fill('');
const SPEEDS = [0, 0, 1.6, 2.3, 3.1, 4]; // tốc độ góc (rad/s) của từng ô; 0 là đứng yên
const SWAY = 0.8; // biên độ chạy ngang, tính theo khoảng cách giữa hai ô
const BOB = 10; // biên độ nhấp nhô dọc (px)
const MIN_PULL = 18; // kéo ít hơn mức này thì không bắn
const MAX_PULL = 80;
const BALL_R = 18; // bán kính va chạm của quả số đang bay
const WRONG_MS = 600;

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Tâm của phần tử theo layout gốc (không tính transform), trong hệ toạ độ khung game
const homeOf = (el) => ({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 });

// Lực kéo: vector từ tâm quả số tới ngón tay, giới hạn độ dài
function pullOf(drag) {
  const dx = drag.pos.x - drag.anchor.x;
  const dy = drag.pos.y - drag.anchor.y;
  const len = Math.hypot(dx, dy);
  const k = len > MAX_PULL ? MAX_PULL / len : 1;
  return { x: dx * k, y: dy * k, len: Math.min(len, MAX_PULL) };
}

// Chỉ bắn khi kéo lùi đủ xa và hướng bắn đi lên
const canFire = (pull) => pull.len >= MIN_PULL && pull.y > 4;

export default function OtpShooter({ ref, disabled, onChange, onFocus, onBlur }) {
  const box = useRef(null);
  const layer = useRef(null);
  const slotRefs = useRef([]);
  const ballRefs = useRef({});
  const shots = useRef([]); // quả số đang bay, cập nhật trực tiếp trên DOM mỗi khung hình
  const offsets = useRef(EMPTY.map(() => ({ x: 0, y: 0, amp: 0 })));
  const timers = useRef([]);
  const latest = useRef({ onChange, digits: EMPTY, still: false });

  const [digits, setDigits] = useState(EMPTY);
  const [pops, setPops] = useState(() => Array(LENGTH).fill(0));
  const [flying, setFlying] = useState(0);
  const [drag, setDrag] = useState(null); // { digit, anchor, pos }
  const [wrong, setWrong] = useState(false);

  const blocked = disabled || wrong;

  // Vòng lặp chạy ngoài React nên đọc giá trị mới nhất qua ref
  useLayoutEffect(() => {
    latest.current = { onChange, digits, still: blocked };
  });

  // Đủ 6 ô và không còn quả nào đang bay thì báo mã cho form, còn thiếu thì báo chuỗi rỗng
  const value = flying === 0 && digits.every(Boolean) ? digits.join('') : '';
  useEffect(() => {
    latest.current.onChange?.(value);
  }, [value]);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    box.current?.focus({ preventScroll: true });
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // Vòng lặp game: di chuyển các ô trống và các quả số đang bay
  useEffect(() => {
    const reduce = reduceMotion();
    let frame;
    let last = performance.now();

    const finish = (shot, slot) => {
      shots.current = shots.current.filter((s) => s !== shot);
      setFlying((n) => n - 1);
      if (slot == null) {
        // Trượt: mờ dần rồi biến mất
        shot.el.classList.add('is-missed');
        setTimeout(() => shot.el.remove(), 250);
        return;
      }
      shot.el.remove();
      setDigits((d) => d.map((v, i) => (i === slot ? shot.digit : v)));
      setPops((p) => p.map((n, i) => (i === slot ? n + 1 : n)));
    };

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;
      const { digits: filled, still } = latest.current;
      const width = box.current.clientWidth;
      const slots = slotRefs.current;
      const spacing = slots[1].offsetLeft - slots[0].offsetLeft;

      // Ô trống có tốc độ thì chạy theo hình elip; có số rồi thì từ từ về chỗ cũ
      const centers = slots.map((el, i) => {
        const o = offsets.current[i];
        const goal = SPEEDS[i] && !filled[i] && !still && !reduce ? 1 : 0;
        o.amp += (goal - o.amp) * Math.min(1, dt * 5);
        const w = SPEEDS[i];
        o.x = o.amp * spacing * SWAY * Math.sin(w * t + i * 1.7);
        o.y = o.amp * BOB * Math.sin(2 * w * t + i);
        el.style.transform = `translate(${o.x}px, ${o.y}px)`;
        const home = homeOf(el);
        return { x: home.x + o.x, y: home.y + o.y, r: el.offsetWidth / 2 };
      });

      for (const shot of [...shots.current]) {
        if (shot.slot != null) {
          // Bắn bằng bàn phím: quả số tự lái về ô đã chọn
          const c = centers[shot.slot];
          const dx = c.x - shot.x;
          const dy = c.y - shot.y;
          const dist = Math.hypot(dx, dy);
          const step = shot.speed * dt;
          if (dist <= step) {
            finish(shot, shot.slot);
            continue;
          }
          shot.x += (dx / dist) * step;
          shot.y += (dy / dist) * step;
        } else {
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          // Dội vào tường hai bên như game bắn trứng
          if (shot.x < BALL_R) {
            shot.x = BALL_R;
            shot.vx = Math.abs(shot.vx);
          } else if (shot.x > width - BALL_R) {
            shot.x = width - BALL_R;
            shot.vx = -Math.abs(shot.vx);
          }
          // Trúng ô gần nhất trong tầm va chạm
          let hit = -1;
          let best = Infinity;
          centers.forEach((c, i) => {
            const d = Math.hypot(c.x - shot.x, c.y - shot.y);
            if (d < c.r + BALL_R * 0.6 && d < best) {
              best = d;
              hit = i;
            }
          });
          if (hit >= 0) {
            finish(shot, hit);
            continue;
          }
          if (shot.y < -BALL_R * 2 || shot.y > box.current.clientHeight + BALL_R * 2) {
            finish(shot, null);
            continue;
          }
        }
        shot.el.style.transform = `translate(${shot.x}px, ${shot.y}px) translate(-50%, -50%)`;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      shots.current.forEach((s) => s.el.remove());
      shots.current = [];
    };
  }, []);

  // Tạo quả số bay. Có `slot` thì tự lái về ô đó, không thì bay thẳng theo vận tốc
  const launch = (digit, from, motion) => {
    const el = document.createElement('span');
    el.className = 'otp-ball otp-flying';
    el.textContent = digit;
    el.setAttribute('aria-hidden', 'true');
    el.style.transform = `translate(${from.x}px, ${from.y}px) translate(-50%, -50%)`;
    layer.current.append(el);
    shots.current.push({ el, digit, x: from.x, y: from.y, ...motion });
    setFlying((n) => n + 1);
  };

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
    },
  }));

  const isFree = (i) => !digits[i] && !shots.current.some((s) => s.slot === i);

  // Bàn phím và dán mã: bắn thẳng vào ô trống kế tiếp, không cần ngắm
  const autoShoot = (digit, slot = digits.findIndex((_, i) => isFree(i))) => {
    if (blocked || slot < 0) return;
    launch(digit, homeOf(ballRefs.current[digit]), { slot, speed: 1400 });
  };

  // Chạm vào ô đã có số: bắn rơi số đó để bắn lại
  const knockOut = (slot) => {
    if (blocked || !digits[slot]) return;
    setDigits((d) => d.map((v, i) => (i === slot ? '' : v)));
  };

  const pointerPos = (e) => {
    const rect = box.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (digit) => (e) => {
    if (blocked || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    box.current.focus({ preventScroll: true });
    setDrag({ digit, anchor: homeOf(e.currentTarget), pos: pointerPos(e) });
  };

  const onPointerMove = (e) => {
    if (drag) setDrag({ ...drag, pos: pointerPos(e) });
  };

  // Thả tay: bắn theo hướng ngược với hướng kéo, kéo càng xa bay càng nhanh
  const onPointerUp = () => {
    if (!drag) return;
    const pull = pullOf(drag);
    if (!blocked && canFire(pull)) {
      const speed = 700 + (pull.len / MAX_PULL) * 700;
      launch(drag.digit, drag.anchor, { vx: (-pull.x / pull.len) * speed, vy: (-pull.y / pull.len) * speed });
    }
    setDrag(null);
  };

  const onKeyDown = (e) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      autoShoot(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const lastFilled = digits.findLastIndex(Boolean);
      if (lastFilled >= 0) knockOut(lastFilled);
    }
  };

  const onPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted || blocked) return;
    e.preventDefault();
    const free = digits.map((_, i) => i).filter(isFree);
    [...pasted].slice(0, free.length).forEach((d, i) => later(() => autoShoot(d, free[i]), i * 90));
  };

  // Ná cao su: quả số bị kéo, dây chun và đường ngắm theo hướng bắn
  let sling = null;
  if (drag) {
    const pull = pullOf(drag);
    const ball = { x: drag.anchor.x + pull.x, y: drag.anchor.y + pull.y };
    const ready = canFire(pull);
    const reach = 120 + pull.len * 2;
    sling = {
      ball,
      ready,
      aim: ready && {
        x: drag.anchor.x - (pull.x / pull.len) * reach,
        y: drag.anchor.y - (pull.y / pull.len) * reach,
      },
    };
  }

  return (
    <div
      ref={box}
      className={`otp-game${blocked ? ' is-blocked' : ''}`}
      tabIndex={0}
      role="group"
      aria-label="Nhập mã xác minh: kéo quả số lùi xuống rồi thả để bắn, hoặc gõ phím số"
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className={`otp-slots${wrong ? ' is-wrong' : ''}`}>
        {digits.map((d, i) => (
          <div key={i} className="otp-cell">
            <button
              ref={(el) => (slotRefs.current[i] = el)}
              type="button"
              tabIndex={-1}
              className={`otp-slot${d ? ' is-filled' : ''}${SPEEDS[i] && !d ? ' is-moving' : ''}`}
              onClick={() => knockOut(i)}
              aria-label={d ? `Ô ${i + 1}: ${d}, bấm để bắn rơi` : `Ô ${i + 1}: trống`}
            >
              {d ? (
                <span key={pops[i]} className="otp-egg">
                  {d}
                </span>
              ) : (
                <span className="otp-slot-no">{i + 1}</span>
              )}
            </button>
          </div>
        ))}
      </div>

      <svg className="otp-aim" aria-hidden="true">
        {sling && (
          <>
            <line className="otp-band" x1={drag.anchor.x} y1={drag.anchor.y} x2={sling.ball.x} y2={sling.ball.y} />
            {sling.aim && <line className="otp-guide" x1={drag.anchor.x} y1={drag.anchor.y} x2={sling.aim.x} y2={sling.aim.y} />}
          </>
        )}
      </svg>

      <div className="otp-balls">
        {DIGITS.map((d) => (
          <button
            key={d}
            ref={(el) => (ballRefs.current[d] = el)}
            type="button"
            tabIndex={-1}
            className={`otp-ball${drag?.digit === d ? ' is-held' : ''}`}
            disabled={blocked}
            onPointerDown={onPointerDown(d)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
            aria-label={`Số ${d}`}
          >
            {d}
          </button>
        ))}
      </div>

      {sling && (
        <span
          className={`otp-ball otp-flying is-dragged${sling.ready ? ' is-ready' : ''}`}
          style={{ transform: `translate(${sling.ball.x}px, ${sling.ball.y}px) translate(-50%, -50%)` }}
          aria-hidden="true"
        >
          {drag.digit}
        </span>
      )}

      {/* Lớp chứa quả số đang bay, do vòng lặp game tự thêm/xoá */}
      <div ref={layer} className="otp-layer" />
    </div>
  );
}
