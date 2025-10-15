import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { aiService } from '../services/ai.js';
import { binanceService } from '../services/binance.js';
import { executeQuery } from '../services/database.js';

const router = express.Router();

// Generate signal for a symbol
router.post('/generate/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1h' } = req.body;

    // Get market data
    const klineData = await binanceService.getKlines(symbol, timeframe, 100);
    
    // Generate AI signal
    const signal = await aiService.generateSignal(symbol, timeframe, klineData);
    
    res.json(signal);
  } catch (error) {
    console.error('Signal generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active signals
router.get('/active', async (req, res) => {
  try {
    const { symbol, signal_type, limit = 20 } = req.query;

    let query = 'SELECT * FROM signals WHERE is_active = TRUE AND expires_at > NOW()';
    let params = [];

    if (symbol) {
      query += ' AND symbol = ?';
      params.push(symbol);
    }

    if (signal_type) {
      query += ' AND signal_type = ?';
      params.push(signal_type);
    }

    query += ' ORDER BY confidence_score DESC, created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const signals = await executeQuery(query, params);

    // Parse JSON fields
    const parsedSignals = signals.map(signal => ({
      ...signal,
      technical_indicators: signal.technical_indicators ? JSON.parse(signal.technical_indicators) : null,
      market_conditions: signal.market_conditions ? JSON.parse(signal.market_conditions) : null
    }));

    res.json(parsedSignals);
  } catch (error) {
    console.error('Active signals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signal history
router.get('/history', async (req, res) => {
  try {
    const { symbol, signal_type, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM signals WHERE 1=1';
    let params = [];

    if (symbol) {
      query += ' AND symbol = ?';
      params.push(symbol);
    }

    if (signal_type) {
      query += ' AND signal_type = ?';
      params.push(signal_type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const signals = await executeQuery(query, params);

    const parsedSignals = signals.map(signal => ({
      ...signal,
      technical_indicators: signal.technical_indicators ? JSON.parse(signal.technical_indicators) : null,
      market_conditions: signal.market_conditions ? JSON.parse(signal.market_conditions) : null
    }));

    res.json(parsedSignals);
  } catch (error) {
    console.error('Signal history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signal performance stats
router.get('/stats/performance', async (req, res) => {
  try {
    const { symbol, days = 30 } = req.query;

    let query = `
      SELECT
        signal_type,
        COUNT(*) as total_signals,
        SUM(CASE WHEN executed = 1 THEN 1 ELSE 0 END) as executed_signals,
        AVG(confidence_score) as avg_confidence,
        AVG(strength) as avg_strength
      FROM signals
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    let params = [parseInt(days)];

    if (symbol) {
      query += ' AND symbol = ?';
      params.push(symbol);
    }

    query += ' GROUP BY signal_type';

    const stats = await executeQuery(query, params);
    res.json(stats);
  } catch (error) {
    console.error('Signal performance stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signal by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const signals = await executeQuery(
      'SELECT * FROM signals WHERE id = ?',
      [id]
    );

    if (signals.length === 0) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    const signal = signals[0];
    signal.technical_indicators = signal.technical_indicators ? JSON.parse(signal.technical_indicators) : null;
    signal.market_conditions = signal.market_conditions ? JSON.parse(signal.market_conditions) : null;

    res.json(signal);
  } catch (error) {
    console.error('Signal fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Execute signal (create trade based on signal)
router.post('/:id/execute', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, customPrice } = req.body;

    // Get signal
    const signals = await executeQuery(
      'SELECT * FROM signals WHERE id = ? AND is_active = TRUE AND expires_at > NOW()',
      [id]
    );

    if (signals.length === 0) {
      return res.status(404).json({ error: 'Signal not found or expired' });
    }

    const signal = signals[0];

    if (signal.executed) {
      return res.status(400).json({ error: 'Signal already executed' });
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
      symbol: signal.symbol,
      side: signal.signal_type,
      type: 'MARKET', // Use market order for simplicity
      quantity: quantity || '0.001' // Default small quantity
    };

    // Create order
    const orderResult = await binanceService.createOrder(orderData);

    // Store trade
    await executeQuery(`
      INSERT INTO trades (
        user_id, binance_order_id, symbol, side, type, quantity,
        executed_quantity, executed_price, status, account_type,
        signal_id, is_automated, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.userId,
      orderResult.orderId,
      signal.symbol,
      signal.signal_type,
      'MARKET',
      quantity || '0.001',
      orderResult.executedQty || 0,
      orderResult.avgPrice || 0,
      orderResult.status,
      'futures',
      signal.id,
      false,
      orderResult.status === 'FILLED' ? new Date() : null
    ]);

    // Mark signal as executed
    await executeQuery(
      'UPDATE signals SET executed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [signal.id]
    );

    res.json({
      message: 'Signal executed successfully',
      order: orderResult,
      signal: signal
    });
  } catch (error) {
    console.error('Signal execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;