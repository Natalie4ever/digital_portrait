import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Checkbox,
  Modal,
  Form,
  message,
  Alert,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  batchImportUsers,
} from '../api';
import { ROLE_OPTIONS } from '../constants';
import './AdminUsers.css';

const ROLE_MAP = { user: '普通用户', leader: '组长', admin: '管理员' };

const ROLE_TAG_COLORS = {
  user: { backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#A5B4FC' },
  leader: { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' },
  admin: { backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' },
};

const STATUS_COLORS = {
  normal: { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#6EE7B7', text: '正常' },
  disabled: { backgroundColor: '#F3F4F6', color: '#4B5563', borderColor: '#9CA3AF', text: '已禁用' },
};

export default function AdminUsers() {
  const [data, setData] = useState({ total: 0, items: [] });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({ include_disabled: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const load = async () => {
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
  };

  useEffect(() => { load(); }, [page, filters]);

  const handleCreate = async (body) => {
    try {
      await createUser(body);
      message.success('已创建');
      setModal(null);
      load();
    } catch (err) { throw err; }
  };

  const handleUpdate = async (ehr_no, body) => {
    try {
      await updateUser(ehr_no, body);
      message.success('已更新');
      setModal(null);
      load();
    } catch (err) { throw err; }
  };

  const handleToggleDisabled = (u) => {
    const targetDisabled = !u.is_disabled;
    Modal.confirm({
      title: targetDisabled ? `确定禁用用户 ${u.ehr_no}？` : `确定启用用户 ${u.ehr_no}？`,
      onOk: async () => {
        try {
          await updateUser(u.ehr_no, { is_disabled: targetDisabled });
          message.success(targetDisabled ? '已禁用' : '已启用');
          load();
        } catch (err) {
          setError(err.message);
        }
      },
    });
  };

  const handleDelete = (ehr_no) => {
    Modal.confirm({ title: `确定删除用户 ${ehr_no}？（软删除）`, onOk: async () => {
      try {
        await deleteUser(ehr_no);
        message.success('已删除');
        load();
      } catch (err) { setError(err.message); }
    } });
  };

  const handleResetPwd = async (ehr_no, new_password) => {
    try {
      await resetPassword(ehr_no, new_password);
      message.success('密码已重置');
      setModal(null);
    } catch (err) { throw err; }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      const res = await batchImportUsers(importFile);
      setImportResult(res);
      setImportFile(null);
      if (res.errors?.length) {
        message.warning(`导入完成：新增 ${res.created}，跳过 ${res.skipped}；${res.errors.length} 条格式错误`);
      } else {
        message.success(`导入完成：新增 ${res.created}，跳过 ${res.skipped}`);
      }
      load();
    } catch (err) { setError(err.message); }
  };

  const columns = [
    { title: 'EHR 号', dataIndex: 'ehr_no', key: 'ehr_no', width: 100 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '组别', dataIndex: 'group_name', key: 'group_name', width: 120 },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 90,
      render: (r) => (
        <span
          style={{
            ...ROLE_TAG_COLORS[r],
            padding: '4px 12px',
            borderRadius: 16,
            fontSize: 13,
            display: 'inline-block',
          }}
        >
          {ROLE_MAP[r]}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_disabled',
      key: 'is_disabled',
      width: 90,
      render: (v) => {
        const style = v ? STATUS_COLORS.disabled : STATUS_COLORS.normal;
        return (
          <span
            style={{
              ...style,
              padding: '4px 12px',
              borderRadius: 16,
              fontSize: 13,
              display: 'inline-block',
            }}
          >
            {v ? '已禁用' : '正常'}
          </span>
        );
      },
    },
    {
      title: '状态操作',
      key: 'status_action',
      width: 80,
      render: (_, u) => {
        const disabled = u.is_disabled;
        return (
          <Button
            size="small"
            className={`status-btn ${disabled ? 'enable' : 'disable'}`}
            onClick={() => handleToggleDisabled(u)}
          >
            {disabled ? '启用' : '禁用'}
          </Button>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, u) => (
        <Space>
          <Button type="link" size="small" onClick={() => setModal({ type: 'edit', data: u })}>编辑</Button>
          <Button type="link" size="small" onClick={() => setModal({ type: 'resetPwd', data: u })}>重置密码</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(u.ehr_no)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">用户管理</h2>
        <p className="admin-subtitle">管理系统用户和权限</p>
      </div>

      <Card className="admin-card">
        <div className="filter-section">
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Checkbox
                checked={filters.include_disabled}
                onChange={(e) => setFilters({ ...filters, include_disabled: e.target.checked })}
                className="filter-checkbox"
              >
                含已禁用
              </Checkbox>
            </Col>
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
                placeholder="姓名"
                value={filters.name || ''}
                onChange={(e) => setFilters({ ...filters, name: e.target.value || undefined })}
                prefix={<SearchOutlined />}
                allowClear
                className="filter-input"
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
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
              <Button onClick={load} block icon={<SearchOutlined />} className="search-btn">
                查询
              </Button>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ type: 'create', data: {} })} block className="create-btn">
                新增用户
              </Button>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Button icon={<UploadOutlined />} onClick={() => { setImportResult(null); setModal({ type: 'import' }); }} block className="import-btn">
                批量导入
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

      {modal?.type === 'create' && (
        <UserFormModal title="新增用户" initial={modal.data} onSave={handleCreate} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <UserFormModal title="编辑用户" initial={modal.data} ehrReadonly onSave={(body) => handleUpdate(modal.data.ehr_no, body)} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'resetPwd' && (
        <ResetPwdModal ehr_no={modal.data.ehr_no} onSave={handleResetPwd} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'import' && (
        <Modal title="批量导入" open onOk={handleImport} onCancel={() => setModal(null)} okButtonProps={{ disabled: !importFile }} okText="导入" width={520} className="import-modal">
          <p className="import-hint">
            Excel 需包含列：<strong>姓名、ehr号、组别</strong>；可选：<strong>角色、初始密码</strong>。无密码时默认 1234567。EHR 号必须为 7 位数字。
          </p>
          <div className="import-file-input">
            <UploadOutlined />
            <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0])} />
            <span className="file-name">{importFile?.name || '选择文件...'}</span>
          </div>
          {importResult?.errors?.length > 0 && (
            <Alert type="warning" message="格式错误" description={importResult.errors.map((err, i) => <div key={i}>{err}</div>)} className="import-error" />
          )}
        </Modal>
      )}
    </div>
  );
}

function UserFormModal({ title, initial, ehrReadonly, onSave, onCancel }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      ehr_no: initial.ehr_no ?? '',
      name: initial.name ?? '',
      group_name: initial.group_name ?? '',
      role: initial.role ?? 'user',
      initial_password: initial.initial_password ?? '',
    });
  }, [initial, form]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (ehrReadonly) {
        await onSave({ name: values.name.trim(), group_name: values.group_name.trim(), role: values.role });
      } else {
        await onSave({ ehr_no: values.ehr_no.trim(), name: values.name.trim(), group_name: values.group_name.trim(), role: values.role, initial_password: values.initial_password || undefined });
      }
    } catch (e) {
      if (e.errorFields) return;
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} open onOk={submit} onCancel={onCancel} confirmLoading={loading} width={400} destroyOnClose className="user-form-modal">
      <Form form={form} layout="vertical">
        <Form.Item
          name="ehr_no"
          label="EHR 号"
          rules={[
            { required: true, message: '请输入 EHR 号' },
            ...(!ehrReadonly ? [{ pattern: /^\d{7}$/, message: 'EHR 号必须为 7 位数字' }] : []),
          ]}
        >
          <Input
            readOnly={ehrReadonly}
            placeholder={ehrReadonly ? undefined : '7 位数字'}
            maxLength={ehrReadonly ? undefined : 7}
            inputMode={ehrReadonly ? undefined : 'numeric'}
            onChange={ehrReadonly ? undefined : (e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 7);
              form.setFieldsValue({ ehr_no: v });
            }}
            className="modal-input"
          />
        </Form.Item>
        <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input className="modal-input" /></Form.Item>
        <Form.Item name="group_name" label="组别" rules={[{ required: true }]}><Input className="modal-input" /></Form.Item>
        <Form.Item name="role" label="角色" rules={[{ required: true }]}>
          <Select options={ROLE_OPTIONS} className="modal-select" />
        </Form.Item>
        {!ehrReadonly && <Form.Item name="initial_password" label="初始密码（不填则 1234567）"><Input.Password className="modal-input" /> </Form.Item>}
      </Form>
    </Modal>
  );
}

function ResetPwdModal({ ehr_no, onSave, onCancel }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      const { new_password } = await form.validateFields();
      setLoading(true);
      await onSave(ehr_no, new_password);
    } catch (e) {
      if (e.errorFields) return;
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`重置密码 - ${ehr_no}`} open onOk={submit} onCancel={onCancel} confirmLoading={loading} destroyOnClose className="reset-pwd-modal">
      <Form form={form} layout="vertical">
        <Form.Item name="new_password" label="新密码" rules={[{ required: true }, { min: 6, message: '至少 6 位' }]}>
          <Input.Password className="modal-input" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
