// 组别密度柱图 - Step 4
import ReactECharts from 'echarts-for-react';
import { Empty } from 'antd';

export default function GroupDensityBar({ groups = [] }) {
  if (!groups.length) {
    return <Empty description="暂无组别数据" />;
  }
  const option = {
    title: {
      text: '各组别人数与应急先锋队',
      left: 'center',
      bottom: 10,
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['总人数', '应急先锋队人数'], top: 40 },
    grid: { top: 80, left: 60, right: 30, bottom: 60 },
    xAxis: {
      type: 'category',
      data: groups.map((g) => g.group_name),
      axisLabel: { rotate: groups.length > 5 ? 30 : 0, interval: 0 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '总人数',
        type: 'bar',
        data: groups.map((g) => g.count),
        itemStyle: { color: '#91d5ff' },
        barWidth: '30%',
      },
      {
        name: '应急先锋队人数',
        type: 'bar',
        data: groups.map((g) => g.is_emergency_count),
        itemStyle: { color: '#D05A6E' },
        barWidth: '30%',
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 380 }} />;
}
