import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

// Dữ liệu dùng chung cho trang chủ: chấm công hôm nay và danh sách công việc
export function usePortal(token) {
  const [today, setToday] = useState(null);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  const loadAttendance = useCallback(
    async (month) => {
      const q = month ? `?month=${month}` : '';
      const data = await api(`/api/attendance${q}`, { token });
      setToday(data.today);
      setAttendanceLoaded(true);
      return data;
    },
    [token]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [att, t, ev] = await Promise.all([
          api('/api/attendance', { token }),
          api('/api/tasks', { token }),
          api('/api/events', { token }),
        ]);
        if (cancelled) return;
        setToday(att.today);
        setTasks(t.tasks);
        setEvents(ev.events);
      } catch {
        // Trang vẫn dùng được; lỗi sẽ hiện khi người dùng thao tác
      } finally {
        if (!cancelled) {
          setAttendanceLoaded(true);
          setTasksLoaded(true);
          setEventsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const check = useCallback(async () => {
    const data = await api('/api/attendance/check', { method: 'POST', token });
    setToday(data.today);
    return data;
  }, [token]);

  const addTask = useCallback(
    async (title) => {
      const { task } = await api('/api/tasks', { method: 'POST', body: { title }, token });
      setTasks((list) => [task, ...list]);
    },
    [token]
  );

  const toggleTask = useCallback(
    async (task) => {
      setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
      try {
        await api(`/api/tasks/${task.id}`, { method: 'PATCH', body: { done: !task.done }, token });
      } catch (err) {
        setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
        throw err;
      }
    },
    [token]
  );

  const removeTask = useCallback(
    async (task) => {
      let snapshot;
      setTasks((list) => {
        snapshot = list;
        return list.filter((t) => t.id !== task.id);
      });
      try {
        await api(`/api/tasks/${task.id}`, { method: 'DELETE', token });
      } catch (err) {
        setTasks(snapshot);
        throw err;
      }
    },
    [token]
  );

  const addEvent = useCallback(
    async (data) => {
      const { event } = await api('/api/events', { method: 'POST', body: data, token });
      setEvents((list) => [...list, event].sort((a, b) => a.time.localeCompare(b.time)));
    },
    [token]
  );

  const removeEvent = useCallback(
    async (event) => {
      await api(`/api/events/${event.id}`, { method: 'DELETE', token });
      setEvents((list) => list.filter((e) => e.id !== event.id));
    },
    [token]
  );

  return {
    today,
    attendanceLoaded,
    loadAttendance,
    check,
    tasks,
    tasksLoaded,
    addTask,
    toggleTask,
    removeTask,
    events,
    eventsLoaded,
    addEvent,
    removeEvent,
  };
}

// Đồng hồ cập nhật mỗi giây
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
