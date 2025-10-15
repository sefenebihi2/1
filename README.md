# AI Binance Trading Platform

A comprehensive AI-powered trading platform for Binance Futures and Margin trading with advanced signal generation and analysis capabilities.

## Features

### Core Features
- **Real-time Binance API Integration**: Direct connection to Binance Futures and Margin trading
- **AI-Powered Signal Generation**: Advanced technical analysis with machine learning insights
- **Live Market Data**: Real-time price feeds, order book data, and market statistics
- **Automated Trading**: Execute trades based on AI signals with risk management
- **Portfolio Management**: Track balances, positions, and performance metrics
- **Advanced Analytics**: Historical performance tracking and trading insights
- **Real-time Notifications**: WebSocket-based live updates and alerts
- **Risk Management**: Comprehensive risk assessment and management tools

### Technical Features
- **Professional Trading Interface**: Dark theme optimized for extended trading sessions
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **MySQL Database**: Robust data storage with comprehensive schema design
- **WebSocket Integration**: Real-time data streaming and live updates
- **JWT Authentication**: Secure user authentication and session management
- **API Rate Limiting**: Built-in protection against API abuse
- **Error Handling**: Comprehensive error handling and user feedback

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Lucide React** for icons
- **WebSocket** for real-time updates

### Backend
- **Node.js** with Express.js
- **MySQL** database with comprehensive schema
- **JWT** for authentication
- **WebSocket** for real-time communication
- **Binance API** integration
- **bcryptjs** for password hashing

## Database Schema

The platform uses a comprehensive MySQL database with the following key tables:

- **users**: User accounts and authentication
- **api_keys**: Encrypted Binance API credentials
- **portfolios**: Portfolio tracking and balances
- **trades**: Trade execution history
- **signals**: AI-generated trading signals
- **strategies**: Trading strategies and configurations
- **market_data**: Historical market data cache
- **technical_indicators**: Calculated technical indicators
- **performance_metrics**: Trading performance analytics
- **risk_assessments**: Risk management data
- **notifications**: User alerts and notifications
- **ai_models**: ML model configurations and versions

## Getting Started

### Prerequisites

1. **MySQL Database**: Install and set up MySQL server
2. **Node.js**: Version 18 or higher
3. **Binance Account**: For API access (use testnet for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-binance-trading-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - Create a MySQL database named `ai_trading`
   - The schema will be automatically created when you start the server
   - Update database credentials in `.env` file

4. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update all environment variables with your values
   - **Important**: Use Binance Testnet for development

5. **Start the application**
   ```bash
   npm run dev
   ```

   This will start both the frontend (port 5173) and backend (port 3001)

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ai_trading

# JWT Secret
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here

# Binance API (Use testnet for development)
BINANCE_API_KEY=your_binance_testnet_api_key
BINANCE_SECRET_KEY=your_binance_testnet_secret_key
BINANCE_TESTNET=true

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Trading
- `GET /api/trading/account` - Get account information
- `GET /api/trading/market/:symbol` - Get market data
- `GET /api/trading/ticker/:symbol` - Get ticker data
- `POST /api/trading/order` - Place order
- `DELETE /api/trading/order/:symbol/:orderId` - Cancel order
- `GET /api/trading/orders/open` - Get open orders
- `GET /api/trading/trades` - Get trade history
- `GET /api/trading/positions` - Get positions

### Signals
- `POST /api/signals/generate/:symbol` - Generate AI signal
- `GET /api/signals/active` - Get active signals
- `GET /api/signals/:id` - Get signal by ID
- `POST /api/signals/:id/execute` - Execute signal
- `GET /api/signals/history` - Get signal history
- `GET /api/signals/stats/performance` - Get signal performance stats

### Portfolio
- `GET /api/portfolio/overview` - Portfolio overview
- `GET /api/portfolio/balances` - Get balances
- `POST /api/portfolio/sync` - Sync with Binance
- `GET /api/portfolio/performance` - Performance metrics
- `GET /api/portfolio/risk` - Risk assessment
- `POST /api/portfolio/api-keys` - Add API keys
- `GET /api/portfolio/api-keys` - Get API keys

### Analytics
- `GET /api/analytics/trading` - Trading analytics
- `GET /api/analytics/signals` - Signal analytics
- `GET /api/analytics/market` - Market analytics
- `GET /api/analytics/ai-models` - AI model performance

## AI Signal Generation

The platform includes a sophisticated AI service that generates trading signals based on:

### Technical Indicators
- **RSI (Relative Strength Index)**: Overbought/oversold conditions
- **MACD**: Trend direction and momentum
- **Moving Averages**: SMA and EMA crossovers
- **Bollinger Bands**: Volatility and mean reversion
- **Stochastic Oscillator**: Momentum indicator
- **ATR (Average True Range)**: Volatility measurement

### Signal Features
- **Confidence Scoring**: Each signal includes a confidence percentage
- **Risk-Reward Ratios**: Calculated risk-reward ratios for each signal
- **Entry/Exit Points**: Suggested entry prices with stop-loss and take-profit levels
- **Multiple Timeframes**: Signals generated for different timeframes (1m, 5m, 15m, 30m, 1h, 4h, 1d)
- **Signal Expiration**: Signals automatically expire to ensure relevance

## Security Features

- **Encrypted API Keys**: Binance API keys are encrypted before storage
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation and sanitization
- **SQL Injection Protection**: Parameterized queries to prevent SQL injection
- **CORS Protection**: Configured CORS policies
- **Helmet.js**: Security headers for additional protection

## Development

### Project Structure
```
├── database/           # Database schema and migrations
├── server/            # Backend server code
│   ├── routes/        # API routes
│   ├── services/      # Business logic services
│   ├── middleware/    # Express middleware
│   └── websocket/     # WebSocket handlers
├── src/               # Frontend React code
│   ├── components/    # React components
│   ├── contexts/      # React contexts
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript type definitions
└── public/            # Static assets
```

### Key Services

1. **Database Service**: MySQL connection and query handling
2. **Binance Service**: Binance API integration and WebSocket streams
3. **AI Service**: Signal generation and technical analysis
4. **WebSocket Service**: Real-time communication with frontend

## Deployment

### Production Considerations

1. **Database**: Use a production MySQL instance
2. **Environment Variables**: Set `NODE_ENV=production`
3. **SSL/HTTPS**: Enable SSL for production deployment
4. **API Keys**: Use real Binance API keys (not testnet)
5. **Rate Limiting**: Configure appropriate rate limits
6. **Logging**: Implement comprehensive logging
7. **Monitoring**: Set up monitoring and alerting

### Docker Deployment (Optional)

Create a `Dockerfile` and `docker-compose.yml` for containerized deployment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Disclaimer

This software is for educational and development purposes only. Trading cryptocurrencies involves substantial risk and is not suitable for every investor. Past performance does not guarantee future results. Always conduct your own research and consider your financial situation before making trading decisions.

## Support

For support, please create an issue in the repository or contact the development team.