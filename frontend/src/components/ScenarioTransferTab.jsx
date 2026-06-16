// 人员调配场景 - Step 3
// 推荐将员工从其他组调配到目标组，按综合评分排序
import { useState, useEffect } from 'react';
import {
  Form,
  InputNumber,
  Select,
  Button,
  Space,
  Alert,
  message,
} from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { scenarioSearch, scenarioExport, listGroups } from '../api';
import ScenarioTable from './ScenarioTable';

const ROLE_OPTIONS = [
  { value: 'user', label: '普通员工' },
  { value: 'leader', label: '组长' },
  { value: 'admin', label: '管理员' },
];

export default function ScenarioTransferTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState({ total: 0, items: [] });
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    listGroups().then((r) => setGroups(r.items || [])).catch(() => setGroups([]));
  }, []);

  const search = async (values) => {
    if (!values.target_group) {
      message.warning('请选择目标组别');
      return;
    }
    setLoading(true);
    try {
      const res = await scenarioSearch({
        scenario: 'transfer',
        target_group: values.target_group,
        max_commute_minutes: values.max_commute || null,
        role: values.role || null,
      });
      setData({ total: res.total, items: res.items });
      if (res.total === 0) message.info('未找到可推荐的员工');
    } catch (err) {
      message.error('查询失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const values = form.getFieldsValue();
      const res = await scenarioExport({
        scenario: 'transfer',
        target_group: values.target_group,
        max_commute_minutes: values.max_commute || null,
        role: values.role || null,
      });
      message.success(`已导出：${res.filename}`);
    } catch (err) {
      message.error('导出失败：' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <Alert
        type="info"
        showIcon
        message={
          <span>
            评分公式：<b>技能数 × 5（封顶 40）+ 应急先锋 +20 + 通勤&lt;30 +30 / 通勤&lt;60 +15</b>
          </span>
        }
        description="推荐将「不在目标组」的员工调配到目标组"
        style={{ marginBottom: 12 }}
      />

      <Form
        form={form}
        layout="inline"
        onFinish={search}
        style={{ marginBottom: 16, rowGap: 8, columnGap: 8 }}
      >
        <Form.Item
          name="target_group"
          label="目标组别"
          rules={[{ required: true, message: '请选择目标组别' }]}
        >
          <Select
            allowClear
            placeholder="选择目标组别"
            options={groups.map((g) => ({ value: g, label: g }))}
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="max_commute" label="通勤 ≤ (分钟)">
          <InputNumber min={0} max={300} placeholder="不限" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="role" label="角色">
          <Select allowClear placeholder="全部" options={ROLE_OPTIONS} style={{ width: 130 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" loading={loading}>
              查询
            </Button>
            <Button icon={<DownloadOutlined />} onClick={doExport} loading={exporting} disabled={!data.items.length}>
              导出 Excel
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <ScenarioTable items={data.items} loading={loading} scenario="transfer" />
    </div>
  );
}
