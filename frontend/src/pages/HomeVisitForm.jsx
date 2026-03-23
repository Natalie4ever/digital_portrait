import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Steps,
  Row,
  Col,
  Switch,
  message,
  Spin,
  Alert,
} from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { listProfiles, getProfileByEhr, createHomeVisit, updateHomeVisit, getHomeVisit } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './AdminProfiles.css';

const FEEDBACK_TEMPLATE = `（一）家庭主要成员情况：
（二）员工八小时以外动向：
（三）员工思想动态：
（四）家庭经济状况：
（五）家庭关系情况：
（六）员工家庭生活实际困难：
（七）总体评价及跟进意见：`;

const VISIT_METHOD_OPTIONS = [
  { value: '线上', label: '线上' },
  { value: '线下', label: '线下' },
];

export default function HomeVisitForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState('');
  const [memberOptions, setMemberOptions] = useState([]);

  useEffect(() => {
    if (user?.role !== 'leader') return;
    listProfiles({ page: 1, page_size: 100, include_disabled: false })
      .then((res) => {
        const items = (res.items || []).filter((u) => u.ehr_no && u.name);
        setMemberOptions(items.map((u) => ({ value: u.ehr_no, label: `${u.name} (${u.ehr_no})` })));
        setError('');
      })
      .catch((err) => {
        setMemberOptions([]);
        setError(err.message || '');
      });
  }, [user?.role]);

  useEffect(() => {
    if (!isEdit || !id) return;
    setFetching(true);
    getHomeVisit(id)
      .then((data) => {
        form.setFieldsValue({
          visited_ehr_no: data.visited_ehr_no,
          visit_year: data.visit_year,
          visit_time: data.visit_time ? dayjs(data.visit_time).startOf('day') : null,
          visit_method: data.visit_method,
          visit_address: data.visit_address,
          visitor_info: data.visitor_info,
          is_visited: data.is_visited,
          visit_date: data.visit_date ? dayjs(data.visit_date) : (data.visit_time ? dayjs(data.visit_time).startOf('day') : null),
          position: data.position,
          contact_phone: data.contact_phone,
          address: data.address,
          mobile: data.mobile,
          home_phone: data.home_phone,
          family1_name: data.family1_name,
          family1_relation: data.family1_relation,
          family1_contact: data.family1_contact,
          family1_work_unit: data.family1_work_unit,
          family2_name: data.family2_name,
          family2_relation: data.family2_relation,
          family2_contact: data.family2_contact,
          family2_work_unit: data.family2_work_unit,
          feedback: data.feedback,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetching(false));
  }, [isEdit, id, form]);

  const onVisitedChange = async (ehrNo) => {
    if (!ehrNo) return;
    try {
      const profile = await getProfileByEhr(ehrNo);
      const contact = profile?.contact;
      const base = profile?.base;
      const family = profile?.family || [];
      // 从档案自动填充，空白则不填
      form.setFieldsValue({
        position: base?.job_title || undefined,
        contact_phone: contact?.mobile || contact?.office_phone || undefined,
        mobile: contact?.mobile || undefined,
        home_phone: contact?.home_phone || undefined,
        address: contact?.home_address || undefined,
        visit_address: contact?.home_address || undefined,
        family1_name: family[0]?.name || undefined,
        family1_relation: family[0]?.relation || undefined,
        family1_work_unit: family[0]?.work_unit_and_title || undefined,
        family2_name: family[1]?.name || undefined,
        family2_relation: family[1]?.relation || undefined,
        family2_work_unit: family[1]?.work_unit_and_title || undefined,
      });
    } catch {
      // ignore
    }
  };

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      if (step === 0) {
        const required = ['visited_ehr_no', 'visit_year', 'visit_time', 'visit_method'];
        for (const f of required) {
          if (values[f] === undefined || values[f] === null) {
            throw new Error('请填写必填项');
          }
        }
      }
      setStep(step + 1);
    } catch (err) {
      if (err.errorFields) {
        message.error('请完善必填项');
      } else {
        message.error(err.message || '校验失败');
      }
    }
  };

  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async () => {
    try {
      const values = await form.getFieldsValue();
      const payload = {
        visited_ehr_no: values.visited_ehr_no,
        visit_year: values.visit_year,
        visit_time: values.visit_time ? dayjs(values.visit_time).startOf('day').toISOString() : null,
        visit_method: values.visit_method,
        visit_address: values.visit_address,
        visitor_info: values.visitor_info,
        is_visited: values.is_visited ?? false,
        visit_date: values.visit_date ? values.visit_date.format('YYYY-MM-DD') : null,
        position: values.position,
        contact_phone: values.contact_phone,
        address: values.address,
        mobile: values.mobile,
        home_phone: values.home_phone,
        family1_name: values.family1_name,
        family1_relation: values.family1_relation,
        family1_contact: values.family1_contact,
        family1_work_unit: values.family1_work_unit,
        family2_name: values.family2_name,
        family2_relation: values.family2_relation,
        family2_contact: values.family2_contact,
        family2_work_unit: values.family2_work_unit,
        feedback: values.feedback,
      };
      if (!payload.visit_time) {
        message.error('请选择家访时间');
        return;
      }
      if (!payload.visit_method) {
        message.error('请选择家访方式');
        return;
      }

      setLoading(true);
      setError('');
      if (isEdit) {
        const updatePayload = { ...payload };
        delete updatePayload.visited_ehr_no;
        await updateHomeVisit(id, updatePayload);
        message.success('更新成功');
      } else {
        await createHomeVisit(payload);
        message.success('创建成功');
      }
      navigate('/home-visits');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'leader') {
    return (
      <div className="admin-page">
        <Alert type="warning" message="仅组长可新建或编辑家访记录" />
      </div>
    );
  }

  if (fetching) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const steps = [
    { title: '家访明细' },
    { title: '家访记录表' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">{isEdit ? '编辑家访记录' : '新建家访记录'}</h2>
        <p className="admin-subtitle">{isEdit ? '修改家访记录信息' : '填写家访明细和记录表'}</p>
      </div>

      <Card className="admin-card">
        <Steps current={step} style={{ marginBottom: 24 }}>
          {steps.map((s, i) => (
            <Steps.Step key={i} title={s.title} />
          ))}
        </Steps>

        {error && <Alert type="error" message={error} className="error-alert" style={{ marginBottom: 16 }} />}

        <Form form={form} layout="vertical" initialValues={{ is_visited: false, feedback: isEdit ? undefined : FEEDBACK_TEMPLATE }}>
          <div style={{ display: step === 0 ? 'block' : 'none' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="visited_ehr_no" label="被家访人" rules={[{ required: !isEdit, message: '请选择' }]}>
                    <Select
                      placeholder="选择组员"
                      showSearch
                      optionFilterProp="label"
                      options={memberOptions}
                      onChange={onVisitedChange}
                      disabled={isEdit}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="position" label="岗位">
                    <Input placeholder="可从档案带出" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="contact_phone" label="联系电话">
                    <Input placeholder="可从档案带出" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="visit_year" label="家访年度" rules={[{ required: true, message: '必填' }]}>
                    <Select placeholder="选择年度" options={Array.from({ length: 10 }, (_, i) => ({ value: new Date().getFullYear() - i, label: `${new Date().getFullYear() - i}年` }))} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="visit_time" label="家访时间" rules={[{ required: true, message: '必填' }]}>
                    <DatePicker
                      format="YYYY-MM-DD"
                      style={{ width: '100%' }}
                      onChange={(date) => {
                        if (date) form.setFieldsValue({ visit_date: date });
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="visit_method" label="家访方式" rules={[{ required: true, message: '必填' }]}>
                    <Select placeholder="线上/线下" options={VISIT_METHOD_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="visit_address" label="家访地址">
                    <Input placeholder="家访实际地址" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="visitor_info" label="家访人员及岗位">
                    <Input placeholder="执行家访的人员姓名及岗位" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="is_visited" label="是否已家访" valuePropName="checked">
                <Switch checkedChildren="已家访" unCheckedChildren="未家访" />
              </Form.Item>
          </div>

          <div style={{ display: step === 1 ? 'block' : 'none' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="团队名称">
                    <Input value="审核处理团队" disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="visit_date" label="家访日期">
                    <DatePicker
                      format="YYYY-MM-DD"
                      style={{ width: '100%' }}
                      onChange={(date) => {
                        if (date) form.setFieldsValue({ visit_time: date });
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="address" label="地址">
                    <Input placeholder="家庭地址" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="mobile" label="手机号">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="home_phone" label="家庭电话">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="family1_name" label="家属1姓名">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="family1_relation" label="家属1关系">
                    <Input placeholder="如：配偶" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="family1_contact" label="家属1联系方式">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="family1_work_unit" label="家属1工作单位">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="family2_name" label="家属2姓名">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="family2_relation" label="家属2关系">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="family2_contact" label="家属2联系方式">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="family2_work_unit" label="家属2工作单位">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="feedback" label="员工家庭情况及家属反馈意见">
                <Input.TextArea rows={12} />
              </Form.Item>
          </div>
        </Form>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {step > 0 && (
              <Button onClick={handlePrev}>上一步</Button>
            )}
          </div>
          <div>
            {step < 1 ? (
              <Button type="primary" onClick={handleNext}>下一步</Button>
            ) : (
              <Button type="primary" loading={loading} onClick={handleSubmit}>提交</Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
