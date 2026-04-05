import { Bar } from 'react-chartjs-2';
import { chartColors, barChartOptions, stackedBarOptions } from './ChartConfig';
import './Charts.css';

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface StackedBarData {
  label: string;
  present: number;
  absent: number;
}

interface AttendanceBarChartProps {
  data: BarDataPoint[] | StackedBarData[];
  title?: string;
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
}

export function AttendanceBarChart({
  data,
  title = 'Attendance Comparison',
  height = 300,
  stacked = false,
  horizontal = false,
}: AttendanceBarChartProps) {
  // Handle stacked bar chart
  if (stacked && isStackedData(data)) {
    const stackedChartData = {
      labels: data.map((d) => d.label),
      datasets: [
        {
          label: 'Present',
          data: data.map((d) => d.present),
          backgroundColor: chartColors.present,
        },
        {
          label: 'Absent',
          data: data.map((d) => d.absent),
          backgroundColor: chartColors.absent,
        },
      ],
    };

    const options = {
      ...stackedBarOptions,
      indexAxis: horizontal ? ('y' as const) : ('x' as const),
    };

    return (
      <div className="chart-container" style={{ height }}>
        {title && <h6 className="chart-title">{title}</h6>}
        <Bar data={stackedChartData} options={options} />
      </div>
    );
  }

  // Simple bar chart
  const simpleData = data as BarDataPoint[];
  const chartData = {
    labels: simpleData.map((d) => d.label),
    datasets: [
      {
        label: 'Attendance %',
        data: simpleData.map((d) => d.value),
        backgroundColor: simpleData.map(
          (d) => d.color || chartColors.present
        ),
      },
    ],
  };

  const options = {
    ...barChartOptions,
    indexAxis: horizontal ? ('y' as const) : ('x' as const),
  };

  return (
    <div className="chart-container" style={{ height }}>
      {title && <h6 className="chart-title">{title}</h6>}
      <Bar data={chartData} options={options} />
    </div>
  );
}

function isStackedData(data: BarDataPoint[] | StackedBarData[]): data is StackedBarData[] {
  return data.length > 0 && 'present' in data[0];
}
