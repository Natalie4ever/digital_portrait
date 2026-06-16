// 智能筛选场景页 - Step 3
// 4 个场景 Tab：应急响应 / 活动选人 / 项目组队 / 人员调配
import { useState } from 'react';
import { Card, Tabs, Alert } from 'antd';
import ScenarioEmergencyTab from '../components/ScenarioEmergencyTab';
import ScenarioActivityTab from '../components/ScenarioActivityTab';
import ScenarioProjectTab from '../components/ScenarioProjectTab';
import ScenarioTransferTab from '../components/ScenarioTransferTab';
import './AdminProfiles.css';

const { TabPane } = Tabs;

export default function AdminScenarios() {
  const [activeTab, setActiveTab] = useState('emergency');

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">智能筛选场景</h2>
        <p className="admin-subtitle">4 大预设场景，快速找到符合条件的员工</p>
      </div>

      <Card className="admin-card">
        <Alert
          type="info"
          showIcon
          message="使用说明"
          description={
            <div>
              <div>• 应急响应：一键锁定应急先锋队成员，按通勤时间由近及远排序（其他员工置底）</div>
              <div>• 活动选人：根据兴趣标签（如舞蹈、主持、摄影）筛选有才艺员工</div>
              <div>• 项目组队：按技能+证书+项目经历多维评分，匹配度从高到低排序</div>
              <div>• 人员调配：推荐将员工从其他组调配到目标组，按综合评分排序</div>
            </div>
          }
          style={{ marginBottom: 16 }}
        />

        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
          <TabPane tab="🚨 应急响应" key="emergency">
            <ScenarioEmergencyTab />
          </TabPane>
          <TabPane tab="🎯 活动选人" key="activity">
            <ScenarioActivityTab />
          </TabPane>
          <TabPane tab="👥 项目组队" key="project">
            <ScenarioProjectTab />
          </TabPane>
          <TabPane tab="🔄 人员调配" key="transfer">
            <ScenarioTransferTab />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
