import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';
import '../graphic/graphic.css';

const GraphicMonthly = ({ data }) => {
  const chartRef = useRef(null);

  const {
    totalCuotas = 0,
    totalIngresos = 0,
    totalEgresos = 0,
    balanceFinal = 0,
    efectivoDisponible = 0,
    transferenciaDisponible = 0,
  } = data || {};

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const options = {
      series: [{
        data: [
          totalCuotas,
          totalIngresos,
          totalEgresos,
          balanceFinal,
          efectivoDisponible,
          transferenciaDisponible
        ]
      }],
      chart: {
        height: 350, 
        type: 'bar',
        toolbar: {
          show: false 
        }
      },
      colors: [
        '#008FFB', 
        '#00E396', 
        '#FF4560', 
        '#775DD0', 
        '#FEB019', 
        '#FFBB28'  
      ],
      plotOptions: {
        bar: {
          columnWidth: '45%', 
          distributed: true,  
        }
      },
      dataLabels: {
        enabled: false 
      },
      legend: {
        show: true,       
        position: 'right', 
        verticalAlign: 'middle',
        fontSize: '18px',
        markers: {
          width: 12,
          height: 12,
          radius: 2
        },
        formatter: function (seriesName, opts) {
          const value = opts.w.globals.series[0][opts.seriesIndex];
          return `${seriesName}: $${value.toLocaleString('es-ES')}`;
        }
      },
      xaxis: {
        categories: [
          'Cuotas',
          'Ingresos',
          'Egresos',
          'Balance',
          'Efectivo',
          'Transferencia'
        ],
        labels: {
          style: {
            fontSize: '20px',
            colors: [
              '#008FFB',
              '#00E396',
              '#FF4560',
              '#775DD0',
              '#FEB019',
              '#FFBB28'
            ]
          }
        }
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: function (val) {
            return `$${val.toLocaleString('es-ES')}`;
          }
        }
      }
    };

    const chart = new ApexCharts(chartRef.current, options);
    chart.render();

    return () => {
      if (chart) chart.destroy();
    };
  }, [totalCuotas, totalIngresos, totalEgresos, balanceFinal, efectivoDisponible, transferenciaDisponible]);

  return (
    <div className="">
      <div className="chart-wrapper" ref={chartRef}>
        <div id="chart" />
      </div>
    </div>
  );
};

export default GraphicMonthly;