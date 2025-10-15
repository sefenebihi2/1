import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiRequest } from '../utils/api';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  RefreshCw,
  Plus,
  Minus
} from 'lucide-react';
import MarketData from './MarketData';
import OrderBook from './OrderBook';
import TradingChart from './TradingChart';

const TradingView: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [balance, setBalance] = useState([]);
  const [tickerData, setTickerData] = useState<any>(null);
  
  const { subscribe, lastMessage, connected } = useWebSocket();

  useEffect(() => {
    // Subscribe to ticker updates
    if (connected) {
      subscribe('subscribe_ticker', { symbol: selectedSymbol });
    }
    
    // Load initial data
    loadTradingData();
  }, [selectedSymbol, connected]);

  useEffect(() => {
    // Handle WebSocket messages
    if (lastMessage && lastMessage.type === 'ticker' && lastMessage.symbol === selectedSymbol) {
      setTickerData(lastMessage.data);
    }
  }, [lastMessage, selectedSymbol]);

  const loadTradingData = async () => {
    try {
      // Load positions
      const positionsRes = await apiRequest('/trading/positions');
      setPositions(positionsRes);

      // Load open orders
      const ordersRes = await apiRequest('/trading/orders/open');
      setOpenOrders(ordersRes);

      // Load account balance
      const accountRes = await apiRequest('/trading/account');
      setBalance(accountRes.assets || []);

      // Load ticker data
      const tickerRes = await apiRequest(`/trading/ticker/${selectedSymbol}`);
      setTickerData(tickerRes);
    } catch (error) {
      console.error('Error loading trading data:', error);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData: any = {
        symbol: selectedSymbol,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
      };

      if (orderType === 'LIMIT' && price) {
        orderData.price = parseFloat(price);
      }

      await apiRequest('/trading/order', {
        method: 'POST',
        body: orderData
      });

      // Reset form
      setQuantity('');
      setPrice('');
      
      // Reload data
      await loadTradingData();
    } catch (error: any) {
      alert(`Order failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await apiRequest(`/trading/order/${selectedSymbol}/${orderId}`, {
        method: 'DELETE'
      });
      
      await loadTradingData();
    } catch (error: any) {
      alert(`Cancel order failed: ${error.message}`);
    }
  };

  const popularPairs = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
    'XRPUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'MATICUSDT'
  ];

  return (
    <div className="space-y-6">
      {/* Trading Header */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold">{selectedSymbol}</div>
            {tickerData && (
              <div className="flex items-center space-x-4">
                <div className="text-xl font-semibold">
                  ${parseFloat(tickerData.lastPrice).toLocaleString()}
                </div>
                <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  parseFloat(tickerData.priceChangePercent) >= 0 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {parseFloat(tickerData.priceChangePercent) >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {parseFloat(tickerData.priceChangePercent).toFixed(2)}%
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={loadTradingData}
            className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Symbol Selector */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {popularPairs.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Chart */}
        <div className="lg:col-span-2">
          <TradingChart symbol={selectedSymbol} />
        </div>

        {/* Order Form */}
        <div className="space-y-6">
          {/* Place Order */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Place Order</h3>
            
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Order Type */}
              <div className="flex rounded-lg bg-gray-700 p-1">
                <button
                  type="button"
                  onClick={() => setOrderType('MARKET')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    orderType === 'MARKET'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('LIMIT')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    orderType === 'LIMIT'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Limit
                </button>
              </div>

              {/* Side */}
              <div className="flex rounded-lg bg-gray-700 p-1">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    side === 'BUY'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    side === 'SELL'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Minus className="h-4 w-4 inline mr-1" />
                  Sell
                </button>
              </div>

              {/* Price (for limit orders) */}
              {orderType === 'LIMIT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="0.00"
                    required={orderType === 'LIMIT'}
                  />
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="0.00"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  side === 'BUY'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Placing Order...' : `${side} ${selectedSymbol}`}
              </button>
            </form>
          </div>

          {/* Order Book */}
          <OrderBook symbol={selectedSymbol} />
        </div>
      </div>

      {/* Positions and Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Positions */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Open Positions</h3>
          
          {positions.length > 0 ? (
            <div className="space-y-3">
              {positions.map((position: any, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{position.symbol}</div>
                      <div className="text-sm text-gray-400">
                        Size: {parseFloat(position.positionAmt).toFixed(8)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        parseFloat(position.unRealizedProfit) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {parseFloat(position.unRealizedProfit) >= 0 ? '+' : ''}
                        ${parseFloat(position.unRealizedProfit).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-400">
                        Entry: ${parseFloat(position.entryPrice).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No open positions
            </div>
          )}
        </div>

        {/* Open Orders */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Open Orders</h3>
          
          {openOrders.length > 0 ? (
            <div className="space-y-3">
              {openOrders.map((order: any) => (
                <div key={order.orderId} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{order.symbol}</div>
                      <div className="text-sm text-gray-400">
                        {order.side} {order.origQty} @ ${order.price}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelOrder(order.orderId)}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No open orders
            </div>
          )}
        </div>
      </div>

      {/* Market Data */}
      <MarketData symbol={selectedSymbol} tickerData={tickerData} />
    </div>
  );
};

export default TradingView;