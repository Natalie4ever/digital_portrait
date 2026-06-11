import { useState, useEffect } from 'react';
import { Card, Table, Space, Input, Select, Button, Alert, Tag, InputNumber, Row, Col, message, Modal } from 'antd';
import { SearchOutlined, FilterOutlined, UserOutlined, TeamOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { listProfiles, toggleEmergencyProfile } from '../api';
import { ROLE_OPTIONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import './AdminProfiles.css';

const ROLE_MAP = { user: '普通用户', leader: '组长', admin: '管理员' };

const ROLE_TAG_COLORS = {
  user: { backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#A5B4FC' },
  leader: { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' },
  admin: { backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' },
};

const ROLE_BADGE_META = {
  user: { icon: UserOutlined, className: 'role-badge-user' },
  leader: { icon: TeamOutlined, className: 'role-badge-leader' },
  admin: { icon: SafetyOutlined, className: 'role-badge-admin' },
};

export default function AdminProfiles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ total: 0, items: [] });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({ include_disabled: false });
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

  // Step 1 1.1（修订）：档案管理列表切换应急先锋队
  const handleToggleEmergency = (row) => {
    const will = !row.is_emergency_staff;
    Modal.confirm({
      title: will
        ? `确定将 ${row.name || row.ehr_no} 标记为应急先锋队成员？`
        : `确定取消 ${row.name || row.ehr_no} 的应急先锋队标识？`,
      onOk: async () => {
        try {
          await toggleEmergencyProfile(row.ehr_no);
          message.success(will ? '已标记为应急先锋队' : '已取消应急先锋队');
          load();
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  };

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
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (r) => {
        const meta = ROLE_BADGE_META[r] || ROLE_BADGE_META.user;
        const RoleIcon = meta.icon;
        return (
          <span className={`role-badge ${meta.className}`}>
            <RoleIcon className="role-badge-icon" />
            <span>{ROLE_MAP[r] || r}</span>
          </span>
        );
      },
    },
    {
      title: '应急先锋队',
      dataIndex: 'is_emergency_staff',
      key: 'is_emergency_staff',
      width: 110,
      render: (v, r) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 10px',
            backgroundColor: v ? '#fff1f0' : 'transparent',
            color: v ? '#cf1322' : '#999',
            border: v ? '1px solid #ffa39e' : 'none',
            borderRadius: 12,
            fontSize: 12,
            cursor: 'pointer',
          }}
          onClick={() => handleToggleEmergency(r)}
          title="点击切换"
        >
          {v ? '🚨 应急先锋队' : '—'}
        </span>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      ellipsis: true,
      render: (tags) => (tags && tags.length > 0 ? tags.map((t, i) => {
        const palette = [
          { backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#A5B4FC' },
          { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#6EE7B7' },
          { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' },
        ];
        return (
          <Tag
            key={t}
            style={{
              ...palette[i % palette.length],
              borderRadius: 16,
              padding: '4px 10px',
              fontSize: 12,
              marginRight: 4,
              marginBottom: 4,
            }}
          >
            {t}
          </Tag>
        );
      }) : '—'),
    },
    {
      title: '通勤时间',
      dataIndex: 'commute_minutes',
      key: 'commute_minutes',
      width: 100,
      render: (v) => (v != null ? `${v}分钟` : '—'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/admin/profile-view/${r.ehr_no}`)}
          className="view-btn"
        >
          查看档案
        </Button>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">档案管理</h2>
        <p className="admin-subtitle">查看和管理员工档案信息</p>
      </div>

      <Card className="admin-card">
        <div className="filter-section">
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={8} lg={3}>
              <Input
                placeholder="EHR 号"
                value={filters.ehr_no || ''}
                onChange={(e) => setFilters({ ...filters, ehr_no: e.target.value || undefined })}
                prefix={<SearchOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <Input
                placeholder="姓名"
                value={filters.name || ''}
                onChange={(e) => setFilters({ ...filters, name: e.target.value || undefined })}
                prefix={<SearchOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <Input
                placeholder="组别"
                value={filters.group_name || ''}
                onChange={(e) => setFilters({ ...filters, group_name: e.target.value || undefined })}
                prefix={<FilterOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <Select
                placeholder="角色"
                value={filters.role || undefined}
                onChange={(v) => setFilters({ ...filters, role: v })}
                allowClear
                className="filter-select"
              >
                {ROLE_OPTIONS.map((o) => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Input
                placeholder="标签包含"
                value={filters.tag || ''}
                onChange={(e) => setFilters({ ...filters, tag: e.target.value || undefined })}
                prefix={<FilterOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div className="commute-filter">
                <span className="filter-label">通勤时间 &lt; </span>
                <InputNumber
                  min={0}
                  placeholder="分钟"
                  value={filters.commute_lt ?? undefined}
                  onChange={(v) => setFilters({ ...filters, commute_lt: v ?? undefined })}
                  className="filter-number"
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <Select
                placeholder="应急先锋队"
                value={filters.is_emergency_staff === undefined ? undefined : (filters.is_emergency_staff ? 'true' : 'false')}
                onChange={(v) => setFilters({ ...filters, is_emergency_staff: v === undefined ? undefined : v === 'true' })}
                allowClear
                className="filter-select"
              >
                <Select.Option value="true">是</Select.Option>
                <Select.Option value="false">否</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <Button type="primary" onClick={load} block icon={<SearchOutlined />} className="search-btn">
                查询
              </Button>
            </Col>
          </Row>
        </div>

        {error && <Alert type="error" message={error} className="error-alert" />}

        <Table
          rowKey="ehr_no"
          columns={columns}
          dataSource={data.items}
          loading={loading}
          scroll={{ x: 1000 }}
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
