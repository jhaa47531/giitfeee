import React, { useEffect, useRef } from 'react';
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

interface StudentChartProps {
  paid: number;
  pending: number;
}

export const StudentChart: React.FC<StudentChartProps> = ({ paid, pending }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const total = paid + pending;
    const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Cleared Fee', 'Pending Balance'],
        datasets: [
          {
            data: [paid, pending > 0 ? pending : 0],
            backgroundColor: ['#059669', '#e11d48'],
            borderColor: ['#ffffff', '#ffffff'],
            borderWidth: 2,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              padding: 16,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 12,
                weight: 'bold'
              },
              color: '#334155'
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 8,
            titleFont: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 12
            },
            bodyFont: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 13,
              weight: 'bold'
            },
            callbacks: {
              label: (item) => ` ₹${(item.parsed || 0).toLocaleString('en-IN')}`
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
  }, [paid, pending]);

  const total = paid + pending;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div className="relative w-full h-56 sm:h-60 flex items-center justify-center">
      <canvas id="feeChart" ref={canvasRef} className="w-full h-full" />
      {/* Center Statistic Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-7">
        <span className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">{pct}%</span>
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Settled</span>
      </div>
    </div>
  );
};
