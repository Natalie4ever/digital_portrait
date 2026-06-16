// 应急先锋队通勤分布柱图 - Step 4
import ReactECharts from 'echarts-for-react';
import { Empty } from 'antd';

export default function EmergencyCommuteBar({ items = [], totalEmergency = 0, totalEmployees = 0, coverage = 0 }) {
  if (!items.length) {
    return <Empty description="暂无应急人员数据" />;
  }
  const option = {
    title: {
      text: '应急先锋队通勤分布',
      subtext: `应急先锋队 ${totalEmergency} 人 / 全员 ${totalEmployees} 人（覆盖率 ${coverage}%）`,
      left: 'center',
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 80, left: 60, right: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: items.map((it) => it.bucket),
      axisLabel: { interval: 0 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '人数',
        type: 'bar',
        data: items.map((it, i) => ({
          value: it.count,
          itemStyle: { color: i === 0 ? '#52c41a' : i === 1 ? '#1890ff' : i === 2 ? '#faad14' : '#bfbfbf' },
        })),
        label: { show: true, position: 'top' },
        barWidth: '50%',
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 320 }} />;
}
