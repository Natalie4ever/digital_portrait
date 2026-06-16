// 活动选人场景 - Step 3
// 兴趣标签 OR 匹配，匹配度 = 命中标签数 × 20
import { useState, useEffect } from 'react';
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
  Tag,
} from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { scenarioSearch, scenarioExport, listGroups, listSkillTagTemplates } from '../api';
import ScenarioTable from './ScenarioTable';

const ROLE_OPTIONS = [
  { value: 'user', label: '普通员工' },
  { value: 'leader', label: '组长' },
  { value: 'admin', label: '管理员' },
];

export default function ScenarioActivityTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState({ total: 0, items: [] });
  const [groups, setGroups] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);

  useEffect(() => {
    listGroups().then((r) => setGroups(r.items || [])).catch(() => setGroups([]));
    listSkillTagTemplates().then((r) => {
      const opts = (r || []).map((t) => ({ value: t.name, label: t.name }));
      // 额外补充常见的兴趣标签
      const common = ['舞蹈', '主持', '摄影', '唱歌', '书法', '绘画', '篮球', '足球', '羽毛球', '乒乓球', '乐器', '烹饪'];
      const all = [...opts];
      common.forEach((c) => {
        if (!all.find((o) => o.value === c)) all.push({ value: c, label: c });
      });
      setTagOptions(all);
    }).catch(() => setTagOptions([]));
  }, []);

  const search = async (values) => {
    if (!values.interest_tags || values.interest_tags.length === 0) {
      message.warning('请至少选择一个兴趣标签');
      return;
    }
    setLoading(true);
    try {
      const res = await scenarioSearch({
        scenario: 'activity',
        interest_tags: values.interest_tags,
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
        scenario: 'activity',
        interest_tags: values.interest_tags,
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
        message="活动选人：选择 1 个或多个兴趣标签，多标签 OR 匹配，匹配度 = 命中标签数 × 20"
        description={
          <span>
            已加载 {tagOptions.length} 个标签（来自技能标签库 + 常见兴趣）
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
          name="interest_tags"
          label="兴趣标签"
          rules={[{ required: true, message: '请选择至少 1 个' }]}
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="选择兴趣标签"
            options={tagOptions}
            style={{ minWidth: 280 }}
            maxTagCount="responsive"
          />
        </Form.Item>
        <Form.Item name="max_commute" label="通勤 ≤ (分钟)">
          <InputNumber min={0} max={300} placeholder="不限" style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="group_name" label="组别">
          <Select allowClear placeholder="全部组别" options={groups.map((g) => ({ value: g, label: g }))} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="role" label="角色">
          <Select allowClear placeholder="全部角色" options={ROLE_OPTIONS} style={{ width: 120 }} />
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

      <ScenarioTable items={data.items} loading={loading} scenario="activity" />
    </div>
  );
}
