// 发展意向组件 - Step 1 1.3（修订版）
// 4 个部分折叠面板：职业发展方向 / 能力提升与学习需求 / 实践机会意向 / 其他补充
import { useState, useEffect } from 'react';
import {
  Card,
  Collapse,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Spin,
  Empty,
} from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { getDevelopmentIntent, saveDevelopmentIntent } from '../api';
import {
  DEVELOPMENT_PATH_OPTIONS,
  CORE_ABILITY_OPTIONS,
  LEARNING_METHOD_OPTIONS,
  PROJECT_INTEREST_OPTIONS,
  ROTATION_INTEREST_OPTIONS,
} from '../constants';

// 折叠面板配置：key 既是 Panel 的 key，也是 Form value 的容器
const PANELS = [
  { key: 'career', header: '第一部分：职业发展方向' },
  { key: 'ability', header: '第二部分：能力提升与学习需求' },
  { key: 'practice', header: '第三部分：实践机会意向' },
  { key: 'other', header: '第四部分：其他补充' },
];

const EMPTY_DATA = {
  development_path: null,
  short_term_goal: '',
  mid_term_goal: '',
  core_abilities: [],
  learning_methods: [],
  learning_courses: '',
  rotation_interest: null,
  rotation_target: '',
  project_interests: [],
  other_comments: '',
};

