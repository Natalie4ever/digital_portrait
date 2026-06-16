// 应急响应场景 - Step 3
// 应急先锋队置顶 + 通勤时间升序；非应急置底
import { useState } from 'react';
import {
  Row,
  Col,
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
import { useEffect } from 'react';

const ROLE_OPTIONS = [
  { value: 'user', label: '普通员工' },
  { value: 'leader', label: '组长' },
  { value: 'admin', label: '管理员' },
];

export default function ScenarioEmergencyTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState({ total: 0, items: [] });
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    listGroups().then((r) => setGroups(r.items || [])).catch(() => setGroups([]));
  }, []);

  const search = async (values) => {
    setLoading(true);
    try {
      const res = await scenarioSearch({
        scenario: 'emergency',
        max_commute_minutes: values.max_commute || null,
        group_name: values.group_name || null,
        role: values.role || null,
      });
      setData({ total: res.total, items: res.items });
      if (res.total === 0) message.info('未找到符合条件的员工');
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
        scenario: 'emergency',
        max_commute_minutes: values.max_commute || null,
        group_name: values.group_name || null,
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
        type="warning"
        showIcon
        message="应急响应：应急先锋队成员置顶（按通勤时间升序），非应急先锋队成员置底（按通勤时间升序）"
        style={{ marginBottom: 12 }}
      />

      <Form
        form={form}
        layout="inline"
        onFinish={search}
        style={{ marginBottom: 16, rowGap: 8, columnGap: 8 }}
      >
        <Form.Item name="max_commute" label="通勤时间 ≤ (分钟)">
          <InputNumber min={0} max={300} placeholder="不限" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="group_name" label="组别">
          <Select
            allowClear
            placeholder="全部组别"
            options={groups.map((g) => ({ value: g, label: g }))}
            style={{ width: 160 }}
          />
        </Form.Item>
        <Form.Item name="role" label="角色">
          <Select allowClear placeholder="全部角色" options={ROLE_OPTIONS} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" loading={loading}>
              查询
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={doExport}
              loading={exporting}
              disabled={!data.items.length}
            >
              导出 Excel
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <ScenarioTable items={data.items} loading={loading} scenario="emergency" />
    </div>
  );
}
