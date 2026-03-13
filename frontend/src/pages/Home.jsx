import { Link } from 'react-router-dom';
import { Card, Row, Col } from 'antd';
import { UserOutlined, TeamOutlined, FileTextOutlined, TagsOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { path: '/profile', title: '我的档案', icon: <UserOutlined /> },
  { path: '/admin/users', title: '用户管理', icon: <TeamOutlined />, admin: true },
  { path: '/admin/logs', title: '操作日志', icon: <FileTextOutlined />, admin: true },
  { path: '/admin/skill-tags', title: '技能标签模板', icon: <TagsOutlined />, admin: true },
];

export default function Home() {
  const { user } = useAuth();
  const items = links.filter((item) => !item.admin || user?.role === 'admin');

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>欢迎，{user?.name}</h2>
      <Row gutter={[16, 16]}>
        {items.map((item) => (
          <Col key={item.path} xs={24} sm={12} md={8}>
            <Link to={item.path}>
              <Card hoverable style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
                <div>{item.title}</div>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}
