// 场景结果通用表格组件 - Step 3
import { Table, Tag } from 'antd';

const EMERGENCY_TD_COLORS = { backgroundColor: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e' };

export default function ScenarioTable({ items, loading, scenario }) {
  const columns = [
    {
      title: 'EHR 号',
      dataIndex: 'ehr_no',
      key: 'ehr_no',
      width: 100,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '组别',
      dataIndex: 'group_name',
      key: 'group_name',
      width: 140,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (r) => {
        const map = { user: '普通员工', leader: '组长', admin: '管理员' };
        return map[r] || r;
      },
    },
    {
      title: '应急先锋队',
      dataIndex: 'is_emergency_staff',
      key: 'is_emergency_staff',
      width: 110,
      render: (v) =>
        v ? <Tag color="red" style={{ borderRadius: 12 }}>🚨 应急先锋队</Tag> : '—',
    },
    {
      title: '通勤(分钟)',
      dataIndex: 'commute_minutes',
      key: 'commute_minutes',
      width: 100,
      render: (v) => (v != null ? v : '—'),
    },
    {
      title: '技能标签',
      dataIndex: 'skill_tags',
      key: 'skill_tags',
      ellipsis: true,
      render: (tags) =>
        tags && tags.length > 0
          ? tags.map((t) => (
              <Tag key={t} color="blue" style={{ marginBottom: 2 }}>{t}</Tag>
            ))
          : '—',
    },
    {
      title: '证书/项目',
      key: 'cnt',
      width: 100,
      render: (_, r) => (
        <span>
          <Tag color="cyan">{r.cert_count || 0} 证</Tag>
          <Tag color="purple">{r.project_count || 0} 项</Tag>
        </span>
      ),
    },
    {
      title: '匹配度',
      dataIndex: 'match_score',
      key: 'match_score',
      width: 100,
      sorter: (a, b) => a.match_score - b.match_score,
      defaultSortOrder: 'descend',
      render: (v) => {
        let color = 'default';
        if (v >= 80) color = 'red';
        else if (v >= 50) color = 'orange';
        else if (v >= 20) color = 'blue';
        return <Tag color={color} style={{ fontWeight: 500 }}>{Number(v || 0).toFixed(0)}</Tag>;
      },
    },
  ];

  // 应急响应 Tab 不需要"证书/项目"列
  let finalColumns = columns;
  if (scenario === 'emergency') {
    finalColumns = columns.filter((c) => c.key !== 'cnt');
  }

  return (
    <Table
      rowKey="ehr_no"
      size="small"
      dataSource={items || []}
      columns={finalColumns}
      loading={loading}
      scroll={{ x: 1100 }}
      pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
    />
  );
}
