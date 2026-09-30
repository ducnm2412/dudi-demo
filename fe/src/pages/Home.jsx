import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../AuthContext';
import Logo from '../Logo';
import Drawer from '../portal/Drawer';
import Fingerprint from '../portal/Fingerprint';
import Icon from '../portal/Icon';
import { AttendancePanel, NotificationsPanel, ProfilePanel, SoonPanel, TasksPanel } from '../portal/panels';
import { fmtDuration, fmtTime, greeting, initials } from '../portal/format';
import { useNow, usePortal } from '../portal/usePortal';
import '../portal/portal.css';

// Hai cột menu hai bên nút vân tay
const LEFT = [
  { id: 'profile', label: 'Hồ sơ', icon: 'user' },
  { id: 'attendance', label: 'Chấm công', icon: 'clock' },
  { id: 'projects', label: 'Dự án phụ trách', icon: 'briefcase' },
  { id: 'clients', label: 'Data khách', icon: 'building' },
  { id: 'notifications', label: 'Thông báo', icon: 'bell' },
];
const RIGHT = [
  { id: 'tasks', label: 'Danh sách công việc', icon: 'calendar' },
  { id: 'leave', label: 'Xin nghỉ', icon: 'plane' },
  { id: 'contacts', label: 'Danh bạ', icon: 'contacts' },
  { id: 'process', label: 'Quy trình', icon: 'book' },
  { id: 'settings', label: 'Cài đặt', icon: 'settings' },
];
const LABELS = Object.fromEntries([...LEFT, ...RIGHT].map((i) => [i.id, i.label]));

