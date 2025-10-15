import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { executeQuery } from '../services/database.js';

const router = express.Router();

// Get trading analytics
router.get('/trading', authMiddleware, async (req, res) => {
  try {
    const { days = 30, symbol } = req.query;
    
    let baseQuery = `
      FROM trades 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    let baseParams = [req.userId, parseInt(days)];
    
    if (symbol) {
      baseQuery += ' AND symbol = ?';
      baseParams.push(symbol);
    }

    // Get trading statistics
    const [totalStats] = await executeQuery(`
      SELECT 
        COUNT(*) as total_trades,
        SUM(CASE WHEN status = 'FILLED' THEN 1 ELSE 0 END) as filled_trades,
        SUM(CASE WHEN status = 'CANCELED' THEN 1 ELSE 0 END) as canceled_trades,
        SUM(commission) as total_fees,
        AVG(executed_quantity) as avg_quantity,
        SUM(executed_quantity * executed_price) as total_volume
      ${baseQuery}
    `, baseParams);

    // Get PnL by day
    const dailyPnL = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as trades_count,
        SUM(commission) as daily_fees,
        SUM(executed_quantity * executed_price) as daily_volume
      ${baseQuery} AND status = 'FILLED'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, baseParams);

    // Get trading pairs distribution
    const pairsDistribution = await executeQuery(`
      SELECT 
        symbol,
        COUNT(*) as trade_count,
        SUM(executed_quantity * executed_price) as volume,
        SUM(commission) as fees
      ${baseQuery} AND status = 'FILLED'
      GROUP BY symbol
      ORDER BY trade_count DESC
      LIMIT 10
    `, baseParams);

    // Get side distribution
    const sideDistribution = await executeQuery(`
      SELECT 
        side,
        COUNT(*) as count,
        SUM(executed_quantity * executed_price) as volume
      ${baseQuery} AND status = 'FILLED'
      GROUP BY side
    `, baseParams);

    res.json({
      summary: totalStats,
      dailyPnL,
      pairsDistribution,
      sideDistribution
    });
  } catch (error) {
    console.error('Trading analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signal analytics
router.get('/signals', async (req, res) => {
  try {
    const { days = 30, symbol } = req.query;
    
    let baseQuery = `
      FROM signals 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    let baseParams = [parseInt(days)];
    
    if (symbol) {
      baseQuery += ' AND symbol = ?';
      baseParams.push(symbol);
    }

    // Signal generation stats
    const [signalStats] = await executeQuery(`
      SELECT 
        COUNT(*) as total_signals,
        SUM(CASE WHEN signal_type = 'BUY' THEN 1 ELSE 0 END) as buy_signals,
        SUM(CASE WHEN signal_type = 'SELL' THEN 1 ELSE 0 END) as sell_signals,
        SUM(CASE WHEN signal_type = 'HOLD' THEN 1 ELSE 0 END) as hold_signals,
        SUM(CASE WHEN executed = 1 THEN 1 ELSE 0 END) as executed_signals,
        AVG(confidence_score) as avg_confidence,
        AVG(strength) as avg_strength
      ${baseQuery}
    `, baseParams);

    // Signal performance by type
    const signalPerformance = await executeQuery(`
      SELECT 
        signal_type,
        COUNT(*) as total,
        SUM(CASE WHEN executed = 1 THEN 1 ELSE 0 END) as executed,
        AVG(confidence_score) as avg_confidence,
        AVG(strength) as avg_strength
      ${baseQuery}
      GROUP BY signal_type
    `, baseParams);

    // Daily signal generation
    const dailySignals = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as signals_count,
        SUM(CASE WHEN signal_type = 'BUY' THEN 1 ELSE 0 END) as buy_count,
        SUM(CASE WHEN signal_type = 'SELL' THEN 1 ELSE 0 END) as sell_count,
        AVG(confidence_score) as avg_confidence
      ${baseQuery}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, baseParams);

    // Top performing symbols
    const topSymbols = await executeQuery(`
      SELECT 
        symbol,
        COUNT(*) as signal_count,
        SUM(CASE WHEN executed = 1 THEN 1 ELSE 0 END) as executed_count,
        AVG(confidence_score) as avg_confidence,
        AVG(strength) as avg_strength
      ${baseQuery}
      GROUP BY symbol
      ORDER BY signal_count DESC
      LIMIT 10
    `, baseParams);

    res.json({
      summary: signalStats,
      performance: signalPerformance,
      dailySignals,
      topSymbols
    });
  } catch (error) {
    console.error('Signal analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get market analytics
router.get('/market', async (req, res) => {
  try {
    const { symbol, timeframe = '1h', days = 7 } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    // Get technical indicators for the symbol
    const indicators = await executeQuery(`
      SELECT 
        timestamp,
        sma_20, sma_50,
        ema_12, ema_26,
        macd, macd_signal,
        rsi,
        bollinger_upper, bollinger_lower,
        stochastic_k, stochastic_d,
        atr
      FROM technical_indicators 
      WHERE symbol = ? AND timeframe = ? 
        AND timestamp >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL ? DAY)) * 1000
      ORDER BY timestamp DESC
      LIMIT 168
    `, [symbol, timeframe, parseInt(days)]);

    // Get market data
    const marketData = await executeQuery(`
      SELECT 
        open_time,
        close_time,
        open_price,
        high_price,
        low_price,
        close_price,
        volume,
        trades_count
      FROM market_data 
      WHERE symbol = ? AND timeframe = ?
        AND close_time >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL ? DAY)) * 1000
      ORDER BY close_time DESC
      LIMIT 168
    `, [symbol, timeframe, parseInt(days)]);

    // Calculate volatility and other metrics
    if (marketData.length > 1) {
      const prices = marketData.map(d => parseFloat(d.close_price));
      const returns = [];
      
      for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
      }
      
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(24); // Annualized for hourly data
      
      res.json({
        indicators,
        marketData,
        metrics: {
          volatility: volatility * 100, // As percentage
          avgReturn: avgReturn * 100,
          priceChange: ((prices[0] - prices[prices.length - 1]) / prices[prices.length - 1]) * 100,
          highLowRange: ((Math.max(...prices) - Math.min(...prices)) / Math.min(...prices)) * 100
        }
      });
    } else {
      res.json({
        indicators,
        marketData,
        metrics: null
      });
    }
  } catch (error) {
    console.error('Market analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI model performance
router.get('/ai-models', async (req, res) => {
  try {
    const models = await executeQuery(`
      SELECT 
        m.*,
        COUNT(s.id) as signals_generated,
        AVG(s.confidence_score) as avg_confidence,
        SUM(CASE WHEN s.executed = 1 THEN 1 ELSE 0 END) as signals_executed
      FROM ai_models m
      LEFT JOIN signals s ON s.model_version = m.version
      WHERE m.is_active = TRUE
      GROUP BY m.id
      ORDER BY m.accuracy DESC
    `);

    const parsedModels = models.map(model => ({
      ...model,
      features_config: model.features_config ? JSON.parse(model.features_config) : null,
      hyperparameters: model.hyperparameters ? JSON.parse(model.hyperparameters) : null
    }));

    res.json(parsedModels);
  } catch (error) {
    console.error('AI models analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;