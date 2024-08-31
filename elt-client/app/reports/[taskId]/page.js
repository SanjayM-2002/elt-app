'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRecoilValue } from 'recoil';
import { emailState } from '@/app/recoil/atom';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportDetails() {
  const { taskId } = useParams();
  const email = useRecoilValue(emailState);
  const [report, setReport] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/fetch-service/report/${taskId}`
        );
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setReport(data);
      } catch (error) {
        console.error('Error fetching report details:', error);
      }
    };

    fetchReportDetails();
  }, [taskId, email]);

  if (!report) return <p>Loading...</p>;

  // Prepare data for charts
  const categoryData = {
    labels: Object.keys(report.category_stats),
    datasets: [
      {
        label: 'Category Stats',
        data: Object.values(report.category_stats),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const toleranceData = {
    labels: Object.keys(report.tolerance_stats),
    datasets: [
      {
        label: 'Tolerance Stats',
        data: Object.values(report.tolerance_stats),
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>Report Details</h1>
      <div className='mb-4'>
        <button
          onClick={() => router.back()}
          className='bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600'
        >
          Back
        </button>
      </div>
      <div className='bg-white p-4 rounded-md shadow-md mb-6'>
        <h2 className='text-xl font-semibold mb-2'>Task ID: {report.taskId}</h2>
        <p>
          <strong>Created At:</strong>{' '}
          {new Date(report.createdAt).toLocaleString()}
        </p>
        <div className='mt-4'>
          <h3 className='text-lg font-semibold mb-2'>Summary</h3>
          <div className='space-y-2'>
            {report.summary.description.map((desc, index) => (
              <div
                key={index}
                className='flex justify-between p-2 border rounded-md shadow-sm'
              >
                <span>{desc}</span>
                <span className='font-semibold'>
                  ${report.summary.aggregation[index].toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className='bg-white p-4 rounded-md shadow-md mb-6'>
        <h3 className='text-lg font-semibold mb-2'>Category Stats</h3>
        <Chart
          type='bar'
          data={categoryData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.label}: ${context.raw}`,
                },
              },
            },
          }}
        />
      </div>
      <div className='bg-white p-4 rounded-md shadow-md'>
        <h3 className='text-lg font-semibold mb-2'>Tolerance Stats</h3>
        <Chart
          type='bar'
          data={toleranceData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.label}: ${context.raw}`,
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
