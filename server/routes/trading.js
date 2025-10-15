import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { executeQuery } from '../services/database.js';
import { binanceService } from '../services/binance.js';

const router = express.Router();

// Get account information
router.get('/account', authMiddleware, async (req, res) => {
  try {
    // Get user's API keys
    const apiKeys = await executeQuery(
      'SELECT * FROM api_keys WHERE user_id = ? AND is_active = TRUE LIMIT 1',
      [req.userId]
    );

    if (apiKeys.length === 0) {
      return res.status(400).json({ error: 'No active API keys found' });
    }

    const { api_key_encrypted, secret_key_encrypted, is_testnet } = apiKeys[0];
    
    // In production, you would decrypt these keys
    binanceService.setCredentials(api_key_encrypted, secret_key_encrypted, is_testnet);
    
    const accountInfo = await binanceService.getAccountInfo();
    res.json(accountInfo);
  } catch (error) {
    console.error('Account info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get market data
router.get('/market/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    
    const klineData = await binanceService.getKlines(symbol, interval, parseInt(limit));
    res.json(klineData);
  } catch (error) {
    console.error('Market data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ticker data for all symbols
router.get('/ticker', async (req, res) => {
  try {
    const tickerData = await binanceService.getTicker24hr();
    res.json(tickerData);
  } catch (error) {
    console.error('Ticker data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ticker data for specific symbol
router.get('/ticker/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const tickerData = await binanceService.getTicker24hr(symbol);
    res.json(tickerData);
  } catch (error) {
    console.error('Ticker data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/order', authMiddleware, async (req, res) => {
  try {
    const {
      symbol,
      side,
      type,
      quantity,
      price,
      stopPrice,
      timeInForce = 'GTC'
    } = req.body;

    // Validation
    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user's API keys
    const apiKeys = await executeQuery(
      'SELECT * FROM api_keys WHERE user_id = ? AND is_active = TRUE LIMIT 1',
      [req.userId]
    );

    if (apiKeys.length === 0) {
      return res.status(400).json({ error: 'No active API keys found' });
    }

    const { api_key_encrypted, secret_key_encrypted, is_testnet } = apiKeys[0];
    binanceService.setCredentials(api_key_encrypted, secret_key_encrypted, is_testnet);

    // Prepare order data
    const orderData = {
      symbol,
      side,
      type,
      quantity,
      timeInForce
    };

    if (price && ['LIMIT', 'STOP_LIMIT'].includes(type)) {
      orderData.price = price;
    }

    if (stopPrice && ['STOP_MARKET', 'STOP_LIMIT'].includes(type)) {
      orderData.stopPrice = stopPrice;
    }

    // Create order
    const orderResult = await binanceService.createOrder(orderData);

    // Store order in database
    await executeQuery(`
      INSERT INTO trades (
        user_id, binance_order_id, symbol, side, type, quantity, price, stop_price,
        executed_quantity, executed_price, commission, commission_asset, status,
        time_in_force, account_type, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.userId,
      orderResult.orderId,
      symbol,
      side,
      type,
      quantity,
      price || null,
      stopPrice || null,
      orderResult.executedQty || 0,
      orderResult.avgPrice || 0,
      orderResult.commission || 0,
      orderResult.commissionAsset || null,
      orderResult.status,
      timeInForce,
      'futures',
      orderResult.status === 'FILLED' ? new Date() : null
    ]);

    res.json(orderResult);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel order
router.delete('/order/:symbol/:orderId', authMiddleware, async (req, res) => {
  try {
    const { symbol, orderId } = req.params;

    // Get user's API keys
    const apiKeys = await executeQuery(
      'SELECT * FROM api_keys WHERE user_id = ? AND is_active = TRUE LIMIT 1',
      [req.userId]
    );

    if (apiKeys.length === 0) {
      return res.status(400).json({ error: 'No active API keys found' });
    }

    const { api_key_encrypted, secret_key_encrypted, is_testnet } = apiKeys[0];
    binanceService.setCredentials(api_key_encrypted, secret_key_encrypted, is_testnet);

    const cancelResult = await binanceService.cancelOrder(symbol, orderId);

    // Update order status in database
    await executeQuery(
      'UPDATE trades SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE binance_order_id = ? AND user_id = ?',
      ['CANCELED', orderId, req.userId]
    );

    res.json(cancelResult);
  } catch (error) {
    console.error('Order cancellation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get open orders
router.get('/orders/open', authMiddleware, async (req, res) => {
  try {
    const { symbol } = req.query;

    // Get user's API keys
    const apiKeys = await executeQuery(
      'SELECT * FROM api_keys WHERE user_id = ? AND is_active = TRUE LIMIT 1',
      [req.userId]
    );

    if (apiKeys.length === 0) {
      return res.status(400).json({ error: 'No active API keys found' });
    }

    const { api_key_encrypted, secret_key_encrypted, is_testnet } = apiKeys[0];
    binanceService.setCredentials(api_key_encrypted, secret_key_encrypted, is_testnet);

    const openOrders = await binanceService.getOpenOrders(symbol);
    res.json(openOrders);
  } catch (error) {
    console.error('Open orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trade history
router.get('/trades', authMiddleware, async (req, res) => {
  try {
    const { symbol, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM trades WHERE user_id = ?';
    let params = [req.userId];
    
    if (symbol) {
      query += ' AND symbol = ?';
      params.push(symbol);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const trades = await executeQuery(query, params);
    res.json(trades);
  } catch (error) {
    console.error('Trade history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get positions
router.get('/positions', authMiddleware, async (req, res) => {
  try {
    // Get user's API keys
    const apiKeys = await executeQuery(
      'SELECT * FROM api_keys WHERE user_id = ? AND is_active = TRUE LIMIT 1',
      [req.userId]
    );

    if (apiKeys.length === 0) {
      return res.status(400).json({ error: 'No active API keys found' });
    }

    const { api_key_encrypted, secret_key_encrypted, is_testnet } = apiKeys[0];
    binanceService.setCredentials(api_key_encrypted, secret_key_encrypted, is_testnet);

    const positions = await binanceService.getPositions();
    
    // Filter out positions with zero size
    const activePositions = positions.filter(pos => parseFloat(pos.positionAmt) !== 0);
    
    res.json(activePositions);
  } catch (error) {
    console.error('Positions error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;