import { useState, useEffect } from 'react';
import { Card, Input, Button, message, Modal, Alert, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { listSkillTagTemplates, createSkillTagTemplate, deleteSkillTagTemplate } from '../api';

export default function AdminSkillTags() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    listSkillTagTemplates()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setError('');
    try {
      await createSkillTagTemplate(name);
      setNewName('');
      message.success('已添加');
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const remove = (id) => {
    Modal.confirm({ title: '确定删除该预定义标签？', onOk: async () => {
      try {
        await deleteSkillTagTemplate(id);
        message.success('已删除');
        load();
      } catch (e) {
        message.error(e.message);
      }
    } });
  };

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>技能标签模板（预定义）</h2>
      <p style={{ color: '#666', marginBottom: 16 }}>预定义标签可供所有用户在档案中选用；用户也可添加自定义标签。</p>
      <Card>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Space style={{ marginBottom: 16 }}>
          <Input placeholder="新标签名称" value={newName} onChange={(e) => setNewName(e.target.value)} onPressEnter={add} style={{ width: 200 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={add}>添加</Button>
        </Space>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {list.map((t, index) => {
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
                closable
                onClose={(e) => {
                  e.preventDefault();
                  remove(t.id);
                }}
                style={{
                  padding: '4px 12px',
                  fontSize: 14,
                  borderRadius: 16,
                  ...style,
                }}
              >
                {t.name}
              </Tag>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
