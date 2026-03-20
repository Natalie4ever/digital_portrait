import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Spin,
  Alert,
  Modal,
  Tag,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { EditOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import { getHomeVisit } from '../api';
import { useAuth } from '../contexts/AuthContext';
import HomeVisitExport from '../components/HomeVisitExport';
import './AdminProfiles.css';

const TEAM_NAME = '审核处理团队';

export default function HomeVisitDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getHomeVisit(id);
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const canEdit = user?.role === 'leader';

  const handleExportPdf = async () => {
    setPdfLoading(true);
    let wrapper = null;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('home-visit-export-content');
      if (!element) {
        throw new Error('导出内容未找到');
      }
      // 克隆元素并移除 position:absolute，避免 html2pdf 对绝对定位元素导出空白 PDF 的已知问题
      const clone = element.cloneNode(true);
      clone.style.position = 'relative';
      clone.style.left = '0';
      clone.style.top = '0';
      wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;transform:translateX(-9999px);pointer-events:none';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const opt = {
        margin: 10,
        filename: `家访记录_${data?.visited_name}_${dayjs(data?.visit_time).format('YYYY-MM-DD')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdf().set(opt).from(clone).save();
    } catch (err) {
      console.error(err);
      message.error('导出失败：' + (err.message || '未知错误'));
    } finally {
      if (wrapper?.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-page">
        <Alert type="error" message={error || '记录不存在'} />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="admin-title">家访记录详情</h2>
          <p className="admin-subtitle">
            {data.visited_name}（{data.visited_ehr_no}） · {dayjs(data.visit_time).format('YYYY-MM-DD')}
          </p>
        </div>
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)}>
            预览打印
          </Button>
          <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={handleExportPdf}>
            导出 PDF
          </Button>
          {canEdit && (
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/home-visits/${id}/edit`)}>
              编辑
            </Button>
          )}
        </Space>
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

      <Card className="admin-card" style={{ marginBottom: 24 }}>
        <Descriptions title="家访明细" column={2} bordered size="small">
          <Descriptions.Item label="被家访人">{data.visited_name}（{data.visited_ehr_no}）</Descriptions.Item>
          <Descriptions.Item label="岗位">{data.position || '—'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{data.contact_phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="家访年度">{data.visit_year}</Descriptions.Item>
          <Descriptions.Item label="家访时间">{data.visit_time ? dayjs(data.visit_time).format('YYYY-MM-DD HH:mm') : '—'}</Descriptions.Item>
          <Descriptions.Item label="家访方式">
            <Tag color={data.visit_method === '线上' ? 'blue' : 'green'}>{data.visit_method}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="家访地址" span={2}>{data.visit_address || '—'}</Descriptions.Item>
          <Descriptions.Item label="家访人员及岗位" span={2}>{data.visitor_info || '—'}</Descriptions.Item>
          <Descriptions.Item label="是否已家访">
            <Tag color={data.is_visited ? 'success' : 'default'}>{data.is_visited ? '已家访' : '未家访'}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="admin-card">
        <Descriptions title="家访记录表" column={2} bordered size="small">
          <Descriptions.Item label="团队名称">{TEAM_NAME}</Descriptions.Item>
          <Descriptions.Item label="家访日期">{data.visit_date ? dayjs(data.visit_date).format('YYYY-MM-DD') : '—'}</Descriptions.Item>
          <Descriptions.Item label="被家访人">{data.visited_name}</Descriptions.Item>
          <Descriptions.Item label="岗位">{data.position || '—'}</Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>{data.address || '—'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{data.mobile || '—'}</Descriptions.Item>
          <Descriptions.Item label="家庭电话">{data.home_phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="家属1姓名">{data.family1_name || '—'}</Descriptions.Item>
          <Descriptions.Item label="家属1关系">{data.family1_relation || '—'}</Descriptions.Item>
          <Descriptions.Item label="家属1联系方式">{data.family1_contact || '—'}</Descriptions.Item>
          <Descriptions.Item label="家属1工作单位">{data.family1_work_unit || '—'}</Descriptions.Item>
          <Descriptions.Item label="家属2姓名">{data.family2_name || '—'}</Descriptions.Item>
          <Descriptions.Item label="家属2关系">{data.family2_relation || '—'}</Descriptions.Item>
          <Descriptions.Item label="家属2联系方式">{data.family2_contact || '—'}</Descriptions.Item>
          <Descriptions.Item label="家属2工作单位">{data.family2_work_unit || '—'}</Descriptions.Item>
          <Descriptions.Item label="员工家庭情况及家属反馈意见" span={2}>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{data.feedback || '—'}</pre>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <div id="home-visit-export-content" style={{ position: 'absolute', left: -9999, top: 0 }}>
        <HomeVisitExport data={data} />
      </div>

      <Modal
        title="打印预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>关闭</Button>,
          <Button
            key="print"
            type="primary"
            onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <!DOCTYPE html><html><head><meta charset="utf-8"><title>家访记录打印</title></head>
                  <body style="margin:0;padding:20px;font-family:SimSun,Microsoft YaHei,sans-serif">
                    <div id="print-content"></div>
                  </body></html>
                `);
                const container = printWindow.document.getElementById('print-content');
                const exportEl = document.getElementById('home-visit-export-content');
                if (container && exportEl) {
                  container.innerHTML = exportEl.innerHTML;
                }
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                  printWindow.print();
                  printWindow.close();
                }, 250);
              }
              setPreviewVisible(false);
            }}
          >
            打印
          </Button>,
        ]}
        width={800}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: 24, background: '#fff' }} id="home-visit-preview-content">
          <HomeVisitExport data={data} />
        </div>
      </Modal>
    </div>
  );
}
