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
} from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  batchImportUsers,
} from '../api';
import { ROLE_OPTIONS } from '../constants';

const ROLE_MAP = { user: '普通用户', leader: '组长', admin: '管理员' };

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
    { title: 'EHR 号', dataIndex: 'ehr_no', key: 'ehr_no' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '组别', dataIndex: 'group_name', key: 'group_name' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (r) => ROLE_MAP[r] },
    { title: '状态', dataIndex: 'is_disabled', key: 'is_disabled', render: (v) => (v ? '已禁用' : '正常') },
    {
      title: '状态操作',
      key: 'status_action',
      render: (_, u) => {
        const disabled = u.is_disabled;
        const style = disabled
          ? { backgroundColor: '#f6ffed', color: '#237804', border: '1px solid #b7eb8f' } // 启用按钮：浅绿
          : { backgroundColor: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e' }; // 禁用按钮：浅红
        return (
          <Button
            size="small"
            style={{
              borderRadius: 16,
              padding: '0 12px',
              height: 26,
              ...style,
            }}
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
    <div>
      <h2 style={{ marginBottom: 16 }}>用户管理</h2>
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Checkbox checked={filters.include_disabled} onChange={(e) => setFilters({ ...filters, include_disabled: e.target.checked })}>含已禁用</Checkbox>
          <Input placeholder="EHR 号" value={filters.ehr_no || ''} onChange={(e) => setFilters({ ...filters, ehr_no: e.target.value || undefined })} style={{ width: 120 }} />
          <Input placeholder="姓名" value={filters.name || ''} onChange={(e) => setFilters({ ...filters, name: e.target.value || undefined })} style={{ width: 120 }} />
          <Select placeholder="角色" value={filters.role || undefined} onChange={(v) => setFilters({ ...filters, role: v })} style={{ width: 120 }} allowClear>
            {ROLE_OPTIONS.map((o) => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
          </Select>
          <Button onClick={load}>查询</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ type: 'create', data: {} })}>新增用户</Button>
          <Button icon={<UploadOutlined />} onClick={() => { setImportResult(null); setModal({ type: 'import' }); }}>批量导入</Button>
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
        <Modal title="批量导入" open onOk={handleImport} onCancel={() => setModal(null)} okButtonProps={{ disabled: !importFile }} okText="导入" width={520}>
          <p>Excel 需包含列：姓名、ehr号、组别；可选：角色、初始密码。无密码时默认 1234567。EHR 号必须为 7 位数字。</p>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0])} style={{ marginTop: 8 }} />
          {importResult?.errors?.length > 0 && (
            <Alert type="warning" message="格式错误" description={importResult.errors.map((err, i) => <div key={i}>{err}</div>)} style={{ marginTop: 12 }} />
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
    <Modal title={title} open onOk={submit} onCancel={onCancel} confirmLoading={loading} width={400} destroyOnClose>
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
          />
        </Form.Item>
        <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="group_name" label="组别" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="role" label="角色" rules={[{ required: true }]}>
          <Select options={ROLE_OPTIONS} />
        </Form.Item>
        {!ehrReadonly && <Form.Item name="initial_password" label="初始密码（不填则 1234567）"><Input /> </Form.Item>}
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
    <Modal title={`重置密码 - ${ehr_no}`} open onOk={submit} onCancel={onCancel} confirmLoading={loading} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="new_password" label="新密码" rules={[{ required: true }, { min: 6, message: '至少 6 位' }]}>
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  );
}
