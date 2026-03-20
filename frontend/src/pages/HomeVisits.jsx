import { useState, useEffect } from 'react';
import { Card, Table, Space, Input, Select, Button, Alert, Tag, Modal } from 'antd';
import { SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { listHomeVisits, deleteHomeVisit } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './AdminProfiles.css';

const VISIT_METHOD_OPTIONS = [
  { value: '线上', label: '线上' },
  { value: '线下', label: '线下' },
];

export default function HomeVisits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ total: 0, items: [] });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ visible: false, id: null });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listHomeVisits({
        page,
        page_size: pageSize,
        ...filters,
      });
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteHomeVisit(deleteModal.id);
      setDeleteModal({ visible: false, id: null });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const canEdit = user?.role === 'leader';
  const canDelete = user?.role === 'leader' || user?.role === 'admin';

  const columns = [
    {
      title: '被家访人',
      key: 'visited',
      width: 140,
      render: (_, r) => (
        <span>
          {r.visited_name}
          <span style={{ color: '#8c8c8c', marginLeft: 4, fontSize: 12 }}>{r.visited_ehr_no}</span>
        </span>
      ),
    },
    {
      title: '岗位',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      ellipsis: true,
      render: (v) => v || '—',
    },
    {
      title: '家访年度',
      dataIndex: 'visit_year',
      key: 'visit_year',
      width: 100,
    },
    {
      title: '家访时间',
      dataIndex: 'visit_time',
      key: 'visit_time',
      width: 160,
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
    },
    {
      title: '家访方式',
      dataIndex: 'visit_method',
      key: 'visit_method',
      width: 90,
      render: (v) => (
        <Tag color={v === '线上' ? 'blue' : 'green'}>{v || '—'}</Tag>
      ),
    },
    {
      title: '是否已家访',
      dataIndex: 'is_visited',
      key: 'is_visited',
      width: 100,
      render: (v) => (
        <Tag color={v ? 'success' : 'default'}>{v ? '已家访' : '未家访'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/home-visits/${r.id}`)}>
            查看
          </Button>
          {canEdit && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/home-visits/${r.id}/edit`)}>
              编辑
            </Button>
          )}
          {canDelete && (
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => setDeleteModal({ visible: true, id: r.id })}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-header home-visits-header">
        <div>
          <h2 className="admin-title">家访记录</h2>
          <p className="admin-subtitle">查看和管理家访记录</p>
        </div>
        {canEdit && (
          <Button
            type="default"
            icon={<PlusOutlined />}
            onClick={() => navigate('/home-visits/new')}
            className="home-visits-new-btn"
          >
            新建家访记录
          </Button>
        )}
      </div>

      <Card className="admin-card">
        <div className="filter-section home-visits-filter">
          <div className="home-visits-filter-row">
            <Input
              placeholder="被家访人 EHR"
              value={filters.visited_ehr || ''}
              onChange={(e) => setFilters({ ...filters, visited_ehr: e.target.value || undefined })}
              prefix={<SearchOutlined />}
              allowClear
              className="filter-input"
              style={{ width: 160 }}
            />
            <Input
              placeholder="家访年度"
              value={filters.visit_year ?? ''}
              onChange={(e) => {
                const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setFilters({ ...filters, visit_year: isNaN(v) ? undefined : v });
              }}
              allowClear
              className="filter-input"
              style={{ width: 120 }}
            />
            <Select
              placeholder="家访方式"
              value={filters.visit_method || undefined}
              onChange={(v) => setFilters({ ...filters, visit_method: v })}
              allowClear
              className="filter-select"
              style={{ width: 120 }}
            >
              {VISIT_METHOD_OPTIONS.map((o) => (
                <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="是否已家访"
              value={filters.is_visited}
              onChange={(v) => setFilters({ ...filters, is_visited: v })}
              allowClear
              className="filter-select"
              style={{ width: 120 }}
            >
              <Select.Option value={true}>已家访</Select.Option>
              <Select.Option value={false}>未家访</Select.Option>
            </Select>
            <Button
              type="primary"
              onClick={load}
              icon={<SearchOutlined />}
              className="home-visits-search-btn"
            >
              查询
            </Button>
          </div>
        </div>

        {error && <Alert type="error" message={error} className="error-alert" />}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data.items}
          loading={loading}
          scroll={{ x: 900 }}
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

      <Modal
        title="确认删除"
        open={deleteModal.visible}
        onOk={handleDelete}
        onCancel={() => setDeleteModal({ visible: false, id: null })}
        okText="删除"
        okButtonProps={{ danger: true }}
      >
        确定要删除这条家访记录吗？此操作不可恢复。
      </Modal>
    </div>
  );
}
