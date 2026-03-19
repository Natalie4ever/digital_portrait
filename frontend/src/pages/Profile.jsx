import { useState, useEffect, useCallback } from 'react';
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
  Tag,
  message,
  Modal,
  Row,
  Col,
  Cascader,
  Descriptions,
  Table,
  Timeline,
} from 'antd';
import dayjs from 'dayjs';
import {
  getProfileMe,
  getProfileByEhr,
  updateProfileBase,
  createSub,
  updateSub,
  deleteSub,
  upsertContact,
  addSkillTag,
  removeSkillTag,
  listSkillTagTemplates,
} from '../api';
import { useLocation } from 'react-router-dom';
import {
  GENDER_OPTIONS,
  NATION_OPTIONS,
  ID_TYPE_OPTIONS,
  MARITAL_OPTIONS,
  POLITICAL_OPTIONS,
  EDUCATION_CATEGORY_OPTIONS,
  EDUCATION_TYPE_OPTIONS_EDU,
  EDUCATION_LEVEL_OPTIONS,
  DEGREE_OPTIONS,
  COMPLETION_STATUS_OPTIONS,
  COUNTRY_OPTIONS,
  RELATION_OPTIONS,
  FAMILY_RELATION_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  LANGUAGE_OPTIONS,
  PROFICIENCY_OPTIONS,
  REWARD_TYPE_OPTIONS,
} from '../constants';

function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return d;
}

const BASE_LABELS = {
  name: '姓名', ehr_no: 'EHR 号', group_name: '组别',
  gender: '性别', nation: '民族', birth_date: '出生日期', job_title: '职位',
  id_type: '证件类型', id_number: '证件号码', native_place: '籍贯', birth_place: '出生地',
  household_place: '户籍地', work_start_date: '参加工作日期', hire_date: '入职日期', marital_status: '婚姻状况',
};

const CONTACT_LABELS = {
  mobile: '移动电话', office_phone: '办公电话', home_phone: '家庭电话',
  home_address: '家庭地址', email: '邮箱', commute_minutes: '通勤时间(分钟)',
};

// 将级联选择的值（省/市/区数组）转为无分隔符拼接字符串；若只有 2 级则用市补足为 3 段
function placeArrayToString(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return undefined;
  if (arr.length === 3) return arr.join('');
  return arr[0] + arr[1] + arr[1];
}

// 根据无分隔符拼接字符串，在省市区树中反查路径 [省, 市, 区]，用于编辑回填
function findPathByConcatenatedName(nodes, targetStr, path = []) {
  if (!nodes?.length || !targetStr) return null;
  for (const node of nodes) {
    const name = node.name;
    if (!name) continue;
    const currentPath = path.concat(name);
    if (currentPath.join('') === targetStr) return currentPath;
    if (node.children?.length) {
      const found = findPathByConcatenatedName(node.children, targetStr, currentPath);
      if (found) return found;
    }
  }
  return null;
}

const REGION_FIELDNAMES = { label: 'name', value: 'name', children: 'children' };

