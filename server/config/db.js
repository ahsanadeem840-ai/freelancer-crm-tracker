const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas or local MongoDB instance using Mongoose.
 * Reads MONGODB_URI from environment variables.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    throw new Error('MONGODB_URI is missing. Please check your .env file.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000, // Timeout after 8s instead of hanging
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database Name:    ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
      console.error('👉 Hint: Check your MongoDB Atlas database username & password in .env.');
    } else if (error.message.includes('timed out') || error.message.includes('Server selection timed out')) {
      console.error('👉 Hint: Ensure your current IP address is whitelisted in MongoDB Atlas Network Access (e.g., 0.0.0.0/0 for dev).');
    }
    throw error;
  }
};

// Monitor connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected successfully.');
});

module.exports = connectDB;
