import { Line } from 'react-chartjs-2';
import { chartColors, chartColorsTransparent, lineChartOptions } from './ChartConfig';
import './Charts.css';

interface TrendDataPoint {
  label: string; // Month label like 'Jan 2026'
  value: number; // Percentage
}

interface AttendanceTrendChartProps {
  data: TrendDataPoint[];
  comparisonData?: TrendDataPoint[]; // Optional comparison line (e.g., batch average)
  title?: string;
  height?: number;
}

export function AttendanceTrendChart({
  data,
  comparisonData,
  title = 'Attendance Trend',
  height = 300,
}: AttendanceTrendChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: 'Attendance Rate',
        data: data.map((d) => d.value),
        borderColor: chartColors.present,
        backgroundColor: chartColorsTransparent.present,
        fill: true,
        tension: 0.3,
      },
      ...(comparisonData
        ? [
            {
              label: 'Batch Average',
              data: comparisonData.map((d) => d.value),
              borderColor: chartColors.SD,
              backgroundColor: 'transparent',
              borderDash: [5, 5],
              fill: false,
              tension: 0.3,
            },
          ]
        : []),
    ],
  };

  return (
    <div className="chart-container" style={{ height }}>
      {title && <h6 className="chart-title">{title}</h6>}
      <Line data={chartData} options={lineChartOptions} />
    </div>
  );
}
