import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import AuthLayout, { useMascotMood } from '../AuthLayout';
import GoogleButton from '../GoogleButton';
import PasswordInput from '../PasswordInput';

export default function Login() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const { mood, shakeKey, bind, onVisibleChange, shake } = useMascotMood();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const fail = (message) => {
    setError(message);
    shake();
  };

  const finish = (data) => {
    saveSession(data, remember);
    navigate('/', { replace: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      finish(await api('/api/auth/login', { method: 'POST', body: { ...form, remember } }));
    } catch (err) {
      fail(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout mood={mood} shakeKey={shakeKey}>
      <h1>Đăng nhập</h1>
      <p className="lead">
        Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
      </p>

      <GoogleButton text="signin_with" remember={remember} onSuccess={finish} onError={fail} />

      <div className="divider"><span>hoặc dùng email</span></div>

      <form onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" value={form.email} onChange={onChange} autoComplete="email" placeholder="nguyenvana@gmail.com" required {...bind('email')} />
        </label>
        <label className="field">
          <span>Mật khẩu</span>
          <PasswordInput name="password" value={form.password} onChange={onChange} autoComplete="current-password" required {...bind('password')} onVisibleChange={onVisibleChange('password')} />
        </label>

        <label className="checkbox">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Ghi nhớ đăng nhập
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </AuthLayout>
  );
}
