# MySQL Setup Guide

## Fixed Issues

### 1. MySQL Connection Configuration
- Added MySQL environment variables to `.env` file
- Configuration includes: host, port, user, password, and database name

### 2. API Route Error Fix
- Fixed the `/api/` route returning 404 error
- Added root API endpoint that returns API information and available endpoints
- Now accessing `http://localhost:3001/api/` returns proper API information instead of "Route not found"

## MySQL Setup Instructions

### Step 1: Install MySQL

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

**On macOS (using Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**On Windows:**
- Download MySQL installer from https://dev.mysql.com/downloads/mysql/
- Run the installer and follow the setup wizard
- Start MySQL service from Windows Services

### Step 2: Secure MySQL Installation

```bash
sudo mysql_secure_installation
```

Follow the prompts to:
- Set root password (use: Network@12 or update .env accordingly)
- Remove anonymous users
- Disallow root login remotely
- Remove test database

### Step 3: Create Database

Login to MySQL:
```bash
mysql -u root -p
```

Create the database:
```sql
CREATE DATABASE ai_trading CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Step 4: Verify Configuration

Your `.env` file is already configured with these settings:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Network@12
DB_NAME=ai_trading
```

**Important:** If you set a different password during MySQL installation, update `DB_PASSWORD` in `.env`

### Step 5: Start the Server

The server will automatically:
1. Connect to MySQL
2. Create all required tables from the schema
3. Initialize the database structure

Start the server:
```bash
npm run dev
```

## Database Schema

The application will automatically create these tables:
- **users** - User accounts and authentication
- **api_keys** - Encrypted Binance API credentials
- **portfolios** - Portfolio tracking
- **trades** - Trade execution history
- **signals** - AI-generated trading signals
- **strategies** - Trading strategies
- **market_data** - Historical market data
- **technical_indicators** - Technical analysis data
- **performance_metrics** - Trading performance
- **risk_assessments** - Risk management
- **notifications** - User notifications
- **ai_models** - AI model configurations

## Testing the Connection

Once MySQL is running, start the server and check the logs for:
```
Connected to MySQL database
Database schema initialized successfully
```

## API Endpoints

The server now provides these endpoints:

- **GET /health** - Health check
- **GET /api** - API information and available endpoints
- **POST /api/auth/register** - User registration
- **POST /api/auth/login** - User login
- **GET /api/auth/profile** - Get user profile
- **And more...**

## Troubleshooting

### Connection Refused Error
- Verify MySQL is running: `sudo systemctl status mysql` or `brew services list`
- Check if MySQL is listening on port 3306: `netstat -an | grep 3306`
- Verify firewall allows connections to port 3306

### Access Denied Error
- Verify username and password in `.env` match MySQL credentials
- Check user permissions: `GRANT ALL PRIVILEGES ON ai_trading.* TO 'root'@'localhost';`

### Database Not Found Error
- Create the database: `CREATE DATABASE ai_trading;`
- Verify database exists: `SHOW DATABASES;`

## Next Steps

1. Install and start MySQL server
2. Create the `ai_trading` database
3. Run `npm run dev` to start the application
4. The database tables will be created automatically
5. Test the API by visiting: `http://localhost:3001/api/`
