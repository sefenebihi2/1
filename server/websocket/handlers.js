export function setupWebSocketHandlers(wss) {
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to AI Trading WebSocket',
      timestamp: new Date().toISOString()
    }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleWebSocketMessage(ws, data, wss);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

function handleWebSocketMessage(ws, data, wss) {
  const { type, payload } = data;
  
  switch (type) {
    case 'subscribe_ticker':
      handleTickerSubscription(ws, payload);
      break;
      
    case 'subscribe_signals':
      handleSignalsSubscription(ws, payload);
      break;
      
    case 'subscribe_trades':
      handleTradesSubscription(ws, payload);
      break;
      
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${type}`,
        timestamp: new Date().toISOString()
      }));
  }
}

function handleTickerSubscription(ws, payload) {
  const { symbol } = payload;
  
  if (!symbol) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Symbol is required for ticker subscription',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Add symbol to client subscriptions
  if (!ws.subscriptions) {
    ws.subscriptions = new Set();
  }
  ws.subscriptions.add(`ticker_${symbol}`);
  
  ws.send(JSON.stringify({
    type: 'subscription_confirmed',
    subscription: `ticker_${symbol}`,
    timestamp: new Date().toISOString()
  }));
}

function handleSignalsSubscription(ws, payload) {
  const { symbols = [], signalTypes = [] } = payload;
  
  if (!ws.subscriptions) {
    ws.subscriptions = new Set();
  }
  
  ws.subscriptions.add('signals');
  ws.signalFilters = { symbols, signalTypes };
  
  ws.send(JSON.stringify({
    type: 'subscription_confirmed',
    subscription: 'signals',
    filters: { symbols, signalTypes },
    timestamp: new Date().toISOString()
  }));
}

function handleTradesSubscription(ws, payload) {
  const { userId } = payload;
  
  if (!userId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'User ID is required for trades subscription',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  if (!ws.subscriptions) {
    ws.subscriptions = new Set();
  }
  
  ws.subscriptions.add(`trades_${userId}`);
  
  ws.send(JSON.stringify({
    type: 'subscription_confirmed',
    subscription: `trades_${userId}`,
    timestamp: new Date().toISOString()
  }));
}

// Broadcast functions (to be called from other parts of the application)
export function broadcastSignal(wss, signal) {
  wss.clients.forEach(client => {
    if (client.readyState === 1 && // WebSocket.OPEN
        client.subscriptions && 
        client.subscriptions.has('signals')) {
      
      // Apply filters if any
      let shouldSend = true;
      if (client.signalFilters) {
        const { symbols, signalTypes } = client.signalFilters;
        
        if (symbols.length > 0 && !symbols.includes(signal.symbol)) {
          shouldSend = false;
        }
        
        if (signalTypes.length > 0 && !signalTypes.includes(signal.signal_type)) {
          shouldSend = false;
        }
      }
      
      if (shouldSend) {
        client.send(JSON.stringify({
          type: 'signal',
          data: signal,
          timestamp: new Date().toISOString()
        }));
      }
    }
  });
}

export function broadcastTrade(wss, trade) {
  wss.clients.forEach(client => {
    if (client.readyState === 1 && 
        client.subscriptions && 
        client.subscriptions.has(`trades_${trade.user_id}`)) {
      
      client.send(JSON.stringify({
        type: 'trade',
        data: trade,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

export function broadcastTicker(wss, symbol, tickerData) {
  wss.clients.forEach(client => {
    if (client.readyState === 1 && 
        client.subscriptions && 
        client.subscriptions.has(`ticker_${symbol}`)) {
      
      client.send(JSON.stringify({
        type: 'ticker',
        symbol,
        data: tickerData,
        timestamp: new Date().toISOString()
      }));
    }
  });
}