import { useState } from 'react';

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.5" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m2 2 20 20" />
  </svg>
);

// onFocus/onBlur gắn vào khung bao để focus vẫn được tính khi chuyển sang nút con mắt
export default function PasswordInput({ onFocus, onBlur, onVisibleChange, ...props }) {
  const [visible, setVisible] = useState(false);

  const toggle = () => {
    setVisible(!visible);
    onVisibleChange?.(!visible);
  };

  return (
    <div className="password-field" onFocus={onFocus} onBlur={onBlur}>
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="toggle-password"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={visible}
        title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
