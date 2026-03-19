import { Link } from 'react-router-dom';
import { Card, Row, Col } from 'antd';
import { UserOutlined, FileTextOutlined, TeamOutlined, HistoryOutlined, TagsOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const links = [
  { path: '/profile', title: '我的档案', icon: <UserOutlined />, color: '#E53E3E', gradient: 'from-red-500 to-red-600' },
  { path: '/admin/profiles', title: '档案管理', icon: <FileTextOutlined />, roles: ['admin', 'leader'], color: '#3B82F6', gradient: 'from-blue-500 to-blue-600' },
  { path: '/admin/users', title: '用户管理', icon: <TeamOutlined />, admin: true, color: '#10B981', gradient: 'from-green-500 to-green-600' },
  { path: '/admin/logs', title: '操作日志', icon: <HistoryOutlined />, admin: true, color: '#F59E0B', gradient: 'from-amber-500 to-amber-600' },
  { path: '/admin/skill-tags', title: '技能标签模板', icon: <TagsOutlined />, admin: true, color: '#8B5CF6', gradient: 'from-purple-500 to-purple-600' },
];

export default function Home() {
  const { user } = useAuth();
  const items = links.filter((item) => {
    if (item.admin) return user?.role === 'admin';
    if (item.roles) return item.roles.includes(user?.role);
    return true;
  });

  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="home-title">欢迎回来，{user?.name}</h1>
        <p className="home-subtitle">员工数字画像系统</p>
      </div>

      <Row gutter={[20, 20]} className="home-grid">
        {items.map((item) => (
          <Col key={item.path} xs={24} sm={12} lg={8}>
            <Link to={item.path} className="home-card-link">
              <Card
                className="home-card"
                style={{ '--card-color': item.color }}
                hoverable
              >
                <div className="home-card-icon" style={{ backgroundColor: item.color + '15' }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                </div>
                <h3 className="home-card-title">{item.title}</h3>
                <div className="home-card-arrow">→</div>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}
