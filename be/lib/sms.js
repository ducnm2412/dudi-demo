// Gửi SMS qua nhà cung cấp chọn bằng biến SMS_PROVIDER:
// - console (mặc định): không gửi thật, in nội dung ra log server để thử nghiệm
// - twilio: gửi thật qua Twilio (cần TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)
// Muốn dùng nhà cung cấp khác (eSMS, SpeedSMS...), thêm một hàm vào PROVIDERS.

export function smsProvider() {
  return process.env.SMS_PROVIDER || 'console';
}

// "0912345678" -> "+84912345678"
function toE164(phone) {
  return `+84${phone.slice(1)}`;
}

const PROVIDERS = {
  async console(phone, text) {
    console.log(`[SMS -> ${phone}] ${text}`);
  },

  async twilio(phone, text) {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
    if (!sid || !token || !from) throw new Error('Thiếu cấu hình Twilio');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: toE164(phone), From: from, Body: text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Twilio lỗi', res.status, detail);
      throw new Error('Không gửi được SMS');
    }
  },
};

export async function sendSms(phone, text) {
  const send = PROVIDERS[smsProvider()];
  if (!send) throw new Error(`SMS_PROVIDER không hợp lệ: ${smsProvider()}`);
  await send(phone, text);
}
