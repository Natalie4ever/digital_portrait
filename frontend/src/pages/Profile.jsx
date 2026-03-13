import { useState, useEffect } from 'react';
import {
  Card,
  Spin,
  Alert,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  List,
  Tag,
  message,
  Modal,
  Row,
  Col,
} from 'antd';
import dayjs from 'dayjs';
import {
  getProfileMe,
  updateProfileBase,
  createSub,
  updateSub,
  deleteSub,
  upsertContact,
  addSkillTag,
  removeSkillTag,
  listSkillTagTemplates,
} from '../api';
import {
  GENDER_OPTIONS,
  NATION_OPTIONS,
  ID_TYPE_OPTIONS,
  MARITAL_OPTIONS,
  POLITICAL_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  DEGREE_OPTIONS,
  EDUCATION_TYPE_OPTIONS,
  RELATION_OPTIONS,
  LANGUAGE_OPTIONS,
  PROFICIENCY_OPTIONS,
} from '../constants';

function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return d;
}

const BASE_LABELS = {
  gender: '性别', nation: '民族', birth_date: '出生日期', job_title: '职位',
  id_type: '证件类型', id_number: '证件号码', native_place: '籍贯', birth_place: '出生地',
  household_place: '户籍地', work_start_date: '参加工作日期', hire_date: '入职日期', marital_status: '婚姻状况',
};

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [baseEdit, setBaseEdit] = useState(null);
  const [contactEdit, setContactEdit] = useState(null);
  const [editingSub, setEditingSub] = useState({ segment: null, id: null, data: null });
  const [addingSub, setAddingSub] = useState(null);
  const [baseForm] = Form.useForm();
  const [contactForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([getProfileMe(), listSkillTagTemplates()]);
      setProfile(p);
      setTemplates(t || []);
      setBaseEdit(null);
      setContactEdit(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (baseEdit && profile?.base) {
      const b = profile.base;
      baseForm.setFieldsValue({
        ...b,
        birth_date: b.birth_date ? dayjs(b.birth_date) : null,
        work_start_date: b.work_start_date ? dayjs(b.work_start_date) : null,
        hire_date: b.hire_date ? dayjs(b.hire_date) : null,
      });
    }
  }, [baseEdit, profile]);

  const saveBase = async () => {
    try {
      const values = await baseForm.validateFields();
      const body = { ...values, birth_date: values.birth_date?.format?.('YYYY-MM-DD'), work_start_date: values.work_start_date?.format?.('YYYY-MM-DD'), hire_date: values.hire_date?.format?.('YYYY-MM-DD') };
      await updateProfileBase(body);
      message.success('已保存');
      await load();
      setBaseEdit(null);
    } catch (e) {
      if (e.errorFields) return;
      message.error(e.message);
    }
  };

  const saveContact = async () => {
    try {
      const values = await contactForm.validateFields();
      await upsertContact(values);
      message.success('已保存');
      await load();
      setContactEdit(null);
    } catch (e) {
      if (e.errorFields) return;
      message.error(e.message);
    }
  };

  const saveSub = async (segment, id, body) => {
    try {
      if (id) await updateSub(segment, id, body);
      else await createSub(segment, body);
      message.success('已保存');
      await load();
      setEditingSub({ segment: null, id: null, data: null });
      setAddingSub(null);
    } catch (err) {
      message.error(err.message);
    }
  };

  const doDeleteSub = (segment, id) => {
    Modal.confirm({ title: '确定删除该条记录？', onOk: async () => {
      try {
        await deleteSub(segment, id);
        message.success('已删除');
        await load();
        setEditingSub({ segment: null, id: null, data: null });
      } catch (err) { message.error(err.message); }
    } });
  };

  useEffect(() => {
    if (contactEdit && profile?.contact) contactForm.setFieldsValue(profile.contact);
  }, [contactEdit, profile]);

  const addTag = async (tagName, templateId) => {
    try {
      await addSkillTag({ tag_name: tagName, template_id: templateId || null });
      await load();
    } catch (err) { message.error(err.message); }
  };
  const removeTag = async (id) => {
    try {
      await removeSkillTag(id);
      await load();
    } catch (err) { message.error(err.message); }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: 48 }} />;
  if (error) return <Alert type="error" message={error} />;
  if (!profile) return null;

  const base = profile.base || {};
  const contact = profile.contact || {};

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>我的档案</h2>
      <p style={{ color: '#666', marginBottom: 24 }}>姓名、EHR 号、组别不可修改。</p>

      <Card title="基础信息" style={{ marginBottom: 16 }}>
        <p><strong>姓名</strong> {profile.name} &nbsp; <strong>EHR 号</strong> {profile.ehr_no} &nbsp; <strong>组别</strong> {profile.group_name}</p>
        {!baseEdit ? (
          <Row gutter={[16, 0]}>
            {Object.entries(base).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
              <Col key={k} span={8}><strong>{BASE_LABELS[k]}</strong> {formatDate(v) || v}</Col>
            ))}
            <Col><Button type="primary" onClick={() => setBaseEdit(true)}>编辑</Button></Col>
          </Row>
        ) : (
          <Form form={baseForm} layout="vertical" onFinish={saveBase}>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="gender" label="性别"><Select options={GENDER_OPTIONS} allowClear placeholder="请选择" /></Form.Item></Col>
              <Col span={8}><Form.Item name="nation" label="民族"><Select options={NATION_OPTIONS} allowClear placeholder="请选择" showSearch optionFilterProp="label" /></Form.Item></Col>
              <Col span={8}><Form.Item name="birth_date" label="出生日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="job_title" label="职位"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="id_type" label="证件类型"><Select options={ID_TYPE_OPTIONS} allowClear /></Form.Item></Col>
              <Col span={8}><Form.Item name="id_number" label="证件号码"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="native_place" label="籍贯"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="birth_place" label="出生地"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="household_place" label="户籍地"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="work_start_date" label="参加工作日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="hire_date" label="入职日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="marital_status" label="婚姻状况"><Select options={MARITAL_OPTIONS} allowClear /></Form.Item></Col>
            </Row>
            <Space><Button type="primary" htmlType="submit">保存</Button><Button onClick={() => setBaseEdit(null)}>取消</Button></Space>
          </Form>
        )}
      </Card>

      <SubSection title="政治面貌" segment="political" list={profile.political} fields={[{ key: 'political_status', label: '政治面貌', type: 'select', options: POLITICAL_OPTIONS }, { key: 'join_date', label: '参加日期', type: 'date' }, { key: 'introducer', label: '介绍人', type: 'text' }]} editing={editingSub} setEditing={setEditingSub} adding={addingSub} setAdding={setAddingSub} saveSub={saveSub} doDeleteSub={doDeleteSub} />
      <SubSection title="学历学位" segment="education" list={profile.education} fields={[{ key: 'education_level', label: '学历', type: 'select', options: EDUCATION_LEVEL_OPTIONS }, { key: 'degree', label: '学位', type: 'select', options: DEGREE_OPTIONS }, { key: 'education_type', label: '教育类别', type: 'select', options: EDUCATION_TYPE_OPTIONS }, { key: 'school', label: '毕业学校', type: 'text' }]} editing={editingSub} setEditing={setEditingSub} adding={addingSub} setAdding={setAddingSub} saveSub={saveSub} doDeleteSub={doDeleteSub} />
      <SubSection title="配偶、子女及主要社会关系" segment="family" list={profile.family} fields={[{ key: 'relation', label: '与本人关系', type: 'select', options: RELATION_OPTIONS }, { key: 'name', label: '姓名', type: 'text' }, { key: 'birth_date', label: '出生日期', type: 'date' }, { key: 'work_unit_and_title', label: '工作单位及职务', type: 'text' }]} editing={editingSub} setEditing={setEditingSub} adding={addingSub} setAdding={setAddingSub} saveSub={saveSub} doDeleteSub={doDeleteSub} />
      <SubSection title="简历" segment="resume" list={profile.resume} fields={[{ key: 'start_time', label: '开始时间', type: 'date' }, { key: 'end_time', label: '结束时间', type: 'date' }, { key: 'unit_and_title', label: '工作单位及职务', type: 'text' }]} editing={editingSub} setEditing={setEditingSub} adding={addingSub} setAdding={setAddingSub} saveSub={saveSub} doDeleteSub={doDeleteSub} />
      <SubSection title="奖惩信息" segment="reward" list={profile.reward} fields={[{ key: 'reward_time', label: '奖惩时间', type: 'date' }, { key: 'reward_name', label: '奖惩名称', type: 'text' }]} editing={editingSub} setEditing={setEditingSub} adding={addingSub} setAdding={setAddingSub} saveSub={saveSub} doDeleteSub={doDeleteSub} />
      <SubSection title="外部资格" segment="qualification" list={profile.qualification} fields={[{ key: 'qualification_name', label: '资格名称', type: 'text' }, { key: 'obtain_time', label: '取得时间', type: 'date' }]} editing={editingSub} setEditing={setEditingSub} adding={addingSub} setAdding={setAddingSub} saveSub={saveSub} doDeleteSub={doDeleteSub} />
      <SubSection title="专业成果" segment="achievement" list={profile.achievement} fields={[{ key: 'achievement_name', label: '专业成果名称', type: 'text' }, { key: 'obtain_time', label: '取得时间', type: 'date' }]} editing={editingSub} setEditing={setEditingSub} adding={addingSub} setAdding={setAddingSub} saveSub={saveSub} doDeleteSub={doDeleteSub} />
      <SubSection title="语言能力" segment="language" list={profile.language} fields={[{ key: 'language', label: '语种', type: 'select', options: LANGUAGE_OPTIONS }, { key: 'proficiency', label: '熟练程度', type: 'select', options: PROFICIENCY_OPTIONS }]} editing={editingSub} setEditing={setEditingSub} adding={addingSub} setAdding={setAddingSub} saveSub={saveSub} doDeleteSub={doDeleteSub} />

      <Card title="通讯信息" style={{ marginBottom: 16 }}>
        {!contactEdit ? (
          <>
            {Object.entries(contact).filter(([k, v]) => !['id', 'profile_id'].includes(k) && v != null && v !== '').map(([k, v]) => (
              <p key={k}><strong>{{ mobile: '移动电话', office_phone: '办公电话', home_phone: '家庭电话', home_address: '家庭地址', email: '邮箱', commute_minutes: '通勤时间' }[k]}</strong> {v}</p>
            ))}
            <Button type="primary" onClick={() => setContactEdit(true)}>编辑</Button>
          </>
        ) : (
          <Form form={contactForm} layout="vertical" onFinish={saveContact}>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="mobile" label="移动电话"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="office_phone" label="办公电话"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="home_phone" label="家庭电话"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="home_address" label="家庭地址"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="email" label="邮箱"><Input /></Form.Item></Col>
              <Col span={4}><Form.Item name="commute_minutes" label="通勤时间(分钟)"><Input type="number" /></Form.Item></Col>
            </Row>
            <Space><Button type="primary" htmlType="submit">保存</Button><Button onClick={() => setContactEdit(null)}>取消</Button></Space>
          </Form>
        )}
      </Card>

      <Card title="技能标签">
        <SkillTagBlock tags={profile.skill_tags || []} templates={templates} onAdd={addTag} onRemove={removeTag} />
      </Card>
    </div>
  );
}

