import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { changePassword } from '../api';
import './ChangePassword.css';

export default function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    if (values.new_password !== values.confirm) {
      message.error('两次输入的新密码不一致');
      return;
    }
    if (values.new_password.length < 6) {
      message.error('新密码至少 6 位');
      return;
    }
    setLoading(true);
    try {
      await changePassword(values.old_password, values.new_password);
      message.success('密码已修改');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(err.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <Card className="change-password-card">
        <div className="change-password-header">
          <div className="change-password-icon">
            <LockOutlined />
          </div>
          <h2 className="change-password-title">修改密码</h2>
          <p className="change-password-subtitle">为了账户安全，请定期更换密码</p>
        </div>

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          className="change-password-form"
        >
          <Form.Item
            name="old_password"
            label={<span className="form-label">原密码</span>}
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入原密码"
              autoComplete="current-password"
              className="password-input"
            />
          </Form.Item>

          <Form.Item
            name="new_password"
            label={<span className="form-label">新密码</span>}
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入新密码（至少 6 位）"
              autoComplete="new-password"
              className="password-input"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            label={<span className="form-label">确认新密码</span>}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入新密码"
              autoComplete="new-password"
              className="password-input"
            />
          </Form.Item>

          <Form.Item className="form-actions">
            <Button
              size="large"
              onClick={() => navigate(-1)}
              className="cancel-button"
            >
              取消
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              className="submit-button"
            >
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