export default function DevelopmentIntent({ readOnly = false }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(null);
  const [activeKeys, setActiveKeys] = useState(['career']);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDevelopmentIntent();
      const d = res || EMPTY_DATA;
      setData(d);
      // 多选字段可能为 null/undefined，统一为 []
      form.setFieldsValue({
        development_path: d.development_path ?? null,
        short_term_goal: d.short_term_goal ?? '',
        mid_term_goal: d.mid_term_goal ?? '',
        core_abilities: Array.isArray(d.core_abilities) ? d.core_abilities : [],
        learning_methods: Array.isArray(d.learning_methods) ? d.learning_methods : [],
        learning_courses: d.learning_courses ?? '',
        rotation_interest: d.rotation_interest ?? null,
        rotation_target: d.rotation_target ?? '',
        project_interests: Array.isArray(d.project_interests) ? d.project_interests : [],
        other_comments: d.other_comments ?? '',
      });
    } catch (err) {
      message.error('加载发展意向失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    // 还原为初始数据
    const d = data || EMPTY_DATA;
    form.setFieldsValue({
      development_path: d.development_path ?? null,
      short_term_goal: d.short_term_goal ?? '',
      mid_term_goal: d.mid_term_goal ?? '',
      core_abilities: Array.isArray(d.core_abilities) ? d.core_abilities : [],
      learning_methods: Array.isArray(d.learning_methods) ? d.learning_methods : [],
      learning_courses: d.learning_courses ?? '',
      rotation_interest: d.rotation_interest ?? null,
      rotation_target: d.rotation_target ?? '',
      project_interests: Array.isArray(d.project_interests) ? d.project_interests : [],
      other_comments: d.other_comments ?? '',
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // 清理空字符串为 null
      const body = {
        development_path: values.development_path || null,
        short_term_goal: values.short_term_goal?.trim() || null,
        mid_term_goal: values.mid_term_goal?.trim() || null,
        core_abilities: values.core_abilities || [],
        learning_methods: values.learning_methods || [],
        learning_courses: values.learning_courses?.trim() || null,
        rotation_interest: values.rotation_interest || null,
        rotation_target: values.rotation_target?.trim() || null,
        project_interests: values.project_interests || [],
        other_comments: values.other_comments?.trim() || null,
      };
      const res = await saveDevelopmentIntent(body);
      setData(res);
      message.success('发展意向已保存');
      setEditing(false);
    } catch (err) {
      if (err.errorFields) {
        message.error('请检查表单填写是否完整');
        return;
      }
      message.error('保存失败：' + err.message);
    }
  };

  // 渲染每个 panel 的内容
  const renderCareer = () => (
    <>
      <Form.Item label="发展序列偏好（未来 2-3 年）" name="development_path">
        {editing ? (
          <Select options={DEVELOPMENT_PATH_OPTIONS} placeholder="请选择" allowClear />
        ) : (
          <span style={{ color: data?.development_path ? '#333' : '#999' }}>
            {data?.development_path || '—'}
          </span>
        )}
      </Form.Item>
      <Form.Item label="短期目标（1 年内）" name="short_term_goal">
        {editing ? (
          <Input.TextArea rows={3} placeholder="您希望掌握哪些新技能、主导或参与哪些重点项目？" />
        ) : (
          <ReadOnlyText value={data?.short_term_goal} />
        )}
      </Form.Item>
      <Form.Item label="中长期目标（2-3 年）" name="mid_term_goal">
        {editing ? (
          <Input.TextArea rows={3} placeholder="您期望的职位或角色是什么？（如：高级风控分析师、科技团队主管）" />
        ) : (
          <ReadOnlyText value={data?.mid_term_goal} />
        )}
      </Form.Item>
    </>
  );

  const renderAbility = () => (
    <>
      <Form.Item label="最希望提升的 3 项核心能力" name="core_abilities">
        {editing ? (
          <Select
            mode="multiple"
            options={CORE_ABILITY_OPTIONS}
            placeholder="可多选"
            allowClear
            maxTagCount="responsive"
          />
        ) : (
          <ReadOnlyTags value={data?.core_abilities} />
        )}
      </Form.Item>
      <Form.Item label="偏好的学习方式" name="learning_methods">
        {editing ? (
          <Select
            mode="multiple"
            options={LEARNING_METHOD_OPTIONS}
            placeholder="可多选"
            allowClear
            maxTagCount="responsive"
          />
        ) : (
          <ReadOnlyTags value={data?.learning_methods} />
        )}
      </Form.Item>
      <Form.Item label="希望学习的课程/认证" name="learning_courses">
        {editing ? (
          <Input.TextArea rows={2} placeholder="如：PMP、CFA、Python 数据分析等" />
        ) : (
          <ReadOnlyText value={data?.learning_courses} />
        )}
      </Form.Item>
    </>
  );

  const renderPractice = () => (
    <>
      <Form.Item label="是否愿意尝试轮岗/借调" name="rotation_interest">
        {editing ? (
          <Select options={ROTATION_INTEREST_OPTIONS} placeholder="请选择" allowClear />
        ) : (
          <span style={{ color: data?.rotation_interest ? '#333' : '#999' }}>
            {data?.rotation_interest || '—'}
          </span>
        )}
      </Form.Item>
      <Form.Item
        label="感兴趣的部门/领域"
        name="rotation_target"
        tooltip="如选择「是」时建议填写"
      >
        {editing ? (
          <Input placeholder="如：风控部、科技部、其他后台部门等" />
        ) : (
          <ReadOnlyText value={data?.rotation_target} />
        )}
      </Form.Item>
      <Form.Item label="项目参与意向" name="project_interests">
        {editing ? (
          <Select
            mode="multiple"
            options={PROJECT_INTEREST_OPTIONS}
            placeholder="可多选"
            allowClear
            maxTagCount="responsive"
          />
        ) : (
          <ReadOnlyTags value={data?.project_interests} />
        )}
      </Form.Item>
    </>
  );

  const renderOther = () => (
    <Form.Item label="其他补充" name="other_comments">
      {editing ? (
        <Input.TextArea
          rows={4}
          placeholder="是否有以上未提及的其他发展想法或需求？"
        />
      ) : (
        <ReadOnlyText value={data?.other_comments} />
      )}
    </Form.Item>
  );

  const panelMap = {
    career: renderCareer,
    ability: renderAbility,
    practice: renderPractice,
    other: renderOther,
  };

  const collapseItems = PANELS.map((p) => ({
    key: p.key,
    label: <span style={{ fontWeight: 500 }}>{p.header}</span>,
    children: panelMap[p.key](),
  }));

  return (
    <Card
      title={
        <Space>
          <span>📋 发展意向</span>
          <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>
            （银行后台岗位发展意向记录）
          </span>
        </Space>
      }
      extra={
        !readOnly &&
        (editing ? (
          <Space>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存
            </Button>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              取消
            </Button>
          </Space>
        ) : (
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
            {data ? '编辑' : '填写'}
          </Button>
        ))
      }
      style={{ marginBottom: 16 }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : !data && !editing ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="尚未填写发展意向"
        />
      ) : (
        <Form form={form} layout="vertical" disabled={!editing}>
          <Collapse
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys(keys)}
            items={collapseItems}
            bordered={false}
            style={{ background: 'transparent' }}
          />
        </Form>
      )}
    </Card>
  );
}

// 只读文本
function ReadOnlyText({ value }) {
  if (!value) return <span style={{ color: '#999' }}>—</span>;
  return <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span>;
}

// 只读多选 tag
function ReadOnlyTags({ value }) {
  if (!value || value.length === 0) {
    return <span style={{ color: '#999' }}>—</span>;
  }
  return (
    <Space wrap>
      {value.map((v) => (
        <span
          key={v}
          style={{
            display: 'inline-block',
            padding: '2px 10px',
            backgroundColor: '#e6f7ff',
            color: '#0050b3',
            border: '1px solid #91d5ff',
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {v}
        </span>
      ))}
    </Space>
  );
}
