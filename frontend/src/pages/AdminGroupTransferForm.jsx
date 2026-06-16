// 独立调组页 - Step 2
// 提供「按 EHR 快速调组」+「按姓名搜索调组」两个入口
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
  message,
} from 'antd';
import { SearchOutlined, SwapOutlined, UserOutlined } from '@ant-design/icons';
import { listUsers, getUserTransferHistory } from '../api';
import GroupTransferModal from '../components/GroupTransferModal';
import './AdminProfiles.css';

const ROLE_MAP = { user: '普通用户', leader: '组长', admin: '管理员' };

export default function AdminGroupTransferForm() {
  const [data, setData] = useState({ total: 0, items: [] });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transferTarget, setTransferTarget] = useState(null);
  // 每个员工的历史记录（按需懒加载）
  const [historyMap, setHistoryMap] = useState({});
  const [historyLoading, setHistoryLoading] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listUsers({ page, page_size: pageSize, ...filters });
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => { load(); }, [load]);

  const loadHistory = async (ehr_no) => {
    setHistoryLoading((m) => ({ ...m, [ehr_no]: true }));
    try {
      const items = await getUserTransferHistory(ehr_no);
      setHistoryMap((m) => ({ ...m, [ehr_no]: items }));
    } catch (err) {
      message.error('加载调组历史失败：' + err.message);
    } finally {
      setHistoryLoading((m) => ({ ...m, [ehr_no]: false }));
    }
  };

  const columns = [
    { title: 'EHR 号', dataIndex: 'ehr_no', key: 'ehr_no', width: 100 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    {
      title: '当前组别',
      dataIndex: 'group_name',
      key: 'group_name',
      width: 140,
      render: (v) => <Tag color="blue">{v || '—'}</Tag>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (r) => ROLE_MAP[r] || r,
    },
    {
      title: '调组历史',
      dataIndex: 'ehr_no',
      key: 'history',
      width: 100,
      render: (ehr) => {
        const loaded = historyMap[ehr];
        const loading = historyLoading[ehr];
        if (loading) return <span style={{ color: '#999' }}>加载中...</span>;
        if (loaded) {
          return <span style={{ color: '#1890ff' }}>已加载（{loaded.length} 条）</span>;
        }
        return (
          <Button
            type="link"
            size="small"
            onClick={() => loadHistory(ehr)}
            icon={<SearchOutlined />}
          >
            查看
          </Button>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, u) => (
        <Button
          type="primary"
          size="small"
          icon={<SwapOutlined />}
          onClick={() => setTransferTarget(u)}
        >
          调组
        </Button>
      ),
    },
  ];

  // 展开行：历史记录
  const expandedRowRender = (record) => {
    const items = historyMap[record.ehr_no];
    if (!items) {
      return (
        <div style={{ padding: 16, color: '#999' }}>
          点击「查看」加载历史
        </div>
      );
    }
    if (!items.length) {
      return <div style={{ padding: 16, color: '#999' }}>暂无调组历史</div>;
    }
    return (
      <Table
        size="small"
        rowKey="id"
        dataSource={items}
        pagination={false}
        columns={[
          {
            title: '调出',
            dataIndex: 'from_group',
            width: 140,
            render: (v) => v || <Tag color="blue">入职</Tag>,
          },
          { title: '调入', dataIndex: 'to_group', width: 140 },
          {
            title: '状态',
            width: 100,
            render: (_, r) => r.leave_date
              ? <Tag>已离开</Tag>
              : <Tag color="green">当前在组</Tag>,
          },
          {
            title: '调组时间',
            dataIndex: 'transfer_date',
            width: 170,
            render: (v) => (v || '').replace('T', ' ').slice(0, 19),
          },
          {
            title: '离开时间',
            dataIndex: 'leave_date',
            width: 170,
            render: (v) => v ? v.replace('T', ' ').slice(0, 19) : <span style={{ color: '#52c41a' }}>— 当前</span>,
          },
          {
            title: '操作人',
            width: 140,
            render: (_, r) => `${r.operator_name || '—'}（${r.operator_ehr_no || ''}）`,
          },
          { title: '原因', dataIndex: 'reason', ellipsis: true },
        ]}
      />
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">组员调换</h2>
        <p className="admin-subtitle">为员工调换组别（自动记录调换历史）</p>
      </div>

      <Card className="admin-card">
        <div className="filter-section">
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="EHR 号"
                value={filters.ehr_no || ''}
                onChange={(e) => setFilters({ ...filters, ehr_no: e.target.value || undefined })}
                prefix={<SearchOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="姓名"
                value={filters.name || ''}
                onChange={(e) => setFilters({ ...filters, name: e.target.value || undefined })}
                prefix={<UserOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="组别"
                value={filters.group_name || undefined}
                onChange={(v) => setFilters({ ...filters, group_name: v })}
                allowClear
                className="filter-select"
                options={[
                  { value: '管理组', label: '管理组' },
                  { value: '测试组', label: '测试组' },
                ]}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Button
                type="primary"
                onClick={load}
                icon={<SearchOutlined />}
                block
                className="search-btn"
              >
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
          scroll={{ x: 800 }}
          expandable={{
            expandedRowRender,
            rowExpandable: () => true,
          }}
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

      <GroupTransferModal
        open={!!transferTarget}
        user={transferTarget}
        onCancel={() => setTransferTarget(null)}
        onSuccess={() => {
          setTransferTarget(null);
          load();
          // 刷新该员工历史
          if (transferTarget) {
            loadHistory(transferTarget.ehr_no);
          }
        }}
      />
    </div>
  );
}
