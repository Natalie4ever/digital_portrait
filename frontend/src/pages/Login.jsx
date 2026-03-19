import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login, setToken } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const { Title, Paragraph } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const data = await login(values.username.trim(), values.password);
      setToken(data.access_token);
      await refreshUser();
      message.success('登录成功');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* 左侧品牌展示区 */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-branding">
            <div className="system-icon">
              <UserOutlined />
            </div>
            <Title level={2} className="system-name">员工数字画像系统</Title>
          </div>
          <div className="login-intro">
            <Title level={3}>员工档案管理</Title>
            <Paragraph className="subtitle">数字化转型中心</Paragraph>
            <Paragraph className="description">
              高效、安全的员工档案管理平台，提供数据管理与分析服务。
            </Paragraph>
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="login-right">
        <div className="login-form-container">
          <div className="form-header">
            <Title level={4}>欢迎登录</Title>
            <Paragraph className="form-hint">请使用您的 EHR 号和密码登录系统</Paragraph>
          </div>

          <Form
            name="login-form"
            className="login-form"
            initialValues={{ remember: true }}
            onFinish={handleSubmit}
            form={form}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入EHR号' },
                { pattern: /^\d{7}$/, message: 'EHR号必须是7位数字' }
              ]}
            >
              <Input
                prefix={<UserOutlined className="site-form-item-icon" />}
                placeholder="请输入7位EHR号"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="site-form-item-icon" />}
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>

            <Form.Item className="form-button">
              <Button
                type="primary"
                htmlType="submit"
                className="login-form-button"
                block
                size="large"
                loading={loading}
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className="security-tips">
            <Paragraph></Paragraph>
          </div>
        </div>
      </div>
    </div>
  );
}
