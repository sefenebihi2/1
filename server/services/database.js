import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

let connection;

export async function initializeDatabase() {
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Network@12',
      database: process.env.DB_NAME || 'ai_trading',
      charset: 'utf8mb4'
    });

    console.log('Connected to MySQL database');

    // Read and execute schema
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }

    console.log('Database schema initialized successfully');
    return connection;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export function getConnection() {
  if (!connection) {
    throw new Error('Database not initialized');
  }
  return connection;
}

export async function executeQuery(sql, params = []) {
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
}

export async function beginTransaction() {
  await connection.beginTransaction();
}

export async function commitTransaction() {
  await connection.commit();
}

export async function rollbackTransaction() {
  await connection.rollback();
}