export default function Home() {
  const { user, token, logout } = useAuth();
  const portal = usePortal(token);
  const now = useNow();
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState({ text: '', key: 0 });
  const [checkError, setCheckError] = useState('');

  const closePanel = useCallback(() => setPanel(null), []);
  const displayName = user.name || user.email.split('@')[0];
  const firstName = displayName.split(' ').pop();

  // Trạng thái chấm công hôm nay
  const { today } = portal;
  let status = 'in';
  let label = 'Nhấn giữ để vào ca';
  let detail = 'Giữ nút khoảng 1 giây cho tới khi vân tay sáng hết.';
  if (!portal.attendanceLoaded) {
    status = 'loading';
    label = 'Đang tải...';
    detail = ' ';
  } else if (today?.checkOut) {
    status = 'done';
    label = 'Đã xong ca hôm nay';
    detail = `${fmtTime(today.checkIn)} đến ${fmtTime(today.checkOut)}, tổng ${fmtDuration(new Date(today.checkOut) - new Date(today.checkIn))}`;
  } else if (today) {
    status = 'working';
    label = 'Nhấn giữ để kết thúc ca';
    detail = `Vào ca lúc ${fmtTime(today.checkIn)}, đã làm ${fmtDuration(now - new Date(today.checkIn))}`;
  }
  if (checkError) detail = checkError;

  const onCheck = async () => {
    setCheckError('');
    try {
      const data = await portal.check();
      const at = fmtTime(data.action === 'checkIn' ? data.today.checkIn : data.today.checkOut);
      setToast((t) => ({ text: data.action === 'checkIn' ? `Đã vào ca lúc ${at}` : `Đã kết thúc ca lúc ${at}`, key: t.key + 1 }));
    } catch (err) {
      setCheckError(err.message);
    }
  };

  // Thông báo sinh từ dữ liệu thật
  const hour = now.getHours() + now.getMinutes() / 60;
  const pending = portal.tasks.filter((t) => !t.done).length;
  const notices = useMemo(() => {
    const list = [];
    if (portal.attendanceLoaded && !today && hour >= 8.5) {
      list.push({ id: 'no-checkin', text: 'Bạn chưa vào ca hôm nay. Nhấn giữ nút vân tay ở trang chủ để chấm công.' });
    }
    if (today && !today.checkOut && hour >= 17.5) {
      list.push({ id: 'no-checkout', text: 'Đã qua 17:30. Nhớ kết thúc ca trước khi về.' });
    }
    if (pending) {
      list.push({ id: 'tasks', text: `Bạn còn ${pending} công việc chưa xong.`, action: { panel: 'tasks', label: 'Xem công việc' } });
    }
    return list;
  }, [portal.attendanceLoaded, today, hour, pending]);

  const renderPanel = () => {
    switch (panel) {
      case 'profile':
        return <ProfilePanel user={user} />;
      case 'attendance':
        return <AttendancePanel loadAttendance={portal.loadAttendance} now={now} />;
      case 'tasks':
        return <TasksPanel tasks={portal.tasks} loaded={portal.tasksLoaded} addTask={portal.addTask} toggleTask={portal.toggleTask} removeTask={portal.removeTask} />;
      case 'notifications':
        return <NotificationsPanel notices={notices} onOpen={setPanel} />;
      default:
        return <SoonPanel name={LABELS[panel]} />;
    }
  };

  const menuItem = (item, i) => (
    <li key={item.id} style={{ '--i': i }}>
      <button type="button" className="menu-item" onClick={() => setPanel(item.id)}>
        <Icon name={item.icon} size={26} strokeWidth={1.8} />
        <span>{item.label}</span>
        {item.id === 'tasks' && pending > 0 && <span className="count" aria-label={`${pending} việc chưa xong`}>{pending}</span>}
        {item.id === 'notifications' && notices.length > 0 && <span className="count" aria-label={`${notices.length} thông báo`}>{notices.length}</span>}
      </button>
    </li>
  );

  return (
    <div className="portal">
      <header className="portal-top">
        <Logo size={40} />
        <div className="portal-actions">
          <button type="button" className="icon-btn bell" onClick={() => setPanel('notifications')} aria-label={`Thông báo, ${notices.length} mục mới`}>
            <Icon name="bell" size={22} />
            {notices.length > 0 && <span className="dot" />}
          </button>
          <button type="button" className="user-chip" onClick={() => setPanel('profile')}>
            {user.avatar ? (
              <img src={user.avatar} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="initials">{initials(displayName)}</span>
            )}
            <span className="user-chip-text">
              <strong>{displayName}</strong>
              <span>{user.email}</span>
            </span>
          </button>
        </div>
      </header>

      <main className="portal-main">
        <section className="clock" aria-label="Giờ hiện tại">
          <p className="clock-greet">{greeting(now.getHours())}, {firstName}.</p>
          <p className="clock-time">
            <time dateTime={now.toISOString()}>
              {String(now.getHours()).padStart(2, '0')}
              <span className="colon">:</span>
              {String(now.getMinutes()).padStart(2, '0')}
            </time>
            <span className="clock-sec" aria-hidden="true">{String(now.getSeconds()).padStart(2, '0')}</span>
          </p>
          <p className="clock-date">{now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </section>

        <div className="portal-center">
          <Fingerprint status={status} label={label} detail={detail} onComplete={onCheck} />
        </div>

        {/* Desktop: 2 cột so le hai bên; mobile: gộp thành 1 lưới */}
        <div className="menus">
          <nav className="menu menu-left" aria-label="Tiện ích">
            <ul>{LEFT.map(menuItem)}</ul>
          </nav>
          <nav className="menu menu-right" aria-label="Công việc">
            <ul>{RIGHT.map(menuItem)}</ul>
          </nav>
        </div>
      </main>

      <button type="button" className="logout" onClick={logout}>
        <Icon name="logout" size={18} />
        Đăng xuất
      </button>

      <p className="toast" role="status" key={toast.key}>
        {toast.text}
      </p>

      {panel && (
        <Drawer title={LABELS[panel]} onClose={closePanel}>
          {renderPanel()}
        </Drawer>
      )}
    </div>
  );
}
