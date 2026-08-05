import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Card, Table, Alert, Row, Col, Input, Select, DatePicker, Space, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { listOperationLogs } from '../api';
import './AdminLogs.css';

const ACTION_COLORS = {
  '登录': { backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#A5B4FC' },
  '登出': { backgroundColor: '#F3F4F6', color: '#4B5563', borderColor: '#9CA3AF' },
  '创建': { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#6EE7B7' },
  '更新': { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' },
  '删除': { backgroundColor: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5' },
  '禁用': { backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' },
  '启用': { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#6EE7B7' },
};

const ACTION_OPTIONS = [
  { value: '登录', label: '登录' },
  { value: '登出', label: '登出' },
  { value: '创建', label: '创建' },
  { value: '更新', label: '更新' },
  { value: '删除', label: '删除' },
  { value: '禁用', label: '禁用' },
  { value: '启用', label: '启用' },
];

const { RangePicker } = DatePicker;

export default function AdminLogs() {
  const [data, setData] = useState({ total: 0, items: [] });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    user_name: undefined,
    user_ehr: undefined,
    action: undefined,
    start_time: undefined,
    end_time: undefined,
  });
  const dragRef = useRef(null);
  const scrollerRef = useRef(null);
  const dragStateRef = useRef({
    isDown: false,
    startX: 0,
    startScrollLeft: 0,
    pointerId: null,
  });
  const [isDragging, setIsDragging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize, ...filters };
      // 清除 undefined/null 空值
      Object.keys(params).forEach((k) => {
        if (params[k] === undefined || params[k] === null || params[k] === '') {
          delete params[k];
        }
      });
      const res = await listOperationLogs(params);
      setData({ total: res.total || 0, items: res.items || [] });
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const root = dragRef.current;
    if (!root) return;
    scrollerRef.current =
      root.querySelector?.('.ant-table-content') ||
      root.querySelector?.('.ant-table-body') ||
      root.querySelector?.('.ant-table-container') ||
      root;
  }, [data.items.length]);

  const columns = useMemo(
    () => [
      {
        title: '时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 170,
        render: (t) => (t ? new Date(t).toLocaleString('zh-CN') : '—'),
      },
      {
        title: '操作人',
        dataIndex: 'user_name',
        key: 'user_name',
        width: 100,
        render: (v) => v || '—',
      },
      {
        title: 'EHR',
        dataIndex: 'user_ehr',
        key: 'user_ehr',
        width: 80,
        render: (v) => v || '—',
      },
      {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        width: 80,
        render: (action) => {
          const style = ACTION_COLORS[action] || ACTION_COLORS['更新'];
          return (
            <span
              style={{
                ...style,
                padding: '4px 10px',
                borderRadius: 16,
                fontSize: 12,
                display: 'inline-block',
              }}
            >
              {action}
            </span>
          );
        },
      },
      {
        title: '资源',
        dataIndex: 'resource',
        key: 'resource',
        width: 120,
        ellipsis: true,
        render: (v) => v || '—',
      },
      {
        title: '详情',
        dataIndex: 'detail',
        key: 'detail',
        ellipsis: true,
        render: (v) => v || '—',
      },
      {
        title: 'IP',
        dataIndex: 'ip',
        key: 'ip',
        width: 130,
        render: (v) => v || '—',
      },
    ],
    []
  );

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target?.closest?.('a,button,input,textarea,select,[role="button"]')) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;

    dragStateRef.current.isDown = true;
    dragStateRef.current.startX = e.clientX ?? 0;
    dragStateRef.current.startScrollLeft = scroller.scrollLeft ?? 0;
    dragStateRef.current.pointerId = e.pointerId ?? null;
    setIsDragging(true);
    try {
      if (e.pointerId != null) e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e) => {
    const state = dragStateRef.current;
    if (!state.isDown) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const x = e.clientX ?? 0;
    const dx = x - state.startX;
    scroller.scrollLeft = state.startScrollLeft - dx;
  };

  const endDrag = (e) => {
    const state = dragStateRef.current;
    if (!state.isDown) return;
    state.isDown = false;
    setIsDragging(false);
    try {
      if (state.pointerId != null) e.currentTarget.releasePointerCapture(state.pointerId);
    } catch {
      // ignore
    }
    state.pointerId = null;
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">操作日志</h2>
        <p className="admin-subtitle">查看系统操作记录</p>
      </div>

      <Card className="admin-card">
        {/* 筛选栏 */}
        <div className="filter-section">
          <Row gutter={[8, 10]} align="middle" justify="start" className="user-filter-search-row">
            <Col xs={24} sm={12} md={6} lg={5}>
              <Input
                placeholder="操作人"
                value={filters.user_name || ''}
                onChange={(e) => setFilters({ ...filters, user_name: e.target.value || undefined })}
                prefix={<SearchOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Input
                placeholder="EHR 号"
                value={filters.user_ehr || ''}
                onChange={(e) => setFilters({ ...filters, user_ehr: e.target.value || undefined })}
                prefix={<SearchOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Select
                placeholder="操作类型"
                value={filters.action || undefined}
                onChange={(v) => setFilters({ ...filters, action: v || undefined })}
                allowClear
                className="filter-select"
              >
                {ACTION_OPTIONS.map((o) => (
                  <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6} lg={8}>
              <RangePicker
                value={[
                  filters.start_time ? new Date(filters.start_time) : null,
                  filters.end_time ? new Date(filters.end_time) : null,
                ]}
                onChange={(dates) => {
                  setFilters({
                    ...filters,
                    start_time: dates?.[0] ? dates[0].toISOString() : undefined,
                    end_time: dates?.[1] ? dates[1].toISOString() : undefined,
                  });
                }}
                className="filter-range-picker"
                placeholder={['开始时间', '结束时间']}
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={3}>
              <Button
                onClick={load}
                icon={<SearchOutlined />}
                type="primary"
                className="search-btn"
              >
                查询
              </Button>
            </Col>
          </Row>
        </div>

        {error && <Alert type="error" message={error} className="error-alert" />}

        <div
          ref={dragRef}
          className={`admin-logs-drag-scroll ${isDragging ? 'is-dragging' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data.items}
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: page,
              pageSize,
              total: data.total,
              showSizeChanger: false,
              showTotal: (t) => `共 ${t} 条`,
              onChange: setPage,
              className: 'admin-pagination',
            }}
            className="admin-table admin-logs-table"
          />
        </div>
      </Card>
    </div>
  );
}
