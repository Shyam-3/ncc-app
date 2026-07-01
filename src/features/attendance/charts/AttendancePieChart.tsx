import { Pie, Doughnut } from 'react-chartjs-2';
import { chartColors, pieChartOptions } from './ChartConfig';
import './Charts.css';

interface PieDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface AttendancePieChartProps {
  data: PieDataPoint[];
  title?: string;
  height?: number;
  doughnut?: boolean;
}

// Default colors for attendance categories
const defaultCategoryColors: Record<string, string> = {
  Present: chartColors.present,
  Absent: chartColors.absent,
};

export function AttendancePieChart({
  data,
  title,
  height = 250,
  doughnut = true,
}: AttendancePieChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map(
          (d) => d.color || defaultCategoryColors[d.label] || chartColors.absent
        ),
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  };

  const ChartComponent = doughnut ? Doughnut : Pie;

  return (
    <div className="chart-container" style={{ height }}>
      {title && <h6 className="chart-title">{title}</h6>}
      <ChartComponent data={chartData} options={pieChartOptions} />
    </div>
  );
}