export default function Profile({ ehrOverride }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const ehrFromQuery = searchParams.get('ehr');
  const ehrParam = ehrOverride || ehrFromQuery;
  const viewingOthers = !!ehrParam;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);
  const [baseEdit, setBaseEdit] = useState(null);
  const [contactEdit, setContactEdit] = useState(null);
  const [editingSub, setEditingSub] = useState({ segment: null, id: null, data: null });
  const [addingSub, setAddingSub] = useState(null);
  const [baseForm] = Form.useForm();
  const [contactForm] = Form.useForm();

  useEffect(() => {
    fetch('/region.json')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => (Array.isArray(data) && setRegionOptions(data)) || undefined)
      .catch(() => setRegionOptions([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profilePromise = ehrParam ? getProfileByEhr(ehrParam) : getProfileMe();
      const [p, t] = await Promise.all([profilePromise, listSkillTagTemplates()]);
      setProfile(p);
      setTemplates(t || []);
      setBaseEdit(null);
      setContactEdit(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ehrParam]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!baseEdit || !profile) return;
    const b = profile.base || {};
    const placeValue = (str) => (regionOptions.length ? findPathByConcatenatedName(regionOptions, str) ?? undefined : undefined);
    baseForm.setFieldsValue({
      ...b,
      name: profile.name,
      ehr_no: profile.ehr_no,
      group_name: profile.group_name,
      birth_date: b.birth_date ? dayjs(b.birth_date) : null,
      work_start_date: b.work_start_date ? dayjs(b.work_start_date) : null,
      hire_date: b.hire_date ? dayjs(b.hire_date) : null,
      native_place: placeValue(b.native_place),
      birth_place: placeValue(b.birth_place),
      household_place: placeValue(b.household_place),
    });
  }, [baseEdit, profile, regionOptions, baseForm]);

  const saveBase = async () => {
    try {
      const values = await baseForm.validateFields();
      const { ...rest } = values;
      const body = {
        ...rest,
        birth_date: values.birth_date?.format?.('YYYY-MM-DD'),
        work_start_date: values.work_start_date?.format?.('YYYY-MM-DD'),
        hire_date: values.hire_date?.format?.('YYYY-MM-DD'),
        native_place: placeArrayToString(values.native_place),
        birth_place: placeArrayToString(values.birth_place),
        household_place: placeArrayToString(values.household_place),
      };
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
      const res = id
        ? await updateSub(segment, id, body)
        : await createSub(segment, body);
      setProfile((prev) => {
        const next = { ...prev };
        const list = [...(next[segment] || [])];
        if (id) {
          const idx = list.findIndex((item) => item.id === id);
          if (idx >= 0) list[idx] = res;
          else list.push(res);
        } else {
          list.push(res);
        }
        next[segment] = list;
        return next;
      });
      message.success('已保存');
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
        setProfile((prev) => {
          const next = { ...prev };
          next[segment] = (prev[segment] || []).filter((item) => item.id !== id);
          return next;
        });
        message.success('已删除');
        setEditingSub({ segment: null, id: null, data: null });
      } catch (err) { message.error(err.message); }
    } });
  };

  useEffect(() => {
    if (contactEdit && profile?.contact) contactForm.setFieldsValue(profile.contact);
  }, [contactEdit, profile, contactForm]);

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
  const titleName = viewingOthers ? `${profile.name || '员工'} 的档案` : '我的档案';
  const subtitle = viewingOthers
    ? `EHR：${profile.ehr_no || '—'}，组别：${profile.group_name || '—'}，角色：${profile.role || '—'}`
    : '';

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>{titleName}</h2>
      <p style={{ color: '#666', marginBottom: 24 }}>{subtitle}</p>

      <Card title="基础信息" style={{ marginBottom: 16 }}>
        {!baseEdit && !viewingOthers ? (
          <>
            <Descriptions
              column={2}
              bordered
              size="small"
              labelStyle={{ width: 100, backgroundColor: '#fafafa' }}
              style={{ marginBottom: 16 }}
              items={[
                { key: 'name', label: BASE_LABELS.name, children: profile.name ?? '—' },
                { key: 'ehr_no', label: BASE_LABELS.ehr_no, children: profile.ehr_no ?? '—' },
                { key: 'group_name', label: BASE_LABELS.group_name, children: profile.group_name ?? '—' },
                ...['gender', 'nation', 'birth_date', 'job_title', 'id_type', 'id_number', 'native_place', 'birth_place', 'household_place', 'work_start_date', 'hire_date', 'marital_status'].map((k) => ({
                  key: k,
                  label: BASE_LABELS[k],
                  children: base[k] != null && base[k] !== '' ? (['birth_date', 'work_start_date', 'hire_date'].includes(k) ? (formatDate(base[k]) || base[k]) : base[k]) : '—',
                })),
              ]}
            />
            <Button type="primary" onClick={() => setBaseEdit(true)}>编辑</Button>
          </>
        ) : !viewingOthers ? (
          <Form form={baseForm} layout="vertical" onFinish={saveBase}>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="name" label="姓名"><Input disabled style={{ color: 'rgba(0,0,0,0.45)' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="ehr_no" label="EHR 号"><Input disabled style={{ color: 'rgba(0,0,0,0.45)' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="group_name" label="组别"><Input disabled style={{ color: 'rgba(0,0,0,0.45)' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="gender" label="性别"><Select options={GENDER_OPTIONS} allowClear placeholder="请选择" /></Form.Item></Col>
              <Col span={8}><Form.Item name="nation" label="民族"><Select options={NATION_OPTIONS} allowClear placeholder="请选择" showSearch optionFilterProp="label" /></Form.Item></Col>
              <Col span={8}><Form.Item name="birth_date" label="出生日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="job_title" label="职位"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="id_type" label="证件类型"><Select options={ID_TYPE_OPTIONS} allowClear /></Form.Item></Col>
              <Col span={8}><Form.Item name="id_number" label="证件号码"><Input maxLength={30} placeholder="如18位身份证号" /></Form.Item></Col>
              <Col span={8}>
                <Form.Item
                  name="native_place"
                  label="籍贯"
                  rules={[{ required: true, message: '请选择省、市、区/县' }, { validator: (_, val) => (Array.isArray(val) && val.length >= 2 ? Promise.resolve() : Promise.reject(new Error('请选满省、市、区/县'))) }]}
                >
                  <Cascader
                    options={regionOptions}
                    fieldNames={REGION_FIELDNAMES}
                    placeholder="请选择省、市、区/县"
                    showSearch={{ filter: (input, path) => path.some((n) => n.name.includes(input)) }}
                    changeOnSelect={false}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="birth_place"
                  label="出生地"
                  rules={[{ required: true, message: '请选择省、市、区/县' }, { validator: (_, val) => (Array.isArray(val) && val.length >= 2 ? Promise.resolve() : Promise.reject(new Error('请选满省、市、区/县'))) }]}
                >
                  <Cascader
                    options={regionOptions}
                    fieldNames={REGION_FIELDNAMES}
                    placeholder="请选择省、市、区/县"
                    showSearch={{ filter: (input, path) => path.some((n) => n.name.includes(input)) }}
                    changeOnSelect={false}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="household_place"
                  label="户籍地"
                  rules={[{ required: true, message: '请选择省、市、区/县' }, { validator: (_, val) => (Array.isArray(val) && val.length >= 2 ? Promise.resolve() : Promise.reject(new Error('请选满省、市、区/县'))) }]}
                >
                  <Cascader
                    options={regionOptions}
                    fieldNames={REGION_FIELDNAMES}
                    placeholder="请选择省、市、区/县"
                    showSearch={{ filter: (input, path) => path.some((n) => n.name.includes(input)) }}
                    changeOnSelect={false}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}><Form.Item name="work_start_date" label="参加工作日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="hire_date" label="入职日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="marital_status" label="婚姻状况"><Select options={MARITAL_OPTIONS} allowClear /></Form.Item></Col>
            </Row>
            <Space><Button type="primary" htmlType="submit">保存</Button><Button onClick={() => setBaseEdit(null)}>取消</Button></Space>
          </Form>
        ) : (
          <Descriptions
            column={2}
            bordered
            size="small"
            labelStyle={{ width: 100, backgroundColor: '#fafafa' }}
            style={{ marginBottom: 0 }}
            items={[
              { key: 'name', label: BASE_LABELS.name, children: profile.name ?? '—' },
              { key: 'ehr_no', label: BASE_LABELS.ehr_no, children: profile.ehr_no ?? '—' },
              { key: 'group_name', label: BASE_LABELS.group_name, children: profile.group_name ?? '—' },
              ...['gender', 'nation', 'birth_date', 'job_title', 'id_type', 'id_number', 'native_place', 'birth_place', 'household_place', 'work_start_date', 'hire_date', 'marital_status'].map((k) => ({
                key: k,
                label: BASE_LABELS[k],
                children: base[k] != null && base[k] !== '' ? (['birth_date', 'work_start_date', 'hire_date'].includes(k) ? (formatDate(base[k]) || base[k]) : base[k]) : '—',
              })),
            ]}
          />
        )}
      </Card>

      <Card title="技能标签" style={{ marginBottom: 16 }}>
        {viewingOthers ? (
          (profile.skill_tags && profile.skill_tags.length > 0)
            ? profile.skill_tags.map((t, index) => {
                const palette = [
                  { backgroundColor: '#e6f7ff', color: '#0050b3', borderColor: '#91d5ff' }, // 浅蓝
                  { backgroundColor: '#f6ffed', color: '#237804', borderColor: '#b7eb8f' }, // 浅绿
                  { backgroundColor: '#fff7e6', color: '#ad4e00', borderColor: '#ffd591' }, // 浅橙
                  { backgroundColor: '#fff0f6', color: '#c41d7f', borderColor: '#ffadd2' }, // 浅粉
                ];
                const style = palette[index % palette.length];
                return (
                  <Tag
                    key={t.id}
                    style={{
                      marginBottom: 8,
                      padding: '4px 12px',
                      fontSize: 14,
                      borderRadius: 16,
                      ...style,
                    }}
                  >
                    {t.tag_name}
                  </Tag>
                );
              })
            : '—'
        ) : (
          <SkillTagBlock tags={profile.skill_tags || []} templates={templates} onAdd={addTag} onRemove={removeTag} />
        )}
      </Card>

      <PoliticalSection
        list={profile.political}
        editing={editingSub}
        setEditing={setEditingSub}
        adding={addingSub}
        setAdding={setAddingSub}
        saveSub={saveSub}
        doDeleteSub={doDeleteSub}
        readOnly={viewingOthers}
      />
      <TableSubSection
        title="学历学位"
        segment="education"
        list={profile.education}
        tableFields={['education_level', 'degree', 'education_category', 'school']}
        formColumns={3}
        fields={[{ key: 'education_category', label: '教育类别', type: 'select', options: EDUCATION_CATEGORY_OPTIONS }, { key: 'education_type', label: '教育类型', type: 'select', options: EDUCATION_TYPE_OPTIONS_EDU }, { key: 'education_level', label: '学历', type: 'select', options: EDUCATION_LEVEL_OPTIONS }, { key: 'degree', label: '学位', type: 'select', options: DEGREE_OPTIONS }, { key: 'school', label: '毕业学校', type: 'text' }, { key: 'major_name', label: '专业名称', type: 'text' }, { key: 'duration_years', label: '学制', type: 'number' }, { key: 'enrollment_date', label: '入学时间', type: 'date' }, { key: 'graduation_date', label: '毕业时间', type: 'date' }, { key: 'completion_status', label: '学习完成情况', type: 'select', options: COMPLETION_STATUS_OPTIONS }, { key: 'country', label: '学历（学业）授予国家（地区）', type: 'select', options: COUNTRY_OPTIONS }]}
        editing={editingSub}
        setEditing={setEditingSub}
        adding={addingSub}
        setAdding={setAddingSub}
        saveSub={saveSub}
        doDeleteSub={doDeleteSub}
        readOnly={viewingOthers}
      />
      <TableSubSection
        title="配偶、子女及主要社会关系"
        segment="family"
        list={profile.family}
        tableFields={['relation', 'name', 'birth_date', 'work_unit_and_title']}
        formColumns={3}
        fields={[{ key: 'name', label: '亲属姓名', type: 'text' }, { key: 'gender', label: '亲属性别', type: 'select', options: GENDER_OPTIONS }, { key: 'relation', label: '亲属与本人关系', type: 'select', options: FAMILY_RELATION_OPTIONS }, { key: 'birth_date', label: '亲属出生日期', type: 'date' }, { key: 'work_unit_and_title', label: '亲属工作单位及职位', type: 'text' }, { key: 'political_status', label: '亲属政治面貌', type: 'select', options: POLITICAL_OPTIONS }, { key: 'employment_status', label: '人员状况', type: 'select', options: EMPLOYMENT_STATUS_OPTIONS }]}
        editing={editingSub}
        setEditing={setEditingSub}
        adding={addingSub}
        setAdding={setAddingSub}
        saveSub={saveSub}
        doDeleteSub={doDeleteSub}
        readOnly={viewingOthers}
      />
      <TableSubSection
        title="简历"
        segment="resume"
        list={profile.resume}
        formColumns={3}
        fields={[{ key: 'start_time', label: '开始时间', type: 'date' }, { key: 'end_time', label: '结束时间', type: 'date' }, { key: 'unit_and_title', label: '工作单位及职务', type: 'text' }]}
        editing={editingSub}
        setEditing={setEditingSub}
        adding={addingSub}
        setAdding={setAddingSub}
        saveSub={saveSub}
        doDeleteSub={doDeleteSub}
        readOnly={viewingOthers}
      />
      <TableSubSection
        title="奖惩信息"
        segment="reward"
        list={profile.reward}
        tableFields={['reward_time', 'reward_name']}
        formColumns={3}
        fields={[{ key: 'reward_type', label: '奖惩类型', type: 'select', options: REWARD_TYPE_OPTIONS }, { key: 'reward_time', label: '奖惩时间', type: 'date' }, { key: 'reward_name', label: '奖惩名称', type: 'text' }, { key: 'reward_reason', label: '奖惩原因', type: 'text' }]}
        editing={editingSub}
        setEditing={setEditingSub}
        adding={addingSub}
        setAdding={setAddingSub}
        saveSub={saveSub}
        doDeleteSub={doDeleteSub}
        readOnly={viewingOthers}
      />
      <TableSubSection
        title="外部资格"
        segment="qualification"
        list={profile.qualification}
        formColumns={3}
        fields={[{ key: 'qualification_name', label: '资格名称', type: 'text' }, { key: 'obtain_time', label: '取得时间', type: 'date' }]}
        editing={editingSub}
        setEditing={setEditingSub}
        adding={addingSub}
        setAdding={setAddingSub}
        saveSub={saveSub}
        doDeleteSub={doDeleteSub}
        readOnly={viewingOthers}
      />
      <TableSubSection
        title="专业成果"
        segment="achievement"
        list={profile.achievement}
        formColumns={3}
        fields={[{ key: 'achievement_name', label: '专业成果名称', type: 'text' }, { key: 'obtain_time', label: '取得时间', type: 'date' }]}
        editing={editingSub}
        setEditing={setEditingSub}
        adding={addingSub}
        setAdding={setAddingSub}
        saveSub={saveSub}
        doDeleteSub={doDeleteSub}
        readOnly={viewingOthers}
      />
      <TableSubSection
        title="语言能力"
        segment="language"
        list={profile.language}
        tableFields={['language', 'proficiency']}
        formColumns={3}
        fields={[{ key: 'language', label: '语种', type: 'select', options: LANGUAGE_OPTIONS }, { key: 'proficiency', label: '熟练程度', type: 'select', options: PROFICIENCY_OPTIONS }, { key: 'cert_level_or_score', label: '语言能力证书级别/分数', type: 'text' }]}
        editing={editingSub}
        setEditing={setEditingSub}
        adding={addingSub}
        setAdding={setAddingSub}
        saveSub={saveSub}
        doDeleteSub={doDeleteSub}
        readOnly={viewingOthers}
      />

      <Card title="通讯信息" style={{ marginBottom: 16 }}>
        {!contactEdit && !viewingOthers ? (
          <>
            <Descriptions
              column={2}
              bordered
              size="small"
              labelStyle={{ width: 100, backgroundColor: '#fafafa' }}
              style={{ marginBottom: 16 }}
              items={['mobile', 'office_phone', 'home_phone', 'home_address', 'email', 'commute_minutes'].map((k) => ({
                key: k,
                label: CONTACT_LABELS[k],
                children: contact[k] != null && contact[k] !== '' ? contact[k] : '—',
              }))}
            />
            <Button type="primary" onClick={() => setContactEdit(true)}>编辑</Button>
          </>
        ) : !viewingOthers ? (
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
        ) : (
          <Descriptions
            column={2}
            bordered
            size="small"
            labelStyle={{ width: 100, backgroundColor: '#fafafa' }}
            style={{ marginBottom: 0 }}
            items={['mobile', 'office_phone', 'home_phone', 'home_address', 'email', 'commute_minutes'].map((k) => ({
              key: k,
              label: CONTACT_LABELS[k],
              children: contact[k] != null && contact[k] !== '' ? contact[k] : '—',
            }))}
          />
        )}
      </Card>
    </div>
  );
}

function PoliticalSection({ list, editing, setEditing, adding, setAdding, saveSub, doDeleteSub, readOnly }) {
  const segment = 'political';
  const isAdding = adding === segment;
  const edit = editing.segment === segment ? editing : null;
  const [form] = Form.useForm();

  const openAdd = () => { setAdding(segment); form.resetFields(); };
  const openEdit = (item) => {
    setEditing({ segment, id: item.id, data: { ...item } });
    form.setFieldsValue({
      ...item,
      join_date: item.join_date ? dayjs(item.join_date) : null,
    });
  };
  const cancel = () => { setAdding(null); setEditing({ segment: null, id: null, data: null }); };
  const submit = (values) => {
    const body = { ...values };
    if (body.join_date?.format) body.join_date = body.join_date.format('YYYY-MM-DD');
    saveSub(segment, edit?.id, body);
  };

  const columns = [
    { title: '政治面貌', dataIndex: 'political_status', key: 'political_status', width: '33.33%', ellipsis: true },
    { title: '参加日期', dataIndex: 'join_date', key: 'join_date', width: '33.33%', render: (v) => formatDate(v) || '—' },
    { title: '介绍人', dataIndex: 'introducer', key: 'introducer', width: '33.33%', ellipsis: true },
    ...(!readOnly ? [{
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => doDeleteSub(segment, record.id)}>删除</Button>
        </Space>
      ),
    }] : []),
  ];

  return (
    <Card title="政治面貌" style={{ marginBottom: 16 }}>
      <Table
        dataSource={list || []}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        tableLayout="fixed"
        style={{ marginBottom: 16, width: '100%' }}
      />
      {!readOnly && !edit && !isAdding && <Button block onClick={openAdd} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>新增</Button>}
      {!readOnly && (
      <Modal
        title={isAdding ? '新增政治面貌' : '编辑政治面貌'}
        open={!!edit || isAdding}
        onOk={() => form.submit()}
        onCancel={cancel}
        okText="确定"
        cancelText="取消"
        destroyOnClose
        width={400}
      >
        <Form form={form} layout="vertical" onFinish={submit} initialValues={edit?.data ? { ...edit.data, join_date: edit.data.join_date ? dayjs(edit.data.join_date) : null } : {}}>
          <Form.Item name="political_status" label="政治面貌"><Select options={POLITICAL_OPTIONS} allowClear placeholder="请选择" /></Form.Item>
          <Form.Item name="join_date" label="参加日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="introducer" label="介绍人"><Input /></Form.Item>
        </Form>
      </Modal>
      )}
    </Card>
  );
}

// 通用表格子表：与政治面貌一致的 UI（Table + 等分列 + 操作列 + 整行新增按钮 + Modal 新增/编辑）
// tableFields：可选，表格中展示的字段 key 数组（顺序生效）；不传则展示全部 fields
// formColumns：可选，弹窗表单列数（如 3 则三列排布），不传则单列竖向
function TableSubSection({ title, segment, list, fields, tableFields, formColumns, editing, setEditing, adding, setAdding, saveSub, doDeleteSub, readOnly }) {
  const isAdding = adding === segment;
  const edit = editing.segment === segment ? editing : null;
  const [form] = Form.useForm();
  const fieldsForTable = tableFields
    ? tableFields.map((key) => fields.find((f) => f.key === key)).filter(Boolean)
    : fields;
  const dataColWidth = fieldsForTable.length > 0 ? `${100 / fieldsForTable.length}%` : 'auto';

  const openAdd = () => { setAdding(segment); form.resetFields(); };
  const openEdit = (item) => {
    setEditing({ segment, id: item.id, data: { ...item } });
    form.setFieldsValue({
      ...item,
      ...Object.fromEntries(fields.filter(f => f.type === 'date').map(f => [f.key, item[f.key] ? dayjs(item[f.key]) : null])),
    });
  };
  const cancel = () => { setAdding(null); setEditing({ segment: null, id: null, data: null }); };
  const submit = (values) => {
    const body = { ...values };
    fields.filter(f => f.type === 'date').forEach(f => { if (body[f.key] && body[f.key].format) body[f.key] = body[f.key].format('YYYY-MM-DD'); });
    saveSub(segment, edit?.id, body);
  };

  // 弹窗多列时：字段数少于列数则按字段数等分一行
  const effectiveFormCols = formColumns ? Math.min(formColumns, Math.max(1, fields.length)) : 0;
  const formColSpan = effectiveFormCols > 0 ? 24 / effectiveFormCols : 24;
  const modalWidth = formColumns ? (effectiveFormCols === 1 ? 480 : effectiveFormCols === 2 ? 560 : 720) : 480;

  const columns = [
    ...fieldsForTable.map((f) => ({
      title: f.label,
      dataIndex: f.key,
      key: f.key,
      width: dataColWidth,
      ellipsis: true,
      render: (v) => (f.type === 'date' ? (formatDate(v) || '—') : (v != null && v !== '' ? String(v) : '—')),
    })),
    ...(!readOnly ? [{
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => doDeleteSub(segment, record.id)}>删除</Button>
        </Space>
      ),
    }] : []),
  ];

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      <Table
        dataSource={list || []}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        tableLayout="fixed"
        style={{ marginBottom: 16, width: '100%' }}
      />
      {!readOnly && !edit && !isAdding && <Button block onClick={openAdd} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>新增</Button>}
      {!readOnly && (
        <Modal
          title={isAdding ? `新增${title}` : `编辑${title}`}
          open={!!edit || isAdding}
          onOk={() => form.submit()}
          onCancel={cancel}
          okText="确定"
          cancelText="取消"
          destroyOnClose
          width={modalWidth}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={submit}
            initialValues={edit?.data ? { ...edit.data, ...Object.fromEntries(fields.filter(f => f.type === 'date').map(f => [f.key, edit.data[f.key] ? dayjs(edit.data[f.key]) : null])) } : {}}
          >
            {formColumns ? (
              <Row gutter={16}>
                {fields.map((f) => (
                  <Col key={f.key} span={formColSpan}>
                    <Form.Item name={f.key} label={f.label}>
                      {f.type === 'select' && <Select options={f.options} allowClear placeholder="请选择" />}
                      {f.type === 'date' && <DatePicker style={{ width: '100%' }} />}
                      {f.type === 'text' && <Input />}
                      {f.type === 'number' && <Input type="number" min={1} placeholder="年" />}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            ) : (
              fields.map((f) => (
                <Form.Item key={f.key} name={f.key} label={f.label}>
                  {f.type === 'select' && <Select options={f.options} allowClear placeholder="请选择" />}
                  {f.type === 'date' && <DatePicker style={{ width: '100%' }} />}
                  {f.type === 'text' && <Input />}
                  {f.type === 'number' && <Input type="number" min={1} placeholder="年" />}
                </Form.Item>
              ))
            )}
          </Form>
        </Modal>
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

  const palette = [
    { backgroundColor: '#e6f7ff', color: '#0050b3', borderColor: '#91d5ff' }, // 浅蓝
    { backgroundColor: '#f6ffed', color: '#237804', borderColor: '#b7eb8f' }, // 浅绿
    { backgroundColor: '#fff7e6', color: '#ad4e00', borderColor: '#ffd591' }, // 浅橙
    { backgroundColor: '#fff0f6', color: '#c41d7f', borderColor: '#ffadd2' }, // 浅粉
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        {(tags || []).map((t, index) => {
          const style = palette[index % palette.length];
          return (
            <Tag
              key={t.id}
              closable
              onClose={() => onRemove(t.id)}
              style={{
                marginBottom: 8,
                padding: '4px 12px',
                fontSize: 14,
                borderRadius: 16,
                ...style,
              }}
            >
              {t.tag_name}
            </Tag>
          );
        })}
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
