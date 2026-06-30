const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// MongoDB connection
const connectMongo = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/safesphere';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

// Sequelize (MySQL) connection
let sequelize;

if (process.env.NODE_ENV === 'test') {
  // Use sqlite in-memory for testing to avoid external service dependencies.
  // Sequelize will try to load sqlite3 package. We'll handle mock if it fails.
  try {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false
    });
  } catch (err) {
    console.warn('SQLite dialect load failed for test, falling back to mock Sequelize setup.');
  }
}

if (!sequelize) {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'safesphere',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected successfully via Sequelize');
    return true;
  } catch (error) {
    console.error('MySQL connection error:', error.message);
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Warning: MySQL server is not reachable. Ensure it is running or configured in .env');
    }
    return false;
  }
};

module.exports = {
  mongoose,
  sequelize,
  connectMongo,
  connectMySQL
};
