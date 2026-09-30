import { GoogleLogin } from '@react-oauth/google';
import { api } from './api';

const hasClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

// text: 'signup_with' | 'signin_with'
export default function GoogleButton({ text, remember = true, onSuccess, onError }) {
  if (!hasClientId) {
    return <p className="hint">Chưa cấu hình VITE_GOOGLE_CLIENT_ID nên chưa dùng được Google.</p>;
  }

  return (
    <div className="google-btn">
      <GoogleLogin
        text={text}
        theme="outline"
        shape="rectangular"
        width="300"
        locale="vi"
        onSuccess={async ({ credential }) => {
          try {
            onSuccess(await api('/api/auth/google', { method: 'POST', body: { credential, remember } }));
          } catch (err) {
            onError(err.message);
          }
        }}
        onError={() => onError('Đăng nhập Google thất bại')}
      />
    </div>
  );
}
