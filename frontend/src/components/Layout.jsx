import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Layout as AntLayout, Menu, Dropdown, Button } from 'antd';
import {
  UserOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuOutlined,
  HomeOutlined,
  IdcardOutlined,
  SettingOutlined,
  FileTextOutlined,
  TeamOutlined,
  HistoryOutlined,
  TagsOutlined,
  HomeFilled
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const { Header, Content, Sider } = AntLayout;
const IDLE_MS = 60 * 60 * 1000;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastActivity = useRef(Date.now());
  const [collapsed, setCollapsed] = useState(false);

  // 闲置超时自动登出
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

  // 侧边栏菜单项
  const sidebarItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/profile',
      icon: <IdcardOutlined />,
      label: <Link to="/profile">我的档案</Link>,
    },
    {
      key: '/home-visits',
      icon: <HomeFilled />,
      label: <Link to="/home-visits">家访记录</Link>,
    },
    ...(user.role === 'admin' || user.role === 'leader' ? [
      {
        key: 'admin',
        icon: <SettingOutlined />,
        label: '管理功能',
        children: [
          { key: '/admin/profiles', label: <Link to="/admin/profiles">档案管理</Link> },
          ...(user.role === 'admin' ? [
            { key: '/admin/users', label: <Link to="/admin/users">用户管理</Link> },
            { key: '/admin/logs', label: <Link to="/admin/logs">操作日志</Link> },
            { key: '/admin/skill-tags', label: <Link to="/admin/skill-tags">技能标签</Link> },
          ] : []),
        ],
      },
    ] : []),
  ];

  // 用户下拉菜单
  const userMenu = {
    items: [
      {
        key: 'info',
        icon: <UserOutlined />,
        label: (
          <div className="user-menu-info">
            <div className="user-menu-name">{user.name}</div>
            <div className="user-menu-ehr">{user.ehr_no}</div>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      { key: 'pwd', icon: <KeyOutlined />, label: <Link to="/change-password">修改密码</Link> },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login'); } },
    ],
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className="app-sider"
        trigger={null}
      >
        {/* 侧边栏标题 */}
        <div
          style={{
            height: 64,
            margin: '16px',
            textAlign: 'center',
            lineHeight: '32px',
            fontSize: collapsed ? 14 : 18,
            fontWeight: 'bold',
            color: 'var(--color-primary)',
          }}
        >
          {collapsed ? '画像' : '员工数字画像'}
        </div>

        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={sidebarItems}
          className="app-menu"
        />
      </Sider>

      <AntLayout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.3s' }}>
        {/* 顶部导航栏 */}
        <Header
          style={{
            padding: 0,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuOutlined /> : <MenuOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />

          <div style={{ paddingRight: 24 }}>
            <Dropdown menu={userMenu}>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserOutlined style={{ fontSize: 18 }} />
                <span>{user.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
