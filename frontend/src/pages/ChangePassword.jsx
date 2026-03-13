import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Space, message } from 'antd';
import { changePassword } from '../api';

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
    <Card title="修改密码">
      <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ maxWidth: 400 }}>
        <Form.Item name="old_password" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
          <Input.Password placeholder="原密码" autoComplete="current-password" />
        </Form.Item>
        <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '至少 6 位' }]}>
          <Input.Password placeholder="新密码" autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="confirm" label="确认新密码" rules={[{ required: true, message: '请再次输入新密码' }]}>
          <Input.Password placeholder="确认新密码" autoComplete="new-password" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={() => navigate(-1)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>确定</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
