// 项目组队场景 - Step 3
// 多维评分：技能命中×30 + 证书达标×20 + 项目达标×20 + 通勤<60×10
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
import { scenarioSearch, scenarioExport, listGroups, listSkillTagTemplates } from '../api';
import ScenarioTable from './ScenarioTable';

const ROLE_OPTIONS = [
  { value: 'user', label: '普通员工' },
  { value: 'leader', label: '组长' },
  { value: 'admin', label: '管理员' },
];

export default function ScenarioProjectTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState({ total: 0, items: [] });
  const [groups, setGroups] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);

  useEffect(() => {
    listGroups().then((r) => setGroups(r.items || [])).catch(() => setGroups([]));
    listSkillTagTemplates().then((r) => {
      setTagOptions((r || []).map((t) => ({ value: t.name, label: t.name })));
    }).catch(() => setTagOptions([]));
  }, []);

  const search = async (values) => {
    if (!values.required_skill_tags || values.required_skill_tags.length === 0) {
      message.warning('请至少选择一个必选技能');
      return;
    }
    setLoading(true);
    try {
      const res = await scenarioSearch({
        scenario: 'project',
        required_skill_tags: values.required_skill_tags,
        min_cert_count: values.min_cert || 0,
        min_project_count: values.min_project || 0,
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
        scenario: 'project',
        required_skill_tags: values.required_skill_tags,
        min_cert_count: values.min_cert || 0,
        min_project_count: values.min_project || 0,
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
        type="info"
        showIcon
        message={
          <span>
            匹配度公式：<b>技能命中 × 30 + 证书达标 × 20 + 项目达标 × 20 + 通勤&lt;60 × 10</b>（上限 100）
          </span>
        }
        style={{ marginBottom: 12 }}
      />

      <Form
        form={form}
        layout="inline"
        onFinish={search}
        style={{ marginBottom: 16, rowGap: 8, columnGap: 8 }}
      >
        <Form.Item
          name="required_skill_tags"
          label="必选技能"
          rules={[{ required: true, message: '请选择至少 1 项' }]}
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="选择必选技能"
            options={tagOptions}
            style={{ minWidth: 280 }}
            maxTagCount="responsive"
          />
        </Form.Item>
        <Form.Item name="min_cert" label="最少证书数">
          <InputNumber min={0} max={20} placeholder="0" style={{ width: 90 }} />
        </Form.Item>
        <Form.Item name="min_project" label="最少项目数">
          <InputNumber min={0} max={50} placeholder="0" style={{ width: 90 }} />
        </Form.Item>
        <Form.Item name="max_commute" label="通勤 ≤ (分钟)">
          <InputNumber min={0} max={300} placeholder="不限" style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="group_name" label="组别">
          <Select allowClear placeholder="全部" options={groups.map((g) => ({ value: g, label: g }))} style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="role" label="角色">
          <Select allowClear placeholder="全部" options={ROLE_OPTIONS} style={{ width: 110 }} />
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

      <ScenarioTable items={data.items} loading={loading} scenario="project" />
    </div>
  );
}
