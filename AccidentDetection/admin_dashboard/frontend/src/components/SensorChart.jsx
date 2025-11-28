import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export default function SensorChart({ mobileReport }) {
  if (!mobileReport) return null
  
  const data = {
    labels: ['Acceleration', 'Gyroscope', 'Speed'],
    datasets: [
      {
        label: 'Sensor Readings',
        data: [
          mobileReport.acc_peak || 0,
          (mobileReport.gyro_peak || 0) / 10, // Scale down for visualization
          (mobileReport.speed || 0) / 10, // Scale down for visualization
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(234, 179, 8, 0.7)',
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
          'rgb(234, 179, 8)',
        ],
        borderWidth: 2,
      },
    ],
  }
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Sensor Readings at Impact',
        font: {
          size: 14,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label
            const value = context.parsed.y
            if (label === 'Acceleration') {
              return `${value.toFixed(2)} g`
            } else if (label === 'Gyroscope') {
              return `${(value * 10).toFixed(1)}°/s`
            } else if (label === 'Speed') {
              return `${(value * 10).toFixed(0)} km/h`
            }
            return value
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Magnitude (scaled)',
        },
      },
    },
  }
  
  return (
    <div className="h-48 w-full">
      <Bar data={data} options={options} />
    </div>
  )
}