import { useState, useEffect } from 'react';
import { Card, Table, Space, Input, Select, Button, Alert, Tag, Modal, message } from 'antd';
import { SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { listHomeVisits, deleteHomeVisit, getHomeVisit } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './AdminProfiles.css';

const EXPORT_HEADERS = ['被家访人', 'EHR号', '岗位', '家访年度', '家访时间', '家访方式', '家访地址', '家访人员及岗位', '联系电话', '是否已家访'];

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
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [exporting, setExporting] = useState(false);

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

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [page, filters]);

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

  const handleExport = async () => {
    const ids = selectedRowKeys.length > 0 ? selectedRowKeys : data.items.map((r) => r.id);
    if (ids.length === 0) {
      message.warning('请至少选择一条记录');
      return;
    }
    setExporting(true);
    try {
      const details = await Promise.all(ids.map((id) => getHomeVisit(id)));
      const rows = details.map((d) => [
        d.visited_name || '—',
        d.visited_ehr_no || '—',
        d.position || '—',
        d.visit_year || '—',
        d.visit_time ? dayjs(d.visit_time).format('YYYY-MM-DD') : '—',
        d.visit_method || '—',
        d.visit_address || '—',
        d.visitor_info || '—',
        d.contact_phone || '—',
        d.is_visited ? '已家访' : '未家访',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '家访明细');
      XLSX.writeFile(wb, `家访明细表_${dayjs().format('YYYY-MM-DD_HHmm')}.xlsx`);
      message.success('导出成功');
    } catch (err) {
      message.error(err.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

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
        <Space>
          <Button
            type="default"
            icon={<ExportOutlined />}
            onClick={handleExport}
            loading={exporting}
            className="home-visits-header-btn"
          >
            导出明细表
          </Button>
          {canEdit && (
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={() => navigate('/home-visits/new')}
              className="home-visits-new-btn home-visits-header-btn"
            >
              新建家访记录
            </Button>
          )}
        </Space>
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
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
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
