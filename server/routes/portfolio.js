import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { executeQuery } from '../services/database.js';
import { binanceService } from '../services/binance.js';

const router = express.Router();

// Get portfolio overview
router.get('/overview', authMiddleware, async (req, res) => {
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

    // Get account balance
    const balance = await binanceService.getBalance();
    const accountInfo = await binanceService.getAccountInfo();

    // Get positions
    const positions = await binanceService.getPositions();
    const activePositions = positions.filter(pos => parseFloat(pos.positionAmt) !== 0);

    // Calculate total portfolio value
    let totalValue = 0;
    let totalPnL = 0;

    balance.forEach(asset => {
      totalValue += parseFloat(asset.balance) * parseFloat(asset.crossWalletBalance || 1);
    });

    activePositions.forEach(position => {
      totalPnL += parseFloat(position.unRealizedProfit);
    });

    // Get recent performance metrics
    const performanceMetrics = await executeQuery(
      'SELECT * FROM performance_metrics WHERE user_id = ? ORDER BY date DESC LIMIT 30',
      [req.userId]
    );

    res.json({
      balance,
      positions: activePositions,
      totalValue,
      totalPnL,
      performanceMetrics,
      accountInfo: {
        totalWalletBalance: accountInfo.totalWalletBalance,
        totalUnrealizedProfit: accountInfo.totalUnrealizedProfit,
        totalMarginBalance: accountInfo.totalMarginBalance,
        totalInitialMargin: accountInfo.totalInitialMargin,
        totalMaintMargin: accountInfo.totalMaintMargin,
        availableBalance: accountInfo.availableBalance,
        maxWithdrawAmount: accountInfo.maxWithdrawAmount
      }
    });
  } catch (error) {
    console.error('Portfolio overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get portfolio balances
router.get('/balances', authMiddleware, async (req, res) => {
  try {
    // Get saved portfolio data
    const portfolios = await executeQuery(
      'SELECT * FROM portfolios WHERE user_id = ? AND balance > 0 ORDER BY total_value_usd DESC',
      [req.userId]
    );

    // Get live data from Binance
    const apiKeys = await executeQuery(
      'SELECT * FROM api_keys WHERE user_id = ? AND is_active = TRUE LIMIT 1',
      [req.userId]
    );

    if (apiKeys.length > 0) {
      const { api_key_encrypted, secret_key_encrypted, is_testnet } = apiKeys[0];
      binanceService.setCredentials(api_key_encrypted, secret_key_encrypted, is_testnet);
      
      const liveBalance = await binanceService.getBalance();
      
      res.json({
        saved: portfolios,
        live: liveBalance
      });
    } else {
      res.json({
        saved: portfolios,
        live: []
      });
    }
  } catch (error) {
    console.error('Portfolio balances error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update portfolio (sync with Binance)
router.post('/sync', authMiddleware, async (req, res) => {
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

    // Get current balances
    const balance = await binanceService.getBalance();
    const positions = await binanceService.getPositions();

    // Update futures balances
    for (const asset of balance) {
      if (parseFloat(asset.balance) > 0) {
        await executeQuery(`
          INSERT INTO portfolios (user_id, account_type, symbol, balance, locked_balance, unrealized_pnl)
          VALUES (?, 'futures', ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          balance = VALUES(balance),
          locked_balance = VALUES(locked_balance),
          unrealized_pnl = VALUES(unrealized_pnl),
          last_updated = CURRENT_TIMESTAMP
        `, [
          req.userId,
          asset.asset,
          parseFloat(asset.balance),
          0, // locked_balance not available in futures
          parseFloat(asset.crossUnPnl || 0)
        ]);
      }
    }

    // Update positions
    for (const position of positions) {
      if (parseFloat(position.positionAmt) !== 0) {
        await executeQuery(`
          INSERT INTO portfolios (user_id, account_type, symbol, balance, unrealized_pnl, total_value_usd)
          VALUES (?, 'futures', ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          balance = VALUES(balance),
          unrealized_pnl = VALUES(unrealized_pnl),
          total_value_usd = VALUES(total_value_usd),
          last_updated = CURRENT_TIMESTAMP
        `, [
          req.userId,
          position.symbol,
          parseFloat(position.positionAmt),
          parseFloat(position.unRealizedProfit),
          parseFloat(position.notional)
        ]);
      }
    }

    res.json({ message: 'Portfolio synced successfully' });
  } catch (error) {
    console.error('Portfolio sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get performance metrics
router.get('/performance', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const metrics = await executeQuery(`
      SELECT 
        DATE(date) as date,
        total_trades,
        winning_trades,
        losing_trades,
        win_rate,
        total_pnl,
        total_fees,
        max_drawdown,
        sharpe_ratio,
        profit_factor
      FROM performance_metrics 
      WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY date DESC
    `, [req.userId, parseInt(days)]);

    // Calculate cumulative PnL
    let cumulativePnL = 0;
    const metricsWithCumulative = metrics.map(metric => {
      cumulativePnL += parseFloat(metric.total_pnl);
      return {
        ...metric,
        cumulative_pnl: cumulativePnL
      };
    });

    res.json(metricsWithCumulative);
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get risk assessment
router.get('/risk', authMiddleware, async (req, res) => {
  try {
    const riskAssessments = await executeQuery(
      'SELECT * FROM risk_assessments WHERE user_id = ? ORDER BY risk_score DESC',
      [req.userId]
    );

    const parsedAssessments = riskAssessments.map(assessment => ({
      ...assessment,
      recommendations: assessment.recommendations ? JSON.parse(assessment.recommendations) : null
    }));

    res.json(parsedAssessments);
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add API keys
router.post('/api-keys', authMiddleware, async (req, res) => {
  try {
    const { apiKey, secretKey, isTestnet = true } = req.body;

    if (!apiKey || !secretKey) {
      return res.status(400).json({ error: 'API key and secret key are required' });
    }

    // In production, encrypt these keys
    await executeQuery(`
      INSERT INTO api_keys (user_id, api_key_encrypted, secret_key_encrypted, is_testnet)
      VALUES (?, ?, ?, ?)
    `, [req.userId, apiKey, secretKey, isTestnet]);

    res.json({ message: 'API keys added successfully' });
  } catch (error) {
    console.error('API keys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get API keys (without secrets)
router.get('/api-keys', authMiddleware, async (req, res) => {
  try {
    const apiKeys = await executeQuery(
      'SELECT id, is_testnet, is_active, permissions, last_used_at, created_at FROM api_keys WHERE user_id = ?',
      [req.userId]
    );

    res.json(apiKeys);
  } catch (error) {
    console.error('API keys fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;