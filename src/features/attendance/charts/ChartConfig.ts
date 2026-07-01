// Chart.js configuration and registration
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Color palette matching Bootstrap theme
export const chartColors = {
  present: 'rgb(25, 135, 84)',      // Bootstrap success
  absent: 'rgb(220, 53, 69)',       // Bootstrap danger
  // Division colors
  SD: 'rgb(13, 110, 253)',          // Blue
  SW: 'rgb(25, 135, 84)',           // Green
  JD: 'rgb(255, 193, 7)',           // Yellow
  JW: 'rgb(111, 66, 193)',          // Purple
};

export const chartColorsTransparent = {
  present: 'rgba(25, 135, 84, 0.2)',
  absent: 'rgba(220, 53, 69, 0.2)',
  SD: 'rgba(13, 110, 253, 0.2)',
  SW: 'rgba(25, 135, 84, 0.2)',
  JD: 'rgba(255, 193, 7, 0.2)',
  JW: 'rgba(111, 66, 193, 0.2)',
};

// Default chart options
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
};

// Line chart default options
export const lineChartOptions = {
  ...defaultChartOptions,
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: (value: number | string) => `${value}%`,
      },
    },
  },
  plugins: {
    ...defaultChartOptions.plugins,
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const value = context.parsed?.y ?? 0;
          return `${context.dataset?.label || ''}: ${value.toFixed(1)}%`;
        },
      },
    },
  },
};

// Bar chart default options
export const barChartOptions = {
  ...defaultChartOptions,
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

// Stacked bar chart options
export const stackedBarOptions = {
  ...defaultChartOptions,
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
      beginAtZero: true,
    },
  },
};

// Pie/Doughnut chart options
export const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
    },
  },
};
