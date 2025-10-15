import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiRequest } from '../utils/api';
import { formatNumber, formatDateTime } from '../utils/api';

interface TradingChartProps {
  symbol: string;
}

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TradingChart: React.FC<TradingChartProps> = ({ symbol }) => {
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('1h');

  useEffect(() => {
    loadChartData();
  }, [symbol, timeframe]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const klines = await apiRequest(`/trading/market/${symbol}?interval=${timeframe}&limit=100`);
      
      const processedData = klines.map((kline: any[]) => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));

      setChartData(processedData);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeframes = [
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 shadow-xl">
          <p className="text-gray-300 text-sm mb-2">
            {formatDateTime(new Date(label))}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between space-x-4">
              <span className="text-gray-400">Open:</span>
              <span className="text-white font-mono">${formatNumber(data.open, 2)}</span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-gray-400">High:</span>
              <span className="text-green-400 font-mono">${formatNumber(data.high, 2)}</span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-gray-400">Low:</span>
              <span className="text-red-400 font-mono">${formatNumber(data.low, 2)}</span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-gray-400">Close:</span>
              <span className="text-white font-mono">${formatNumber(data.close, 2)}</span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-gray-400">Volume:</span>
              <span className="text-blue-400 font-mono">{formatNumber(data.volume, 0)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 h-96">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">{symbol} Price Chart</h3>
        
        <div className="flex space-x-2">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timeframe === tf.value
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            />
            <YAxis
              domain={['dataMin - 50', 'dataMax + 50']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(value) => `$${formatNumber(value, 0)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#10B981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartData.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-gray-400 mb-1">Current Price</div>
            <div className="text-white font-semibold">
              ${formatNumber(chartData[chartData.length - 1].close, 2)}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-gray-400 mb-1">24h High</div>
            <div className="text-green-400 font-semibold">
              ${formatNumber(Math.max(...chartData.map(d => d.high)), 2)}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-gray-400 mb-1">24h Low</div>
            <div className="text-red-400 font-semibold">
              ${formatNumber(Math.min(...chartData.map(d => d.low)), 2)}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-gray-400 mb-1">Volume</div>
            <div className="text-blue-400 font-semibold">
              {formatNumber(chartData.reduce((sum, d) => sum + d.volume, 0), 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingChart;