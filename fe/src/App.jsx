import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Đang tải...</p>;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Đang tải...</p>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
