import { executeQuery } from './database.js';

class AIService {
  constructor() {
    this.models = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Load active AI models from database
      const activeModels = await executeQuery(
        'SELECT * FROM ai_models WHERE is_active = TRUE ORDER BY accuracy DESC'
      );

      for (const model of activeModels) {
        this.models.set(model.name, {
          ...model,
          features_config: JSON.parse(model.features_config),
          hyperparameters: model.hyperparameters ? JSON.parse(model.hyperparameters) : null
        });
      }

      this.isInitialized = true;
      console.log(`Loaded ${this.models.size} AI models`);
    } catch (error) {
      console.error('Error initializing AI service:', error);
      throw error;
    }
  }

  calculateTechnicalIndicators(klineData) {
    const indicators = {};
    
    if (klineData.length < 50) {
      return indicators;
    }

    const closes = klineData.map(k => parseFloat(k[4])); // Close prices
    const highs = klineData.map(k => parseFloat(k[2])); // High prices
    const lows = klineData.map(k => parseFloat(k[3])); // Low prices
    const volumes = klineData.map(k => parseFloat(k[5])); // Volumes

    // Simple Moving Averages
    indicators.sma_20 = this.calculateSMA(closes, 20);
    indicators.sma_50 = this.calculateSMA(closes, 50);

    // Exponential Moving Averages
    indicators.ema_12 = this.calculateEMA(closes, 12);
    indicators.ema_26 = this.calculateEMA(closes, 26);

    // MACD
    const macdData = this.calculateMACD(closes);
    indicators.macd = macdData.macd;
    indicators.macd_signal = macdData.signal;

    // RSI
    indicators.rsi = this.calculateRSI(closes, 14);

    // Bollinger Bands
    const bbData = this.calculateBollingerBands(closes, 20, 2);
    indicators.bollinger_upper = bbData.upper;
    indicators.bollinger_lower = bbData.lower;

    // Stochastic Oscillator
    const stochData = this.calculateStochastic(highs, lows, closes, 14, 3);
    indicators.stochastic_k = stochData.k;
    indicators.stochastic_d = stochData.d;

    // Average True Range
    indicators.atr = this.calculateATR(highs, lows, closes, 14);

    return indicators;
  }

  calculateSMA(values, period) {
    if (values.length < period) return null;
    const sum = values.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  calculateEMA(values, period) {
    if (values.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const emaFast = this.calculateEMA(closes, fastPeriod);
    const emaSlow = this.calculateEMA(closes, slowPeriod);
    
    if (!emaFast || !emaSlow) return { macd: null, signal: null };
    
    const macd = emaFast - emaSlow;
    const macdLine = Array(closes.length - slowPeriod + 1).fill(0).map((_, i) => {
      const fastEma = this.calculateEMA(closes.slice(0, slowPeriod + i), fastPeriod);
      const slowEma = this.calculateEMA(closes.slice(0, slowPeriod + i), slowPeriod);
      return fastEma - slowEma;
    });
    
    const signal = this.calculateEMA(macdLine, signalPeriod);
    
    return { macd, signal };
  }

  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        avgGain = ((avgGain * (period - 1)) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = ((avgLoss * (period - 1)) - change) / period;
      }
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) return { upper: null, lower: null };
    
    const sma = this.calculateSMA(closes, period);
    const recentCloses = closes.slice(-period);
    const variance = recentCloses.reduce((sum, close) => sum + Math.pow(close - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      lower: sma - (standardDeviation * stdDev)
    };
  }

  calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    if (closes.length < kPeriod) return { k: null, d: null };
    
    const recentHighs = highs.slice(-kPeriod);
    const recentLows = lows.slice(-kPeriod);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Calculate %D (moving average of %K)
    const kValues = [];
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
      const periodLows = lows.slice(i - kPeriod + 1, i + 1);
      const periodClose = closes[i];
      
      const periodHighest = Math.max(...periodHighs);
      const periodLowest = Math.min(...periodLows);
      
      kValues.push(((periodClose - periodLowest) / (periodHighest - periodLowest)) * 100);
    }
    
    const d = this.calculateSMA(kValues, dPeriod);
    
    return { k, d };
  }

  calculateATR(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    const trueRanges = [];
    for (let i = 1; i < closes.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    return this.calculateSMA(trueRanges, period);
  }

  async generateSignal(symbol, timeframe, marketData) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Calculate technical indicators
      const indicators = this.calculateTechnicalIndicators(marketData);
      
      // Get the active model (using the highest accuracy model)
      const models = Array.from(this.models.values());
      if (models.length === 0) {
        throw new Error('No active AI models available');
      }

      const bestModel = models[0];
      
      // Generate signal using rule-based approach (simplified AI)
      const signal = await this.analyzeMarketConditions(symbol, indicators, bestModel);
      
      // Store signal in database
      if (signal.signal_type !== 'HOLD') {
        await this.storeSignal(symbol, timeframe, signal, bestModel.version);
      }
      
      return signal;
    } catch (error) {
      console.error('Error generating signal:', error);
      throw error;
    }
  }

  async analyzeMarketConditions(symbol, indicators, model) {
    const signals = [];
    let strength = 0;
    let confidence = 0;

    // RSI analysis
    if (indicators.rsi !== null) {
      if (indicators.rsi < 30) {
        signals.push({ type: 'BUY', weight: 0.3, reason: 'RSI oversold' });
        strength += 0.3;
      } else if (indicators.rsi > 70) {
        signals.push({ type: 'SELL', weight: 0.3, reason: 'RSI overbought' });
        strength += 0.3;
      }
    }

    // MACD analysis
    if (indicators.macd !== null && indicators.macd_signal !== null) {
      if (indicators.macd > indicators.macd_signal) {
        signals.push({ type: 'BUY', weight: 0.25, reason: 'MACD bullish crossover' });
        strength += 0.25;
      } else {
        signals.push({ type: 'SELL', weight: 0.25, reason: 'MACD bearish crossover' });
        strength += 0.25;
      }
    }

    // Moving Average analysis
    if (indicators.sma_20 !== null && indicators.sma_50 !== null) {
      if (indicators.sma_20 > indicators.sma_50) {
        signals.push({ type: 'BUY', weight: 0.2, reason: 'SMA 20 > SMA 50' });
        strength += 0.2;
      } else {
        signals.push({ type: 'SELL', weight: 0.2, reason: 'SMA 20 < SMA 50' });
        strength += 0.2;
      }
    }

    // Bollinger Bands analysis
    if (indicators.bollinger_upper !== null && indicators.bollinger_lower !== null) {
      // This would require current price, using last indicator as proxy
      const currentPrice = indicators.sma_20; // Simplified
      if (currentPrice && currentPrice < indicators.bollinger_lower) {
        signals.push({ type: 'BUY', weight: 0.15, reason: 'Price below Bollinger lower band' });
        strength += 0.15;
      } else if (currentPrice && currentPrice > indicators.bollinger_upper) {
        signals.push({ type: 'SELL', weight: 0.15, reason: 'Price above Bollinger upper band' });
        strength += 0.15;
      }
    }

    // Determine overall signal
    const buySignals = signals.filter(s => s.type === 'BUY');
    const sellSignals = signals.filter(s => s.type === 'SELL');
    
    const buyWeight = buySignals.reduce((sum, s) => sum + s.weight, 0);
    const sellWeight = sellSignals.reduce((sum, s) => sum + s.weight, 0);
    
    let signalType = 'HOLD';
    if (buyWeight > sellWeight && buyWeight > 0.4) {
      signalType = 'BUY';
      confidence = Math.min(buyWeight * 100, 95);
    } else if (sellWeight > buyWeight && sellWeight > 0.4) {
      signalType = 'SELL';
      confidence = Math.min(sellWeight * 100, 95);
    } else {
      confidence = 30; // Low confidence for HOLD
    }

    // Calculate entry price and risk management levels
    const entryPrice = indicators.sma_20 || 0;
    const atr = indicators.atr || (entryPrice * 0.02); // 2% if ATR not available
    
    const stopLoss = signalType === 'BUY' 
      ? entryPrice - (atr * 2) 
      : signalType === 'SELL' 
        ? entryPrice + (atr * 2) 
        : null;
        
    const takeProfit = signalType === 'BUY' 
      ? entryPrice + (atr * 3) 
      : signalType === 'SELL' 
        ? entryPrice - (atr * 3) 
        : null;

    return {
      signal_type: signalType,
      strength: Math.min(strength, 1.0),
      entry_price: entryPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      risk_reward_ratio: stopLoss && takeProfit ? 
        Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss) : null,
      confidence_score: confidence,
      technical_indicators: indicators,
      market_conditions: {
        signals: signals,
        buy_weight: buyWeight,
        sell_weight: sellWeight
      }
    };
  }

  async storeSignal(symbol, timeframe, signal, modelVersion) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4); // Signal expires in 4 hours

    await executeQuery(`
      INSERT INTO signals (
        symbol, signal_type, strength, timeframe, entry_price, 
        stop_loss, take_profit, risk_reward_ratio, confidence_score,
        model_version, technical_indicators, market_conditions, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      symbol,
      signal.signal_type,
      signal.strength,
      timeframe,
      signal.entry_price,
      signal.stop_loss,
      signal.take_profit,
      signal.risk_reward_ratio,
      signal.confidence_score,
      modelVersion,
      JSON.stringify(signal.technical_indicators),
      JSON.stringify(signal.market_conditions),
      expiresAt
    ]);
  }

  async getActiveSignals(userId = null) {
    const query = userId ? 
      'SELECT * FROM signals WHERE is_active = TRUE AND expires_at > NOW() AND user_id = ? ORDER BY confidence_score DESC' :
      'SELECT * FROM signals WHERE is_active = TRUE AND expires_at > NOW() ORDER BY confidence_score DESC';
    
    const params = userId ? [userId] : [];
    return await executeQuery(query, params);
  }
}

export const aiService = new AIService();

export async function initializeAIService() {
  await aiService.initialize();
  return aiService;
}