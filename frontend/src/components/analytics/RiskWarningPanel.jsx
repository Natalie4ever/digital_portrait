// 风险预警面板 - Step 4
// 绿/黄/红三级 Badge，点击弹详情 Modal（不跳转）
import { useState } from 'react';
import { Card, Tag, Space, Modal, List, Empty, Statistic, Row, Col } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

const LEVEL_META = {
  red: { color: 'red', icon: <CloseCircleOutlined />, label: '严重' },
  yellow: { color: 'orange', icon: <WarningOutlined />, label: '轻度' },
  green: { color: 'green', icon: <CheckCircleOutlined />, label: '健康' },
};

const TYPE_LABEL = {
  skill: '关键技能',
  emergency: '应急能力',
};

function RiskItem({ risk, onClick }) {
  const meta = LEVEL_META[risk.level] || LEVEL_META.green;
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        padding: '10px 14px',
        borderRadius: 6,
        background: '#fafafa',
        marginBottom: 8,
        borderLeft: `4px solid var(--ant-color-${meta.color === 'red' ? 'red' : meta.color === 'yellow' ? 'orange' : 'green'})`,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#fafafa')}
    >
      <Space size="small" wrap>
        <Tag color={meta.color} icon={meta.icon} style={{ fontWeight: 500 }}>
          {meta.label}
        </Tag>
        <Tag color="default">{TYPE_LABEL[risk.type]}</Tag>
        <span style={{ fontWeight: 500 }}>{risk.title}</span>
      </Space>
      {risk.description && (
        <div style={{ color: '#666', fontSize: 13, marginTop: 4, marginLeft: 8 }}>
          {risk.description}
        </div>
      )}
    </div>
  );
}

export default function RiskWarningPanel({ risks = { items: [], red_count: 0, yellow_count: 0, green_count: 0 } }) {
  const [detail, setDetail] = useState(null);
  const items = risks.items || [];

  return (
    <Card
      title={
        <Space>
          <WarningOutlined style={{ color: '#fa8c16' }} />
          <span>⚠️ 风险预警</span>
        </Space>
      }
      extra={
        <Space size="middle">
          <Statistic
            title="严重"
            value={risks.red_count}
            valueStyle={{ color: '#cf1322', fontSize: 16 }}
          />
          <Statistic
            title="轻度"
            value={risks.yellow_count}
            valueStyle={{ color: '#fa8c16', fontSize: 16 }}
          />
          <Statistic
            title="健康"
            value={risks.green_count}
            valueStyle={{ color: '#52c41a', fontSize: 16 }}
          />
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {items.length === 0 ? (
        <Empty description="暂无预警数据" />
      ) : (
        <div>
          {items.map((r, idx) => (
            <RiskItem key={idx} risk={r} onClick={() => setDetail(r)} />
          ))}
        </div>
      )}

      <Modal
        title={
          <Space>
            <Tag color={LEVEL_META[detail?.level]?.color}>{LEVEL_META[detail?.level]?.label}</Tag>
            <span>{detail?.title}</span>
          </Space>
        }
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={520}
      >
        {detail?.description && (
          <div style={{ marginBottom: 12, color: '#666' }}>{detail.description}</div>
        )}
        <div style={{ fontWeight: 500, marginBottom: 8 }}>详情：</div>
        {detail?.details?.length > 0 ? (
          <List
            size="small"
            bordered
            dataSource={detail.details}
            renderItem={(it) => <List.Item>{it}</List.Item>}
          />
        ) : (
          <div style={{ color: '#999' }}>无详情</div>
        )}
      </Modal>
    </Card>
  );
}
