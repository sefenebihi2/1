import React from 'react';
import { TrendingUp, TrendingDown, Activity, Volume2, Clock } from 'lucide-react';
import { formatNumber, formatPercentage } from '../utils/api';

interface MarketDataProps {
  symbol: string;
  tickerData: any;
}

const MarketData: React.FC<MarketDataProps> = ({ symbol, tickerData }) => {
  if (!tickerData) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">Market Data</h3>
        <div className="text-center text-gray-400 py-8">
          Loading market data...
        </div>
      </div>
    );
  }

  const priceChange = parseFloat(tickerData.priceChange);
  const priceChangePercent = parseFloat(tickerData.priceChangePercent);
  const isPositive = priceChange >= 0;

  const stats = [
    {
      label: '24h High',
      value: `$${formatNumber(parseFloat(tickerData.highPrice), 2)}`,
      icon: TrendingUp,
      color: 'text-green-400'
    },
    {
      label: '24h Low',
      value: `$${formatNumber(parseFloat(tickerData.lowPrice), 2)}`,
      icon: TrendingDown,
      color: 'text-red-400'
    },
    {
      label: '24h Volume',
      value: formatNumber(parseFloat(tickerData.volume), 0),
      subValue: symbol.replace('USDT', ''),
      icon: Volume2,
      color: 'text-blue-400'
    },
    {
      label: 'Quote Volume',
      value: `$${formatNumber(parseFloat(tickerData.quoteVolume), 0)}`,
      icon: Activity,
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-6">Market Data - {symbol}</h3>
      
      {/* Price Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Current Price</div>
          <div className="text-2xl font-bold text-white">
            ${formatNumber(parseFloat(tickerData.lastPrice), 2)}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">24h Change</div>
          <div className={`text-xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}${formatNumber(priceChange, 2)}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">24h Change %</div>
          <div className={`flex items-center text-xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="h-5 w-5 mr-2" /> : <TrendingDown className="h-5 w-5 mr-2" />}
            {formatPercentage(priceChangePercent)}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Trades (24h)
          </div>
          <div className="text-xl font-bold text-white">
            {formatNumber(parseFloat(tickerData.tradeCount || '0'), 0)}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">{stat.label}</div>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="text-lg font-semibold text-white">
                {stat.value}
              </div>
              {stat.subValue && (
                <div className="text-xs text-gray-400 mt-1">
                  {stat.subValue}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Price Metrics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Weighted Avg Price</div>
          <div className="text-lg font-semibold text-white">
            ${formatNumber(parseFloat(tickerData.weightedAvgPrice || '0'), 4)}
          </div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Open Price (24h)</div>
          <div className="text-lg font-semibold text-white">
            ${formatNumber(parseFloat(tickerData.openPrice), 2)}
          </div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Previous Close</div>
          <div className="text-lg font-semibold text-white">
            ${formatNumber(parseFloat(tickerData.prevClosePrice || tickerData.openPrice), 2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketData;