import React, { useEffect, useRef } from 'react';
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  BarController
} from 'chart.js';
import { Student } from '../types';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, BarController);

interface AdminChartProps {
  students: Student[];
}

export const AdminChart: React.FC<AdminChartProps> = ({ students }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Group by course
    const courseMap: Record<string, { paid: number; pending: number }> = {
      BCA: { paid: 0, pending: 0 },
      BBA: { paid: 0, pending: 0 },
      'B.Com': { paid: 0, pending: 0 },
      MBA: { paid: 0, pending: 0 },
      MCA: { paid: 0, pending: 0 }
    };

    students.forEach((s) => {
      const c = s.course || 'BCA';
      if (!courseMap[c]) {
        courseMap[c] = { paid: 0, pending: 0 };
      }
      const paid = s.paid || 0;
      const pending = Math.max(0, (s.total || 0) - paid);
      courseMap[c].paid += paid;
      courseMap[c].pending += pending;
    });

    const labels = Object.keys(courseMap);
    const paidData = labels.map((c) => courseMap[c].paid);
    const pendingData = labels.map((c) => courseMap[c].pending);

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Collected Fees',
            data: paidData,
            backgroundColor: '#059669',
            borderRadius: 4,
            borderSkipped: false
          },
          {
            label: 'Pending Dues',
            data: pendingData,
            backgroundColor: '#f87171',
            borderRadius: 4,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              padding: 12,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
                weight: 'bold'
              },
              color: '#475569'
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
            callbacks: {
              label: (item) => ` ${item.dataset.label}: ₹${(item.parsed.y || 0).toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
                weight: 'bold'
              },
              color: '#475569'
            }
          },
          y: {
            grid: {
              color: '#f1f5f9'
            },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 },
              color: '#64748b',
              callback: (val) => {
                const num = Number(val);
                return num >= 1000 ? `₹${(num / 1000).toFixed(0)}k` : `₹${num}`;
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [students]);

  return (
    <div className="w-full h-56 sm:h-64">
      <canvas id="adminChart" ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
