// 调组历史列表页 - Step 2
import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Space,
  Alert,
  Row,
  Col,
  Tag,
} from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { listGroupTransfers, listGroups } from '../api';
import './AdminProfiles.css';

const STATUS_MAP = {
  active: { text: '当前在组', color: 'green' },
  left: { text: '已离开', color: 'default' },
};

function formatDate(d) {
  if (!d) return '—';
  if (typeof d === 'string') return d.replace('T', ' ').slice(0, 19);
  return d;
}

export default function AdminGroupTransfers() {
  const [data, setData] = useState({ total: 0, items: [] });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);

  // 加载全部组别供筛选
  useEffect(() => {
    listGroups().then((res) => setGroups(res.items || [])).catch(() => setGroups([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listGroupTransfers({ page, page_size: pageSize, ...filters });
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      title: '员工EHR',
      dataIndex: 'ehr_no',
      key: 'ehr_no',
      width: 100,
    },
    {
      title: '姓名',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 100,
      render: (v) => v || '—',
    },
    {
      title: '调出组别',
      dataIndex: 'from_group',
      key: 'from_group',
      width: 140,
      render: (v) => v || <Tag color="blue">入职</Tag>,
    },
    {
      title: '调入组别',
      dataIndex: 'to_group',
      key: 'to_group',
      width: 140,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, r) => {
        const isActive = !r.leave_date;
        const m = isActive ? STATUS_MAP.active : STATUS_MAP.left;
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '调组时间',
      dataIndex: 'transfer_date',
      key: 'transfer_date',
      width: 170,
      render: (v) => formatDate(v),
    },
    {
      title: '离开时间',
      dataIndex: 'leave_date',
      key: 'leave_date',
      width: 170,
      render: (v) => v ? formatDate(v) : <span style={{ color: '#52c41a' }}>— 当前</span>,
    },
    {
      title: '操作人',
      key: 'operator',
      width: 120,
      render: (_, r) => `${r.operator_name || '—'}（${r.operator_ehr_no || ''}）`,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      width: 180,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      width: 180,
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">组员调换历史</h2>
        <p className="admin-subtitle">查看所有员工的组别调换记录</p>
      </div>

      <Card className="admin-card">
        <div className="filter-section">
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Input
                placeholder="EHR 号"
                value={filters.ehr_no || ''}
                onChange={(e) => setFilters({ ...filters, ehr_no: e.target.value || undefined })}
                prefix={<SearchOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Input
                placeholder="员工姓名"
                value={filters.user_name || ''}
                onChange={(e) => setFilters({ ...filters, user_name: e.target.value || undefined })}
                prefix={<SearchOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Select
                placeholder="调出组别"
                value={filters.from_group || undefined}
                onChange={(v) => setFilters({ ...filters, from_group: v })}
                allowClear
                className="filter-select"
                options={groups.map((g) => ({ value: g, label: g }))}
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Select
                placeholder="调入组别"
                value={filters.to_group || undefined}
                onChange={(v) => setFilters({ ...filters, to_group: v })}
                allowClear
                className="filter-select"
                options={groups.map((g) => ({ value: g, label: g }))}
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Button
                type="primary"
                onClick={load}
                icon={<SearchOutlined />}
                className="search-btn"
                block
              >
                查询
              </Button>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Button
                onClick={() => { setFilters({}); setPage(1); }}
                icon={<ReloadOutlined />}
                block
              >
                重置
              </Button>
            </Col>
          </Row>
        </div>

        {error && <Alert type="error" message={error} className="error-alert" />}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data.items}
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total: data.total,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
            onChange: setPage,
            className: 'admin-pagination',
          }}
          className="admin-table"
        />
      </Card>
    </div>
  );
}
