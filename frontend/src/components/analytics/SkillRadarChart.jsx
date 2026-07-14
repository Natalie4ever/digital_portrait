// 技能分布雷达图 - Step 4
import ReactECharts from 'echarts-for-react';
import { Empty } from 'antd';

export default function SkillRadarChart({ skills = [], total = 0 }) {
  if (!skills.length) {
    return <Empty description="暂无技能数据" />;
  }
  // 取前 10 个
  const top = skills.slice(0, 10);
  const option = {
    title: {
      text: '技能分布 TOP 10',
      subtext: `共 ${total} 名员工 / ${skills.length} 个技能`,
      left: 'center',
      top: 40,
    },
    grid: {
      top: 120,
    },
    tooltip: {
      trigger: 'item',
    },
    radar: {
      indicator: top.map((s) => ({ name: s.skill_name, max: Math.max(...top.map((x) => x.count), 5) + 2 })),
      radius: '65%',
      center: ['50%', '65%'],
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: top.map((s) => s.count),
            name: '掌握人数',
            areaStyle: { color: 'rgba(208, 90, 110, 0.3)' },
            itemStyle: { color: '#D05A6E' },
            lineStyle: { color: '#D05A6E', width: 2 },
          },
        ],
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 380 }} />;
}
