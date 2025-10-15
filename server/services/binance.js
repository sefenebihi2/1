import axios from 'axios';
import crypto from 'crypto';
import WebSocket from 'ws';

class BinanceService {
  constructor() {
    this.baseURL = 'https://testnet.binancefuture.com'; // Use testnet by default
    this.wsBaseURL = 'wss://stream.binancefuture.com';
    this.apiKey = null;
    this.secretKey = null;
    this.streams = new Map();
  }

  setCredentials(apiKey, secretKey, isTestnet = true) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseURL = isTestnet 
      ? 'https://testnet.binancefuture.com' 
      : 'https://fapi.binance.com';
    this.wsBaseURL = isTestnet 
      ? 'wss://stream.binancefuture.com' 
      : 'wss://fstream.binance.com';
  }

  createSignature(queryString, secretKey) {
    return crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');
  }

  async makeRequest(endpoint, method = 'GET', params = {}, signed = false) {
    try {
      const timestamp = Date.now();
      let queryString = new URLSearchParams(params).toString();

      if (signed) {
        queryString += `&timestamp=${timestamp}`;
        const signature = this.createSignature(queryString, this.secretKey);
        queryString += `&signature=${signature}`;
      }

      const url = `${this.baseURL}${endpoint}${queryString ? '?' + queryString : ''}`;
      
      const config = {
        method,
        url,
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Binance API Error:', error.response?.data || error.message);
      throw new Error(`Binance API Error: ${error.response?.data?.msg || error.message}`);
    }
  }

  // Account Information
  async getAccountInfo() {
    return await this.makeRequest('/fapi/v2/account', 'GET', {}, true);
  }

  async getBalance() {
    return await this.makeRequest('/fapi/v2/balance', 'GET', {}, true);
  }

  // Market Data
  async getExchangeInfo() {
    return await this.makeRequest('/fapi/v1/exchangeInfo');
  }

  async getTicker24hr(symbol = null) {
    const params = symbol ? { symbol } : {};
    return await this.makeRequest('/fapi/v1/ticker/24hr', 'GET', params);
  }

  async getKlines(symbol, interval, limit = 500) {
    const params = { symbol, interval, limit };
    return await this.makeRequest('/fapi/v1/klines', 'GET', params);
  }

  async getOrderBook(symbol, limit = 100) {
    const params = { symbol, limit };
    return await this.makeRequest('/fapi/v1/depth', 'GET', params);
  }

  // Trading
  async createOrder(orderData) {
    return await this.makeRequest('/fapi/v1/order', 'POST', orderData, true);
  }

  async cancelOrder(symbol, orderId) {
    const params = { symbol, orderId };
    return await this.makeRequest('/fapi/v1/order', 'DELETE', params, true);
  }

  async getOrder(symbol, orderId) {
    const params = { symbol, orderId };
    return await this.makeRequest('/fapi/v1/order', 'GET', params, true);
  }

  async getOpenOrders(symbol = null) {
    const params = symbol ? { symbol } : {};
    return await this.makeRequest('/fapi/v1/openOrders', 'GET', params, true);
  }

  async getAllOrders(symbol, limit = 500) {
    const params = { symbol, limit };
    return await this.makeRequest('/fapi/v1/allOrders', 'GET', params, true);
  }

  // Position Information
  async getPositions() {
    return await this.makeRequest('/fapi/v2/positionRisk', 'GET', {}, true);
  }

  // WebSocket Streams
  subscribeToTicker(symbol, callback) {
    const streamName = `${symbol.toLowerCase()}@ticker`;
    const ws = new WebSocket(`${this.wsBaseURL}/ws/${streamName}`);
    
    ws.on('message', (data) => {
      const parsed = JSON.parse(data);
      callback(parsed);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${streamName}:`, error);
    });

    this.streams.set(streamName, ws);
    return ws;
  }

  subscribeToKline(symbol, interval, callback) {
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(`${this.wsBaseURL}/ws/${streamName}`);
    
    ws.on('message', (data) => {
      const parsed = JSON.parse(data);
      callback(parsed);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${streamName}:`, error);
    });

    this.streams.set(streamName, ws);
    return ws;
  }

  subscribeToUserData(listenKey, callback) {
    const ws = new WebSocket(`${this.wsBaseURL}/ws/${listenKey}`);
    
    ws.on('message', (data) => {
      const parsed = JSON.parse(data);
      callback(parsed);
    });

    ws.on('error', (error) => {
      console.error('User data WebSocket error:', error);
    });

    return ws;
  }

  // Utility functions
  async startUserDataStream() {
    return await this.makeRequest('/fapi/v1/listenKey', 'POST', {}, true);
  }

  async keepAliveUserDataStream(listenKey) {
    return await this.makeRequest('/fapi/v1/listenKey', 'PUT', { listenKey }, true);
  }

  closeStream(streamName) {
    const ws = this.streams.get(streamName);
    if (ws) {
      ws.close();
      this.streams.delete(streamName);
    }
  }

  closeAllStreams() {
    this.streams.forEach((ws) => ws.close());
    this.streams.clear();
  }
}

export const binanceService = new BinanceService();

export async function initializeBinanceService() {
  console.log('Binance service initialized');
  return binanceService;
}