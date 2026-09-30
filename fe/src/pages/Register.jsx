import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import AuthLayout, { useMascotMood } from '../AuthLayout';
import GoogleButton from '../GoogleButton';
import PasswordInput from '../PasswordInput';

export default function Register() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const { mood, shakeKey, bind, onVisibleChange, shake } = useMascotMood();
  const [form, setForm] = useState({ email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const fail = (message) => {
    setError(message);
    shake();
  };

  const finish = (data) => {
    saveSession(data);
    navigate('/', { replace: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      fail('Mật khẩu nhập lại không khớp');
      return;
    }
    setSubmitting(true);
    try {
      const { email, phone, password } = form;
      finish(await api('/api/auth/register', { method: 'POST', body: { email, phone, password } }));
    } catch (err) {
      fail(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout mood={mood} shakeKey={shakeKey}>
      <h1>Tạo tài khoản</h1>
      <p className="lead">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>

      <GoogleButton text="signup_with" onSuccess={finish} onError={fail} />

      <div className="divider"><span>hoặc dùng email</span></div>

      <form onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" value={form.email} onChange={onChange} autoComplete="email" placeholder="ban@congty.vn" required {...bind('email')} />
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
        <p className="hint">Mật khẩu tối thiểu 6 ký tự.</p>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </button>
      </form>
    </AuthLayout>
  );
}
