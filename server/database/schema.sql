/*
  # AI Binance Trading Platform Database Schema

  1. Core Tables
    - `users` - User accounts and authentication
    - `api_keys` - Encrypted Binance API credentials
    - `portfolios` - User portfolio tracking
    - `trades` - Trade execution history
    - `signals` - AI-generated trading signals
    - `strategies` - Trading strategies and configurations
    - `market_data` - Historical market data cache
    - `notifications` - User alerts and notifications

  2. AI & Analytics Tables
    - `ai_models` - ML model configurations and versions
    - `technical_indicators` - Calculated technical indicators
    - `performance_metrics` - Trading performance analytics
    - `risk_assessments` - Risk management data

  3. Security & Audit
    - All tables include audit trails with created_at/updated_at
    - API keys are encrypted using AES-256
    - User sessions tracked with JWT tokens
    - All trading actions logged for compliance
*/

-- Users table for authentication and profiles
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_active (is_active)
);

-- Encrypted API keys for Binance integration
CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    secret_key_encrypted TEXT NOT NULL,
    is_testnet BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSON DEFAULT NULL,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_active (is_active)
);

-- Portfolio tracking and balances
CREATE TABLE IF NOT EXISTS portfolios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_type ENUM('spot', 'futures', 'margin') NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    balance DECIMAL(20, 8) DEFAULT 0.00000000,
    locked_balance DECIMAL(20, 8) DEFAULT 0.00000000,
    unrealized_pnl DECIMAL(20, 8) DEFAULT 0.00000000,
    total_value_usd DECIMAL(20, 8) DEFAULT 0.00000000,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_account_symbol (user_id, account_type, symbol),
    INDEX idx_user_account (user_id, account_type)
);

-- Trade execution history
CREATE TABLE IF NOT EXISTS trades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    binance_order_id BIGINT UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side ENUM('BUY', 'SELL') NOT NULL,
    type ENUM('MARKET', 'LIMIT', 'STOP_MARKET', 'STOP_LIMIT', 'TAKE_PROFIT_MARKET') NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) DEFAULT NULL,
    stop_price DECIMAL(20, 8) DEFAULT NULL,
    executed_quantity DECIMAL(20, 8) DEFAULT 0.00000000,
    executed_price DECIMAL(20, 8) DEFAULT 0.00000000,
    commission DECIMAL(20, 8) DEFAULT 0.00000000,
    commission_asset VARCHAR(10) DEFAULT NULL,
    status ENUM('NEW', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'REJECTED', 'EXPIRED') NOT NULL,
    time_in_force ENUM('GTC', 'IOC', 'FOK') DEFAULT 'GTC',
    account_type ENUM('spot', 'futures', 'margin') NOT NULL,
    strategy_id INT DEFAULT NULL,
    signal_id INT DEFAULT NULL,
    is_automated BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_symbol (user_id, symbol),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- AI-generated trading signals
CREATE TABLE IF NOT EXISTS signals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(20) NOT NULL,
    signal_type ENUM('BUY', 'SELL', 'HOLD') NOT NULL,
    strength DECIMAL(3, 2) NOT NULL, -- 0.00 to 1.00
    timeframe ENUM('1m', '5m', '15m', '30m', '1h', '4h', '1d') NOT NULL,
    entry_price DECIMAL(20, 8) NOT NULL,
    stop_loss DECIMAL(20, 8) DEFAULT NULL,
    take_profit DECIMAL(20, 8) DEFAULT NULL,
    risk_reward_ratio DECIMAL(5, 2) DEFAULT NULL,
    confidence_score DECIMAL(5, 2) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    technical_indicators JSON DEFAULT NULL,
    market_conditions JSON DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_symbol_timeframe (symbol, timeframe),
    INDEX idx_signal_type (signal_type),
    INDEX idx_strength (strength DESC),
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at DESC)
);

-- Trading strategies configuration
CREATE TABLE IF NOT EXISTS strategies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    strategy_type ENUM('scalping', 'day_trading', 'swing', 'position') NOT NULL,
    risk_level ENUM('low', 'medium', 'high') NOT NULL,
    max_position_size DECIMAL(5, 2) NOT NULL, -- Percentage of portfolio
    stop_loss_pct DECIMAL(5, 2) DEFAULT 2.00,
    take_profit_pct DECIMAL(5, 2) DEFAULT 6.00,
    symbols JSON NOT NULL, -- Array of symbols to trade
    timeframes JSON NOT NULL, -- Array of timeframes
    indicators_config JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    auto_execute BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_active (user_id, is_active)
);

