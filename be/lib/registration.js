import { normalizePhone, PHONE_RE } from './otp';
import User from '@/models/User';

const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

// Kiểm tra thông tin đăng ký. Trả về { error, status } nếu không hợp lệ, hoặc { username, phone, password }.
export async function validateSignup(body, { requirePhone = true } = {}) {
  const username = String(body.username || '').trim().toLowerCase();
  const phone = normalizePhone(body.phone);
  const password = String(body.password || '');

  if (!USERNAME_RE.test(username)) {
    return { status: 400, error: 'Tên đăng nhập 3–30 ký tự, chỉ gồm chữ thường, số, "_" hoặc "."' };
  }
  if (requirePhone && !PHONE_RE.test(phone)) {
    return { status: 400, error: 'Số điện thoại không hợp lệ' };
  }
  if (password.length < 6) {
    return { status: 400, error: 'Mật khẩu tối thiểu 6 ký tự' };
  }

  const or = [{ username }];
  if (requirePhone) or.push({ phone });
  const existed = await User.findOne({ $or: or });
  if (existed) {
    return { status: 409, error: existed.username === username ? 'Tên đăng nhập đã được sử dụng' : 'Số điện thoại đã được sử dụng' };
  }

  return { username, phone, password };
}
