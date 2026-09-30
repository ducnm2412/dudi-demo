// Cấu trúc menu bên trái, dùng chung cho sidebar, tìm kiếm và tiêu đề ngăn kéo
export const NAV = [
  { group: null, items: [{ id: 'home', label: 'Trang chủ', icon: 'home' }] },
  {
    group: 'Công việc',
    items: [
      { id: 'tasks', label: 'Công việc', icon: 'checkSquare' },
      { id: 'projects', label: 'Dự án', icon: 'rocket' },
      { id: 'clients', label: 'Khách hàng', icon: 'users' },
      { id: 'calendar', label: 'Lịch', icon: 'calendar' },
    ],
  },
  {
    group: 'Cá nhân',
    items: [
      { id: 'profile', label: 'Hồ sơ', icon: 'user' },
      { id: 'attendance', label: 'Chấm công', icon: 'clock' },
      { id: 'leave', label: 'Xin nghỉ', icon: 'plane' },
    ],
  },
  {
    group: 'Khác',
    items: [
      { id: 'notifications', label: 'Thông báo', icon: 'bell' },
      { id: 'settings', label: 'Cài đặt', icon: 'settings' },
    ],
  },
];

export const NAV_ITEMS = NAV.flatMap((g) => g.items);
export const LABELS = Object.fromEntries(NAV_ITEMS.map((i) => [i.id, i.label]));
