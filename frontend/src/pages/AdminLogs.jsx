import { useMemo, useRef, useState, useEffect } from 'react';
import { Card, Table, Alert } from 'antd';
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

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dragRef = useRef(null);
  const scrollerRef = useRef(null);
  const dragStateRef = useRef({
    isDown: false,
    startX: 0,
    startScrollLeft: 0,
    pointerId: null,
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setLoading(true);
    listOperationLogs({ page, page_size: 50 })
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    const root = dragRef.current;
    if (!root) return;
    scrollerRef.current =
      root.querySelector?.('.ant-table-content') ||
      root.querySelector?.('.ant-table-body') ||
      root.querySelector?.('.ant-table-container') ||
      root;
  }, [logs.length]);

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
            dataSource={logs}
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: page,
              pageSize: 50,
              total: logs.length < 50 ? page * 50 : page * 50 + 1,
              showTotal: () => `第 ${page} 页`,
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
