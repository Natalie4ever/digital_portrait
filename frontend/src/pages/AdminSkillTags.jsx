import { useState, useEffect } from 'react';
import { Card, Input, Button, List, message, Modal, Alert, Space } from 'antd';
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
        <List
          loading={loading}
          dataSource={list}
          renderItem={(t) => (
            <List.Item actions={[<Button type="link" size="small" danger onClick={() => remove(t.id)}>删除</Button>]}>
              {t.name}
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
