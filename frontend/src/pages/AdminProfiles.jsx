import { useState, useEffect } from 'react';
import { Card, Table, Space, Input, Select, Button, Alert, Tag, InputNumber } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { listProfiles } from '../api';
import { ROLE_OPTIONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

const ROLE_MAP = { user: '普通用户', leader: '组长', admin: '管理员' };

export default function AdminProfiles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ total: 0, items: [] });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({ include_disabled: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 仅 admin / leader 可访问
  useEffect(() => {
    if (user && !['admin', 'leader'].includes(user.role)) {
      setError('无权限访问档案管理');
    }
  }, [user]);

  const load = async () => {
    if (!user || !['admin', 'leader'].includes(user.role)) return;
    setLoading(true);
    try {
      const res = await listProfiles({ page, page_size: pageSize, ...filters });
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { title: 'EHR 号', dataIndex: 'ehr_no', key: 'ehr_no' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '组别', dataIndex: 'group_name', key: 'group_name' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (r) => ROLE_MAP[r] },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => (tags && tags.length > 0 ? tags.map((t) => <Tag key={t}>{t}</Tag>) : '—'),
    },
    {
      title: '通勤时间(分钟)',
      dataIndex: 'commute_minutes',
      key: 'commute_minutes',
      render: (v) => (v != null ? v : '—'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => navigate(`/admin/profile-view/${r.ehr_no}`)}
          >
            查看档案
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>档案管理</h2>
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="EHR 号"
            value={filters.ehr_no || ''}
            onChange={(e) => setFilters({ ...filters, ehr_no: e.target.value || undefined })}
            style={{ width: 120 }}
          />
          <Input
            placeholder="姓名"
            value={filters.name || ''}
            onChange={(e) => setFilters({ ...filters, name: e.target.value || undefined })}
            style={{ width: 120 }}
          />
          <Input
            placeholder="组别"
            value={filters.group_name || ''}
            onChange={(e) => setFilters({ ...filters, group_name: e.target.value || undefined })}
            style={{ width: 120 }}
          />
          <Select
            placeholder="角色"
            value={filters.role || undefined}
            onChange={(v) => setFilters({ ...filters, role: v })}
            style={{ width: 120 }}
            allowClear
          >
            {ROLE_OPTIONS.map((o) => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
          </Select>
          <Input
            placeholder="标签包含"
            value={filters.tag || ''}
            onChange={(e) => setFilters({ ...filters, tag: e.target.value || undefined })}
            style={{ width: 140 }}
          />
          <span>
            通勤时间小于
            <InputNumber
              min={0}
              style={{ width: 90, margin: '0 4px' }}
              value={filters.commute_lt ?? undefined}
              onChange={(v) => setFilters({ ...filters, commute_lt: v ?? undefined })}
            />
            分钟
          </span>
          <Button onClick={load}>查询</Button>
        </Space>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Table
          rowKey="ehr_no"
          columns={columns}
          dataSource={data.items}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total: data.total,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}