-- Market data cache for analysis
CREATE TABLE IF NOT EXISTS market_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(20) NOT NULL,
    timeframe ENUM('1m', '5m', '15m', '30m', '1h', '4h', '1d') NOT NULL,
    open_time BIGINT NOT NULL,
    close_time BIGINT NOT NULL,
    open_price DECIMAL(20, 8) NOT NULL,
    high_price DECIMAL(20, 8) NOT NULL,
    low_price DECIMAL(20, 8) NOT NULL,
    close_price DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 8) NOT NULL,
    trades_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_symbol_timeframe_time (symbol, timeframe, open_time),
    INDEX idx_symbol_timeframe (symbol, timeframe),
    INDEX idx_close_time (close_time)
);

-- Technical indicators calculations
CREATE TABLE IF NOT EXISTS technical_indicators (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(20) NOT NULL,
    timeframe ENUM('1m', '5m', '15m', '30m', '1h', '4h', '1d') NOT NULL,
    timestamp BIGINT NOT NULL,
    sma_20 DECIMAL(20, 8) DEFAULT NULL,
    sma_50 DECIMAL(20, 8) DEFAULT NULL,
    ema_12 DECIMAL(20, 8) DEFAULT NULL,
    ema_26 DECIMAL(20, 8) DEFAULT NULL,
    macd DECIMAL(20, 8) DEFAULT NULL,
    macd_signal DECIMAL(20, 8) DEFAULT NULL,
    rsi DECIMAL(5, 2) DEFAULT NULL,
    bollinger_upper DECIMAL(20, 8) DEFAULT NULL,
    bollinger_lower DECIMAL(20, 8) DEFAULT NULL,
    stochastic_k DECIMAL(5, 2) DEFAULT NULL,
    stochastic_d DECIMAL(5, 2) DEFAULT NULL,
    atr DECIMAL(20, 8) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_symbol_timeframe_timestamp (symbol, timeframe, timestamp),
    INDEX idx_symbol_timeframe (symbol, timeframe),
    INDEX idx_timestamp (timestamp)
);

-- Performance metrics tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    total_trades INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0.00,
    total_pnl DECIMAL(20, 8) DEFAULT 0.00000000,
    total_fees DECIMAL(20, 8) DEFAULT 0.00000000,
    max_drawdown DECIMAL(5, 2) DEFAULT 0.00,
    sharpe_ratio DECIMAL(5, 2) DEFAULT NULL,
    profit_factor DECIMAL(5, 2) DEFAULT NULL,
    avg_win DECIMAL(20, 8) DEFAULT 0.00000000,
    avg_loss DECIMAL(20, 8) DEFAULT 0.00000000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date)
);

-- Risk assessment and management
CREATE TABLE IF NOT EXISTS risk_assessments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    current_exposure DECIMAL(20, 8) NOT NULL,
    max_exposure DECIMAL(20, 8) NOT NULL,
    risk_score DECIMAL(3, 1) NOT NULL, -- 0.0 to 10.0
    volatility DECIMAL(5, 2) NOT NULL,
    correlation_score DECIMAL(3, 2) DEFAULT NULL,
    var_95 DECIMAL(20, 8) DEFAULT NULL, -- Value at Risk 95%
    recommendations JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_symbol (user_id, symbol),
    INDEX idx_risk_score (risk_score DESC)
);

-- User notifications and alerts
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('trade_executed', 'signal_generated', 'risk_alert', 'system_message') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at DESC)
);

-- AI model configurations
CREATE TABLE IF NOT EXISTS ai_models (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type ENUM('neural_network', 'random_forest', 'svm', 'ensemble') NOT NULL,
    accuracy DECIMAL(5, 2) DEFAULT NULL,
    precision_score DECIMAL(5, 2) DEFAULT NULL,
    recall_score DECIMAL(5, 2) DEFAULT NULL,
    f1_score DECIMAL(5, 2) DEFAULT NULL,
    training_data_size INT DEFAULT NULL,
    features_config JSON NOT NULL,
    hyperparameters JSON DEFAULT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_name_version (name, version),
    INDEX idx_active (is_active),
    INDEX idx_accuracy (accuracy DESC)
);