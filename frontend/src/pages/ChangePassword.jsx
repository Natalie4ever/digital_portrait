import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { changePassword } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './ChangePassword.css';

const PASSWORD_RULES = [
  { key: 'length', label: '长度至少 8 位', test: (p) => p.length >= 8 },
  { key: 'digit', label: '包含数字', test: (p) => /\d/.test(p) },
  { key: 'lower', label: '包含小写字母', test: (p) => /[a-z]/.test(p) },
  { key: 'upper', label: '包含大写字母', test: (p) => /[A-Z]/.test(p) },
  { key: 'special', label: '包含特殊字符', test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]/.test(p) },
];

function PasswordStrengthIndicator({ password }) {
  const passedRules = PASSWORD_RULES.filter((r) => r.test(password));
  const strength = passedRules.length;

  return (
    <div className="password-strength">
      <div className="strength-bars">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`strength-bar ${strength >= level ? 'active' : ''} strength-${Math.min(strength, 5)}`}
          />
        ))}
      </div>
      <div className="strength-rules">
        {PASSWORD_RULES.map((rule) => (
          <div
            key={rule.key}
            className={`strength-rule ${rule.test(password) ? 'passed' : ''}`}
          >
            <span className="rule-icon">{rule.test(password) ? '✓' : '○'}</span>
            {rule.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const [form] = Form.useForm();
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (values) => {
    if (values.new_password !== values.confirm) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setLoading(true);
    try {
      await changePassword(values.old_password, values.new_password);
      message.success('密码已修改');
      await refreshUser();
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
            rules={[{ required: true, message: '请输入新密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="长度≥8位，包含数字、大小写字母和特殊字符"
              autoComplete="new-password"
              className="password-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Form.Item>

          {newPassword && <PasswordStrengthIndicator password={newPassword} />}

          <Form.Item
            name="confirm"
            label={<span className="form-label">确认新密码</span>}
            dependencies={['new_password']}
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

          <div className="form-actions">
            {!user?.is_first_login && (
              <Button
                size="large"
                onClick={() => navigate(-1)}
                className="cancel-button"
              >
                取消
              </Button>
            )}
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              className="submit-button"
            >
              修改密码
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}