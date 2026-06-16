// 调组弹窗 - Step 2
// 用于：用户管理行内 / 独立调组页
import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  AutoComplete,
  DatePicker,
  Input,
  Button,
  message,
  Alert,
} from 'antd';
import dayjs from 'dayjs';
import { transferUser, listGroups } from '../api';

export default function GroupTransferModal({ open, user, onCancel, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (open) {
      loadGroups();
      form.resetFields();
      form.setFieldsValue({
        transfer_date: dayjs(),
      });
    }
  }, [open, form]);

  const loadGroups = async () => {
    try {
      const res = await listGroups();
      setGroups(res.items || []);
    } catch (err) {
      message.error('加载组别失败：' + err.message);
    }
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await transferUser({
        ehr_no: user.ehr_no,
        to_group: values.to_group.trim(),
        transfer_date: values.transfer_date?.format('YYYY-MM-DD HH:mm:ss'),
        reason: values.reason?.trim() || null,
        remark: values.remark?.trim() || null,
      });
      message.success(`已成功将 ${user.name || user.ehr_no} 调至 ${values.to_group}`);
      onSuccess?.();
    } catch (err) {
      if (err.errorFields) {
        message.error('请检查表单填写');
        return;
      }
      message.error('调组失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`调组：${user?.name || ''}（EHR：${user?.ehr_no || ''}）`}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={submit}>
          确认调组
        </Button>,
      ]}
      destroyOnClose
      width={520}
    >
      <Alert
        type="info"
        showIcon
        message={
          <span>
            当前组别：<b style={{ color: '#1890ff' }}>{user?.group_name || '—'}</b>
          </span>
        }
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="to_group"
          label="调入组别"
          rules={[{ required: true, message: '请选择或输入调入组别' }]}
        >
          <AutoComplete
            allowClear
            placeholder="选择已有组别或输入新组别"
            options={groups.map((g) => ({ value: g, label: g }))}
            filterOption={(input, option) =>
              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item
          name="transfer_date"
          label="调组时间"
          rules={[{ required: true, message: '请选择调组时间' }]}
        >
          <DatePicker
            showTime
            style={{ width: '100%' }}
            placeholder="选择调组时间"
          />
        </Form.Item>
        <Form.Item name="reason" label="调组原因">
          <Input.TextArea rows={2} placeholder="如：业务调整 / 团队重组" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="其他需要说明的信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
