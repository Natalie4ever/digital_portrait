import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import AdminUsers from './pages/AdminUsers';
import AdminLogs from './pages/AdminLogs';
import AdminSkillTags from './pages/AdminSkillTags';
import AdminProfiles from './pages/AdminProfiles';
import AdminProfileView from './pages/AdminProfileView';
import HomeVisits from './pages/HomeVisits';
import HomeVisitForm from './pages/HomeVisitForm';
import HomeVisitDetail from './pages/HomeVisitDetail';

function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}>加载中...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="profile" element={<Profile />} />
        <Route path="home-visits" element={<HomeVisits />} />
        <Route path="home-visits/new" element={<HomeVisitForm />} />
        <Route path="home-visits/:id" element={<HomeVisitDetail />} />
        <Route path="home-visits/:id/edit" element={<HomeVisitForm />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="admin/users" element={<PrivateRoute adminOnly><AdminUsers /></PrivateRoute>} />
        <Route path="admin/profiles" element={<PrivateRoute><AdminProfiles /></PrivateRoute>} />
        <Route path="admin/profile-view/:ehr_no" element={<PrivateRoute><AdminProfileView /></PrivateRoute>} />
        <Route path="admin/logs" element={<PrivateRoute adminOnly><AdminLogs /></PrivateRoute>} />
        <Route path="admin/skill-tags" element={<PrivateRoute adminOnly><AdminSkillTags /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const antdTheme = {
  token: {
    colorPrimary: '#D05A6E',
    colorPrimaryHover: '#BA4A5B',
    colorPrimaryActive: '#A03D48',
  },
};

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
