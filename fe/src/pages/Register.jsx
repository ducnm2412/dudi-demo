import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import AuthLayout, { useMascotMood } from '../AuthLayout';
import FacebookButton from '../FacebookButton';
import GoogleButton from '../GoogleButton';
import PasswordInput from '../PasswordInput';

// Có cấu hình Firebase thì xác minh SĐT bằng Firebase Phone Auth,
// không thì dùng OTP do BE tự gửi (console/Twilio)
const FIREBASE_ENABLED = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID);
const RECAPTCHA_ID = 'recaptcha-container';
const RESEND_SECONDS = 60;

const maskPhone = (p) => `${p.slice(0, 4)} *** ${p.slice(-3)}`;

// Đếm ngược tới lúc được gửi lại mã
function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, setLeft];
}

export default function Register() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const { mood, shakeKey, bind, onVisibleChange, shake } = useMascotMood();
  const [form, setForm] = useState({ username: '', phone: '', password: '', confirm: '' });
  const [otp, setOtp] = useState(null); // { phone, maskedPhone, devCode? } khi đang ở bước nhập mã
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useCountdown();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const confirmation = useRef(null); // kết quả signInWithPhoneNumber của Firebase

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const fail = useCallback(
    (message) => {
      setError(message);
      shake();
    },
    [shake]
  );

  const finish = (data) => {
    saveSession(data);
    navigate('/', { replace: true });
  };

  const run = async (fn, onError) => {
    setError('');
    setSubmitting(true);
    try {
      await fn();
    } catch (err) {
      if (err.data?.retryAfter) setResendIn(err.data.retryAfter);
      onError?.();
      fail(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const firebaseSend = async (phone) => {
    const { sendCode } = await import('../phoneAuth');
    confirmation.current = await sendCode(phone, RECAPTCHA_ID);
    setOtp({ phone, maskedPhone: maskPhone(phone) });
    setCode('');
    setResendIn(RESEND_SECONDS);
  };

  // Bước 1: kiểm tra thông tin rồi gửi mã tới SĐT
  const onStart = (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      fail('Mật khẩu nhập lại không khớp');
      return;
    }
    run(async () => {
      const { username, phone, password } = form;
      if (FIREBASE_ENABLED) {
        const checked = await api('/api/auth/register/check', { method: 'POST', body: { username, phone, password } });
        await firebaseSend(checked.phone);
      } else {
        const data = await api('/api/auth/register', { method: 'POST', body: { username, phone, password } });
        setOtp(data);
        setCode('');
        setResendIn(data.resendIn);
      }
    });
  };

  // Bước 2: nhập mã để tạo tài khoản. Mã sai thì xoá ô để gõ lại ngay.
  const verify = (value) =>
    run(
      async () => {
        if (FIREBASE_ENABLED) {
          const { confirmCode } = await import('../phoneAuth');
          const idToken = await confirmCode(confirmation.current, value);
          const { username, password } = form;
          finish(await api('/api/auth/register/firebase', { method: 'POST', body: { idToken, username, password } }));
        } else {
          finish(await api('/api/auth/register/verify', { method: 'POST', body: { phone: otp.phone, code: value } }));
        }
      },
      () => setCode('')
    );

  const onVerify = (e) => {
    e.preventDefault();
    verify(code);
  };

  const onCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    if (value.length === 6 && !submitting) verify(value);
  };

  const resend = () =>
    run(async () => {
      if (FIREBASE_ENABLED) {
        await firebaseSend(otp.phone);
      } else {
        const data = await api('/api/auth/register/resend', { method: 'POST', body: { phone: otp.phone } });
        setOtp(data);
        setCode('');
        setResendIn(data.resendIn);
      }
    });

  const otpStep = otp && (
    <>
      <h1>Xác minh số điện thoại</h1>
      <p className="lead">
        Nhập mã 6 số vừa gửi tới <strong>{otp.maskedPhone}</strong>.{' '}
        <button type="button" className="text-btn" onClick={() => { setOtp(null); setError(''); }}>
          Đổi số
        </button>
      </p>

      {otp.devCode && (
        <p className="dev-note">
          Chế độ thử: chưa gửi SMS thật. Mã của bạn là <strong>{otp.devCode}</strong>
        </p>
      )}

      <form onSubmit={onVerify}>
        <label className="field">
          <span>Mã xác minh</span>
          <input
            className="otp-input"
            name="code"
            value={code}
            onChange={onCodeChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="••••••"
            autoFocus
            required
            {...bind('code')}
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="primary" disabled={submitting || code.length !== 6}>
          {submitting ? 'Đang xác minh...' : 'Xác minh và tạo tài khoản'}
        </button>

        <button type="button" className="text-btn resend" onClick={resend} disabled={submitting || resendIn > 0}>
          {resendIn > 0 ? `Gửi lại mã sau ${resendIn} giây` : 'Gửi lại mã'}
        </button>
      </form>
    </>
  );

  const formStep = (
    <>
      <h1>Tạo tài khoản</h1>
      <p className="lead">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>

      <div className="social">
        <GoogleButton text="signup_with" onSuccess={finish} onError={fail} />
        <FacebookButton text="signup" onSuccess={finish} onError={fail} />
      </div>

      <div className="divider"><span>hoặc dùng số điện thoại</span></div>

      <form onSubmit={onStart}>
        <label className="field">
          <span>Tên đăng nhập</span>
          <input name="username" value={form.username} onChange={onChange} autoComplete="username" autoCapitalize="none" spellCheck="false" placeholder="nguyenvana" required {...bind('username')} />
        </label>
        <label className="field">
          <span>Số điện thoại</span>
          <input name="phone" type="tel" value={form.phone} onChange={onChange} autoComplete="tel" placeholder="0912 345 678" required {...bind('phone')} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Mật khẩu</span>
            <PasswordInput name="password" value={form.password} onChange={onChange} autoComplete="new-password" minLength={6} required {...bind('password')} onVisibleChange={onVisibleChange('password')} />
          </label>
          <label className="field">
            <span>Nhập lại mật khẩu</span>
            <PasswordInput name="confirm" value={form.confirm} onChange={onChange} autoComplete="new-password" required {...bind('confirm')} onVisibleChange={onVisibleChange('confirm')} />
          </label>
        </div>
        <p className="hint">Tên đăng nhập gồm chữ thường, số, "_" hoặc ".". Mật khẩu tối thiểu 6 ký tự. Chúng tôi sẽ gửi mã xác minh tới số điện thoại của bạn.</p>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Đang gửi mã...' : 'Tiếp tục'}
        </button>
      </form>
    </>
  );

  return (
    <AuthLayout mood={mood} shakeKey={shakeKey}>
      {otp ? otpStep : formStep}
      {/* reCAPTCHA ẩn của Firebase: giữ cố định ở đây để không bị gỡ khi chuyển bước */}
      <div id={RECAPTCHA_ID} />
    </AuthLayout>
  );
}
