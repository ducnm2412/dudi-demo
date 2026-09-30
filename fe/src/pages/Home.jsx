import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../AuthContext';
import { CheckCard, FooterBanner, Hero, NotifCard, ProgressCard, PromoCard, QuickCards, ScheduleCard } from '../dashboard/cards';
import { LABELS } from '../dashboard/nav';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import Drawer from '../portal/Drawer';
import { fmtTime, greeting } from '../portal/format';
import { AttendancePanel, EventsPanel, NotificationsPanel, ProfilePanel, SoonPanel, TasksPanel } from '../portal/panels';
import { useNow, usePortal } from '../portal/usePortal';
import '../dashboard/dashboard.css';

const isToday = (date, now) => new Date(date).toDateString() === now.toDateString();

export default function Home() {
  const { user, token, logout } = useAuth();
  const portal = usePortal(token);
  const now = useNow();
  const [panel, setPanel] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [toast, setToast] = useState({ text: '', key: 0 });

  const closePanel = useCallback(() => setPanel(null), []);
  const closeSide = useCallback(() => setSideOpen(false), []);
  const displayName = user.name || user.username || (user.email || '').split('@')[0] || 'bạn';
  const { today, tasks, events } = portal;
  const pending = tasks.filter((t) => !t.done).length;

  const onCheck = async () => {
    setBusy(true);
    setCheckError('');
    try {
      const data = await portal.check();
      const at = fmtTime(data.action === 'checkIn' ? data.today.checkIn : data.today.checkOut);
      setToast((t) => ({ text: data.action === 'checkIn' ? `Đã check in lúc ${at}` : `Đã check out lúc ${at}`, key: t.key + 1 }));
    } catch (err) {
      setCheckError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Thông báo sinh từ dữ liệu thật. alert = cần người dùng làm gì đó (đếm trên chuông)
  const minuteKey = `${now.getHours()}:${now.getMinutes()}`;
  const notices = useMemo(() => {
    const [h, m] = minuteKey.split(':').map(Number);
    const mins = h * 60 + m;
    const list = [];
    if (portal.attendanceLoaded && !today && mins >= 8 * 60 + 30) {
      list.push({ id: 'no-checkin', alert: true, text: 'Bạn chưa check in hôm nay', time: 'Hôm nay', action: { panel: 'attendance' } });
    }
    if (today && !today.checkOut && mins >= 17 * 60 + 30) {
      list.push({ id: 'no-checkout', alert: true, text: 'Đã qua 17:30, nhớ check out trước khi về', time: 'Hôm nay', action: { panel: 'attendance' } });
    }
    events
      .filter((e) => {
        const [eh, em] = e.time.split(':').map(Number);
        const diff = eh * 60 + em - mins;
        return diff >= 0 && diff <= 60;
      })
      .forEach((e) => list.push({ id: `ev-${e.id}`, alert: true, text: `Sắp tới: ${e.title}`, time: e.time, action: { panel: 'calendar' } }));
    if (pending) {
      const latest = tasks.find((t) => !t.done);
      const time = latest && isToday(latest.createdAt, new Date()) ? fmtTime(latest.createdAt) : 'Trước đó';
      list.push({ id: 'tasks', alert: true, text: `Bạn còn ${pending} công việc chưa xong`, time, action: { panel: 'tasks', label: 'Xem công việc' } });
    }
    if (today?.checkOut) list.push({ id: 'out', text: 'Bạn đã hoàn thành ca hôm nay', time: fmtTime(today.checkOut), action: { panel: 'attendance' } });
    if (today) list.push({ id: 'in', text: `Bạn đã check in lúc ${fmtTime(today.checkIn)}`, time: fmtTime(today.checkIn), action: { panel: 'attendance' } });
    return list;
  }, [minuteKey, portal.attendanceLoaded, today, events, tasks, pending]);
  const alerts = notices.filter((n) => n.alert).length;

  const quickItems = [
    { id: 'tasks', label: 'Công việc', icon: 'clipboard', sub: pending ? `${pending} việc đang chờ` : tasks.length ? 'Đã xong hết' : 'Chưa có việc nào' },
    { id: 'projects', label: 'Dự án', icon: 'rocket', sub: 'Chưa có dự án' },
    { id: 'calendar', label: 'Lịch', icon: 'calendar', sub: events.length ? `${events.length} sự kiện hôm nay` : 'Hôm nay trống lịch' },
    { id: 'leave', label: 'Xin nghỉ', icon: 'plane', sub: 'Chưa có đơn nghỉ' },
  ];

  const renderPanel = () => {
    switch (panel) {
      case 'profile':
        return <ProfilePanel user={user} />;
      case 'attendance':
        return <AttendancePanel loadAttendance={portal.loadAttendance} now={now} />;
      case 'tasks':
        return <TasksPanel tasks={tasks} loaded={portal.tasksLoaded} addTask={portal.addTask} toggleTask={portal.toggleTask} removeTask={portal.removeTask} />;
      case 'calendar':
        return <EventsPanel events={events} loaded={portal.eventsLoaded} addEvent={portal.addEvent} removeEvent={portal.removeEvent} />;
      case 'notifications':
        return <NotificationsPanel notices={notices} onOpen={setPanel} />;
      default:
        return <SoonPanel name={LABELS[panel]} />;
    }
  };

  const toggle = (t) => portal.toggleTask(t).catch((err) => setToast((s) => ({ text: err.message, key: s.key + 1 })));

  return (
    <div className="dash">
      <Sidebar open={sideOpen} onClose={closeSide} onOpen={setPanel} onLogout={logout} />

      <div className="dash-main">
        <TopBar
          user={user}
          displayName={displayName}
          alerts={alerts}
          tasks={tasks}
          events={events}
          onOpen={setPanel}
          onMenu={() => setSideOpen(true)}
          onLogout={logout}
        />

        <div className="dash-grid">
          <div className="col-main">
            <Hero greetingText={greeting(now.getHours())} displayName={displayName} now={now} />
            <QuickCards items={quickItems} onOpen={setPanel} />
            <div className="row-split">
              <ProgressCard tasks={tasks} loaded={portal.tasksLoaded} onToggle={toggle} onOpen={setPanel} />
              <ScheduleCard events={events} loaded={portal.eventsLoaded} onOpen={setPanel} />
            </div>
          </div>

          <div className="col-side">
            <CheckCard loaded={portal.attendanceLoaded} today={today} now={now} busy={busy} error={checkError} onCheck={onCheck} />
            <NotifCard notices={notices} onOpen={setPanel} />
            <PromoCard />
          </div>

          <FooterBanner />
        </div>
      </div>

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
