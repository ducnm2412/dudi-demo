// Ngày làm việc tính theo giờ Việt Nam, dạng "YYYY-MM-DD"
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function vnDateKey(date = new Date()) {
  return dayFormat.format(date);
}

export function vnMonthKey(date = new Date()) {
  return vnDateKey(date).slice(0, 7);
}
