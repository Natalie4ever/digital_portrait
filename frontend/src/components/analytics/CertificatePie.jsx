// 证书类型饼图 - Step 4
import ReactECharts from 'echarts-for-react';
import { Empty } from 'antd';

const COLORS = ['#D05A6E', '#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#945FB9', '#FF9845', '#1E9493', '#FF99C3'];

export default function CertificatePie({ items = [], total = 0 }) {
  if (!items.length) {
    return (
      <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="暂无证书数据" />
      </div>
    );
  }
  const data = items.map((it, i) => ({ name: it.cert_name, value: it.count, itemStyle: { color: COLORS[i % COLORS.length] } }));
  const option = {
    title: {
      text: '资格证书类型分布',
      subtext: `共 ${total} 张证书 / ${items.length} 种类型`,
      left: 'center',
      top: 16,
    },
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} 张 ({d}%)' },
    legend: { type: 'scroll', orient: 'horizontal', bottom: 0 },
    series: [
      {
        name: '资格证书',
        type: 'pie',
        radius: ['32%', '60%'],
        center: ['50%', '53%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}\n{c} 张' },
        data,
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 380 }} />;
}
