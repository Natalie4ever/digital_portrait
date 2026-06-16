// 团队能力分析页 - Step 4
import { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Space, message, Spin, Alert } from 'antd';
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  analyticsOverview,
  analyticsCertificates,
  analyticsRisks,
  analyticsEmergency,
  analyticsExport,
} from '../api';
import RiskWarningPanel from '../components/analytics/RiskWarningPanel';
import SkillRadarChart from '../components/analytics/SkillRadarChart';
import GroupDensityBar from '../components/analytics/GroupDensityBar';
import CertificatePie from '../components/analytics/CertificatePie';
import EmergencyCommuteBar from '../components/analytics/EmergencyCommuteBar';
import './AdminProfiles.css';

const THEME = '#D05A6E';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [overview, setOverview] = useState({ skills: [], groups: [], total_employees: 0 });
  const [certs, setCerts] = useState({ items: [], total_certs: 0 });
  const [risks, setRisks] = useState({ items: [], red_count: 0, yellow_count: 0, green_count: 0 });
  const [emg, setEmg] = useState({ items: [], total_emergency: 0, total_employees: 0, coverage_rate: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const [ov, cr, rk, em] = await Promise.all([
        analyticsOverview(),
        analyticsCertificates(),
        analyticsRisks(),
        analyticsEmergency(),
      ]);
      setOverview(ov);
      setCerts(cr);
      setRisks(rk);
      setEmg(em);
    } catch (err) {
      message.error('加载分析数据失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doExport = async () => {
    setExporting(true);
    try {
      const res = await analyticsExport();
      message.success(`已导出：${res.filename}`);
    } catch (err) {
      message.error('导出失败：' + err.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !overview.total_employees) {
    return <Spin size="large" style={{ display: 'block', margin: 48 }} />;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2 className="admin-title">团队能力分析</h2>
        <p className="admin-subtitle">数据驱动的团队能力洞察与风险预警</p>
      </div>

      <Card
        className="admin-card"
        title={
          <Space>
            <span>能力全景</span>
            <span style={{ fontSize: 12, color: '#999' }}>
              （总人数 {overview.total_employees} / 应急 {emg.total_emergency} / 覆盖率 {emg.coverage_rate}%）
            </span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={doExport} loading={exporting}>
              导出 Excel
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          message={
            <span>
              阈值规则：技能 <b>=1 严重</b>（红） / <b>2-3 轻度</b>（黄） / <b>4+ 健康</b>（绿）;
              应急先锋队 <b>&lt;3 严重</b> / <b>&lt;5 轻度</b> / <b>≥5 健康</b>
            </span>
          }
          style={{ marginBottom: 16 }}
        />

        {/* 风险预警 */}
        <RiskWarningPanel risks={risks} />

        {/* 能力全景 + 证书统计 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="技能分布 TOP 10" size="small">
              <SkillRadarChart skills={overview.skills} total={overview.total_employees} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="证书类型分布" size="small">
              <CertificatePie items={certs.items} total={certs.total_certs} />
            </Card>
          </Col>
        </Row>

        {/* 组别密度 + 应急通勤 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="组别人数与应急先锋队" size="small">
              <GroupDensityBar groups={overview.groups} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="应急先锋队通勤分布" size="small">
              <EmergencyCommuteBar
                items={emg.items}
                totalEmergency={emg.total_emergency}
                totalEmployees={emg.total_employees}
                coverage={emg.coverage_rate}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
