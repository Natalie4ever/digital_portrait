import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Alert } from 'antd';
import { listOperationLogs } from '../api';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    listOperationLogs({ page, page_size: 50 })
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  const columns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (t) => t ? new Date(t).toLocaleString() : '' },
    { title: '操作人', dataIndex: 'user_name', key: 'user_name' },
    { title: 'EHR', dataIndex: 'user_ehr', key: 'user_ehr' },
    { title: '操作', dataIndex: 'action', key: 'action' },
    { title: '资源', dataIndex: 'resource', key: 'resource' },
    { title: '详情', dataIndex: 'detail', key: 'detail', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>操作日志</h2>
      <Card>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={logs}
          loading={loading}
          pagination={{
            current: page,
            pageSize: 50,
            total: logs.length < 50 ? page * 50 : page * 50 + 1,
            showTotal: () => `第 ${page} 页`,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}
