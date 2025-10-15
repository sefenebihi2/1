import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { formatNumber } from '../utils/api';

interface OrderBookProps {
  symbol: string;
}

interface OrderBookData {
  bids: string[][];
  asks: string[][];
  lastUpdateId: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderBook();
    const interval = setInterval(loadOrderBook, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, [symbol]);

  const loadOrderBook = async () => {
    try {
      const data = await apiRequest(`/trading/market/${symbol}?type=orderbook`);
      setOrderBook(data);
    } catch (error) {
      console.error('Error loading order book:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">Order Book</h3>
        <div className="text-center text-gray-400 py-8">
          Loading order book...
        </div>
      </div>
    );
  }

  if (!orderBook) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">Order Book</h3>
        <div className="text-center text-red-400 py-8">
          Failed to load order book
        </div>
      </div>
    );
  }

  const displayCount = 10; // Show top 10 levels
  const topAsks = orderBook.asks.slice(0, displayCount).reverse();
  const topBids = orderBook.bids.slice(0, displayCount);

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4">Order Book</h3>
      
      <div className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-3 text-sm text-gray-400 font-medium">
          <div>Price</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Total</div>
        </div>

        {/* Asks (Sell Orders) */}
        <div className="space-y-1">
          {topAsks.map((ask, index) => {
            const price = parseFloat(ask[0]);
            const amount = parseFloat(ask[1]);
            const total = price * amount;
            
            return (
              <div
                key={`ask-${index}`}
                className="grid grid-cols-3 text-sm py-1 px-2 hover:bg-red-500/10 rounded transition-colors"
              >
                <div className="text-red-400 font-mono">
                  {formatNumber(price, 2)}
                </div>
                <div className="text-right text-gray-300 font-mono">
                  {formatNumber(amount, 8)}
                </div>
                <div className="text-right text-gray-400 font-mono">
                  {formatNumber(total, 2)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Spread */}
        <div className="border-t border-gray-700 py-2">
          <div className="text-center text-gray-400 text-sm">
            Spread: {orderBook.asks.length > 0 && orderBook.bids.length > 0 
              ? formatNumber(parseFloat(orderBook.asks[0][0]) - parseFloat(orderBook.bids[0][0]), 4)
              : '---'
            }
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="space-y-1">
          {topBids.map((bid, index) => {
            const price = parseFloat(bid[0]);
            const amount = parseFloat(bid[1]);
            const total = price * amount;
            
            return (
              <div
                key={`bid-${index}`}
                className="grid grid-cols-3 text-sm py-1 px-2 hover:bg-green-500/10 rounded transition-colors"
              >
                <div className="text-green-400 font-mono">
                  {formatNumber(price, 2)}
                </div>
                <div className="text-right text-gray-300 font-mono">
                  {formatNumber(amount, 8)}
                </div>
                <div className="text-right text-gray-400 font-mono">
                  {formatNumber(total, 2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;