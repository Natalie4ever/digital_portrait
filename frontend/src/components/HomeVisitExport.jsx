import React from 'react';
import dayjs from 'dayjs';

const TEAM_NAME = '审核处理团队';

export default function HomeVisitExport({ data }) {
  if (!data) return null;

  const visitDate = data.visit_date
    ? dayjs(data.visit_date).format('YYYY/MM/DD')
    : (data.visit_time ? dayjs(data.visit_time).format('YYYY/MM/DD') : '');
  const visitorName = data.visitor_name || '';

  return (
    <div className="home-visit-export" style={exportStyles.container}>
      <h2 style={exportStyles.title}>集约运营中心（广东）员工家访记录表</h2>

      <table style={exportStyles.table}>
        <colgroup>
          <col style={{ width: '12.5%' }} />
          <col style={{ width: '12.5%' }} />
          <col style={{ width: '12.5%' }} />
          <col style={{ width: '12.5%' }} />
          <col style={{ width: '12.5%' }} />
          <col style={{ width: '12.5%' }} />
          <col style={{ width: '12.5%' }} />
          <col style={{ width: '12.5%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={exportStyles.cellLabel} colSpan={2}>团队名称</td>
            <td style={exportStyles.cellValue} colSpan={2}>{TEAM_NAME}</td>
            <td style={exportStyles.cellLabel} colSpan={2}>家访日期</td>
            <td style={exportStyles.cellValue} colSpan={2}>{visitDate}</td>
          </tr>
          <tr>
            <td style={exportStyles.cellLabel} colSpan={2}>被家访人</td>
            <td style={exportStyles.cellValue} colSpan={2}>{data.visited_name || ''}</td>
            <td style={exportStyles.cellLabel} colSpan={2}>岗位</td>
            <td style={exportStyles.cellValue} colSpan={2}>{data.position || ''}</td>
          </tr>
          <tr>
            <td style={exportStyles.cellLabel} rowSpan={2}>地址</td>
            <td style={exportStyles.cellValueTall} rowSpan={2} colSpan={3}>{data.address || ''}</td>
            <td style={exportStyles.cellLabel} colSpan={2}>手机号</td>
            <td style={exportStyles.cellValue} colSpan={2}>{data.mobile || ''}</td>
          </tr>
          <tr>
            <td style={exportStyles.cellLabel} colSpan={2}>家庭电话</td>
            <td style={exportStyles.cellValue} colSpan={2}>{data.home_phone || ''}</td>
          </tr>
          <tr>
            <td style={exportStyles.cellLabel}>家属姓名1</td>
            <td style={exportStyles.cellValue}>{data.family1_name || ''}</td>
            <td style={exportStyles.cellLabel}>关系</td>
            <td style={exportStyles.cellValue}>{data.family1_relation || ''}</td>
            <td style={exportStyles.cellLabel} colSpan={2}>联系方式</td>
            <td style={exportStyles.cellValue} colSpan={2}>{data.family1_contact || ''}</td>
          </tr>
          <tr>
            <td style={exportStyles.cellLabel} colSpan={2}>工作单位</td>
            <td style={exportStyles.cellValue} colSpan={6}>{data.family1_work_unit || ''}</td>
          </tr>
          <tr>
            <td style={exportStyles.cellLabel}>家属姓名2</td>
            <td style={exportStyles.cellValue}>{data.family2_name || ''}</td>
            <td style={exportStyles.cellLabel}>关系</td>
            <td style={exportStyles.cellValue}>{data.family2_relation || ''}</td>
            <td style={exportStyles.cellLabel} colSpan={2}>联系方式</td>
            <td style={exportStyles.cellValue} colSpan={2}>{data.family2_contact || ''}</td>
          </tr>
          <tr>
            <td style={exportStyles.cellLabel} colSpan={2}>工作单位</td>
            <td style={exportStyles.cellValue} colSpan={6}>{data.family2_work_unit || ''}</td>
          </tr>
        </tbody>
      </table>

      <div style={exportStyles.feedbackTitle}>员工家庭情况及家属反馈意见</div>
      <div style={exportStyles.feedbackContent}>
        {data.feedback || ''}
      </div>

      <div style={exportStyles.footer}>
        <span style={exportStyles.footerLabel}>家访人姓名：</span>
        <span style={exportStyles.footerValue}>{visitorName}</span>
        <span style={{ marginLeft: 40 }}>家访人签字：</span>
        <span style={exportStyles.signatureBox}></span>
      </div>
    </div>
  );
}

const exportStyles = {
  container: {
    fontFamily: 'SimSun, "Microsoft YaHei", sans-serif',
    fontSize: 14,
    color: '#000',
    padding: 20,
    width: '100%',
    maxWidth: 800,
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 16,
    tableLayout: 'fixed',
  },
  cellLabel: {
    border: '1px solid #000',
    padding: '8px 10px',
    backgroundColor: '#f5f5f5',
    fontWeight: 500,
    textAlign: 'center',
  },
  cellValue: {
    border: '1px solid #000',
    padding: '8px 10px',
  },
  cellValueTall: {
    border: '1px solid #000',
    padding: '8px 10px',
    verticalAlign: 'top',
    minHeight: 60,
  },
  feedbackTitle: {
    fontWeight: 500,
    marginBottom: 8,
  },
  feedbackContent: {
    border: '1px solid #000',
    padding: 12,
    minHeight: 200,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    marginBottom: 24,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerLabel: {
    marginRight: 4,
  },
  footerValue: {
    marginRight: 8,
  },
  signatureBox: {
    display: 'inline-block',
    width: 120,
    height: 24,
    borderBottom: '1px solid #000',
    verticalAlign: 'bottom',
  },
};