function SubSection({ title, segment, list, fields, editing, setEditing, adding, setAdding, saveSub, doDeleteSub }) {
  const isAdding = adding === segment;
  const edit = editing.segment === segment ? editing : null;
  const [addForm, setAddForm] = useState({});
  const [form] = Form.useForm();
  const data = edit?.data ?? (isAdding ? addForm : null);
  const setData = (next) => { if (edit) setEditing({ ...editing, data: next }); else setAddForm(next); };

  const openAdd = () => { setAdding(segment); setAddForm({}); form.resetFields(); };
  const openEdit = (item) => { setEditing({ segment, id: item.id, data: { ...item } }); form.setFieldsValue({ ...item, ...Object.fromEntries(fields.filter(f => f.type === 'date').map(f => [f.key, item[f.key] ? dayjs(item[f.key]) : null])) }); };
  const cancel = () => { setAdding(null); setEditing({ segment: null, id: null, data: null }); setAddForm({}); };
  const submit = (values) => {
    const body = { ...values };
    fields.filter(f => f.type === 'date').forEach(f => { if (body[f.key] && body[f.key].format) body[f.key] = body[f.key].format('YYYY-MM-DD'); });
    saveSub(segment, edit?.id, body);
  };

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      <List
        dataSource={list || []}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button type="link" size="small" onClick={() => openEdit(item)}>编辑</Button>,
              <Button type="link" size="small" danger onClick={() => doDeleteSub(segment, item.id)}>删除</Button>,
            ]}
          >
            {fields.map(f => (item[f.key] != null ? (f.type === 'date' ? formatDate(item[f.key]) : String(item[f.key])) : '')).filter(Boolean).join(' / ')}
          </List.Item>
        )}
      />
      {(!data || (!edit && !isAdding)) && <Button onClick={openAdd}>新增</Button>}
      {(edit || isAdding) && (
        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          style={{ marginTop: 16 }}
          initialValues={edit?.data ? { ...edit.data, ...Object.fromEntries(fields.filter(f => f.type === 'date').map(f => [f.key, edit.data[f.key] ? dayjs(edit.data[f.key]) : null])) } : {}}
        >
          {fields.map((f) => (
            <Form.Item key={f.key} name={f.key} label={f.label}>
              {f.type === 'select' && <Select options={f.options} allowClear placeholder="请选择" />}
              {f.type === 'date' && <DatePicker style={{ width: '100%' }} />}
              {f.type === 'text' && <Input />}
            </Form.Item>
          ))}
          <Space><Button type="primary" htmlType="submit">保存</Button><Button onClick={cancel}>取消</Button></Space>
        </Form>
      )}
    </Card>
  );
}

function SkillTagBlock({ tags, templates, onAdd, onRemove }) {
  const [custom, setCustom] = useState('');
  const [selTemplate, setSelTemplate] = useState('');

  const handleAdd = () => {
    const name = (selTemplate || custom || '').trim();
    if (!name) return;
    const t = templates.find((x) => x.name === name);
    onAdd(name, t?.id);
    setCustom('');
    setSelTemplate('');
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        {(tags || []).map((t) => (
          <Tag key={t.id} closable onClose={() => onRemove(t.id)} style={{ marginBottom: 8 }}>{t.tag_name}</Tag>
        ))}
      </div>
      <Space>
        <Select value={selTemplate || undefined} onChange={(v) => { setSelTemplate(v || ''); setCustom(''); }} placeholder="选择预定义标签" style={{ width: 160 }} allowClear>
          {templates.map((t) => <Select.Option key={t.id} value={t.name}>{t.name}</Select.Option>)}
        </Select>
        <Input placeholder="或输入自定义标签" value={custom} onChange={(e) => { setCustom(e.target.value); setSelTemplate(''); }} onPressEnter={handleAdd} style={{ width: 160 }} />
        <Button type="primary" onClick={handleAdd}>添加</Button>
      </Space>
    </div>
  );
}
