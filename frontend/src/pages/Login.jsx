import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Typography, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login, setToken, checkEhr } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const { Title, Paragraph } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [ehrValidated, setEhrValidated] = useState(false);
  const [ehrUserName, setEhrUserName] = useState('');
  const [ehrChecking, setEhrChecking] = useState(false);
  const [ehrError, setEhrError] = useState('');
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [form] = Form.useForm();

  const handleEhrBlur = async () => {
    const ehr = form.getFieldValue('username')?.trim();
    if (!ehr || !/^\d{7}$/.test(ehr)) {
      setEhrValidated(false);
      setEhrUserName('');
      setEhrError('');
      return;
    }
    setEhrChecking(true);
    setEhrError('');
    try {
      const res = await checkEhr(ehr);
      setEhrValidated(true);
      setEhrUserName(res.name || '');
    } catch (err) {
      setEhrValidated(false);
      setEhrUserName('');
      setEhrError(err.message || 'EHR号不存在');
    } finally {
      setEhrChecking(false);
    }
  };

  const handleEhrChange = () => {
    setEhrValidated(false);
    setEhrUserName('');
    setEhrError('');
  };

  const handleValuesChange = (changed, allValues) => {
    if ('username' in changed) {
      const ehr = (allValues.username ?? '')?.trim();
      if (ehr && /^\d{7}$/.test(ehr)) {
        handleEhrBlur();
      } else {
        handleEhrChange();
      }
    }
  };

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
            onValuesChange={handleValuesChange}
            form={form}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入EHR号' },
                { pattern: /^\d{7}$/, message: 'EHR号必须是7位数字' }
              ]}
              validateStatus={ehrError ? 'error' : undefined}
              help={ehrError}
            >
              <Input
                prefix={<UserOutlined className="site-form-item-icon" />}
                placeholder="请输入7位EHR号"
                size="large"
                onBlur={handleEhrBlur}
                suffix={ehrChecking ? <Spin size="small" /> : null}
              />
            </Form.Item>
            {ehrValidated && ehrUserName && (
              <div style={{ marginBottom: 16, color: '#52c41a', fontSize: 14 }}>
                欢迎，{ehrUserName}
              </div>
            )}
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
                disabled={!ehrValidated}
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
