import { useState, useEffect } from 'react';
import { Card, Input, Button, message, Modal, Alert, Space } from 'antd';
import { PlusOutlined, TagsOutlined } from '@ant-design/icons';
import { listSkillTagTemplates, createSkillTagTemplate, deleteSkillTagTemplate } from '../api';
import './AdminSkillTags.css';

const TAG_PALETTE = [
  { backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#A5B4FC' },
  { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#6EE7B7' },
  { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' },
  { backgroundColor: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5' },
  { backgroundColor: '#F5F3FF', color: '#7C3AED', borderColor: '#C4B5FD' },
  { backgroundColor: '#ECFCCB', color: '#4D7C0F', borderColor: '#A3E635' },
];

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
    Modal.confirm({
      title: '确定删除该预定义标签？',
      onOk: async () => {
        try {
          await deleteSkillTagTemplate(id);
          message.success('已删除');
          load();
        } catch (e) {
          message.error(e.message);
        }
      },
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">技能标签模板</h2>
        <p className="admin-subtitle">管理预定义技能标签</p>
      </div>

      <Card className="admin-card skill-tags-card">
        <div className="card-header">
          <div className="header-info">
            <TagsOutlined className="header-icon" />
            <div>
              <p className="header-title">预定义标签</p>
              <p className="header-desc">可供所有用户在档案中选用</p>
            </div>
          </div>
        </div>

        {error && <Alert type="error" message={error} className="error-alert" />}

        <Space className="add-section">
          <Input
            placeholder="输入新标签名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={add}
            className="tag-input"
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={add} className="add-btn">
            添加标签
          </Button>
        </Space>

        <div className="tags-container">
          {list.map((t, index) => {
            const style = TAG_PALETTE[index % TAG_PALETTE.length];
            return (
              <div key={t.id} className="tag-item">
                <span
                  className="tag-badge"
                  style={{
                    ...style,
                  }}
                >
                  {t.name}
                </span>
                <button
                  className="tag-close"
                  onClick={(e) => {
                    e.preventDefault();
                    remove(t.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
          {list.length === 0 && !loading && (
            <div className="empty-state">
              <TagsOutlined />
              <p>暂无预定义标签</p>
              <p className="empty-hint">添加一个标签开始使用</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
