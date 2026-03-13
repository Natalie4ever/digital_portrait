import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Layout as AntLayout, Menu, Dropdown, Button, Space } from 'antd';
import { UserOutlined, KeyOutlined, TeamOutlined, FileTextOutlined, TagsOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Content } = AntLayout;
const IDLE_MS = 60 * 60 * 1000;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const onActivity = () => { lastActivity.current = Date.now(); };
    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);
    const t = setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_MS) {
        logout();
        navigate('/login', { replace: true });
        clearInterval(t);
      }
    }, 60000);
    return () => {
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
      clearInterval(t);
    };
  }, [logout, navigate]);

  if (!user) return null;

  const menuItems = [
    { key: '/', label: <Link to="/">首页</Link> },
    { key: '/profile', label: <Link to="/profile">我的档案</Link> },
    ...(user.role === 'admin' ? [
      { key: '/admin/users', label: <Link to="/admin/users">用户管理</Link> },
      { key: '/admin/logs', label: <Link to="/admin/logs">操作日志</Link> },
      { key: '/admin/skill-tags', label: <Link to="/admin/skill-tags">技能标签</Link> },
    ] : []),
  ];

  const userMenu = {
    items: [
      { key: 'pwd', icon: <KeyOutlined />, label: <Link to="/change-password">修改密码</Link> },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出', onClick: () => { logout(); navigate('/login'); } },
    ],
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/" style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>员工数字画像系统</Link>
          <Menu theme="dark" mode="horizontal" selectedKeys={[location.pathname]} items={menuItems} style={{ flex: 1, minWidth: 0 }} />
        </div>
        <Dropdown menu={userMenu} placement="bottomRight">
          <Button type="text" style={{ color: '#fff' }} icon={<UserOutlined />}>
            {user.name}（{user.ehr_no}）
          </Button>
        </Dropdown>
      </Header>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Outlet />
        </div>
      </Content>
    </AntLayout>
  );
}
