/**
 * env.js
 * Centralized configuration module.
 * Loads environment variables, validates required keys, and exports configured defaults.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Disable TLS validation check to prevent fetch failures behind corporate proxy/firewalls
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  env: process.env.NODE_ENV || 'development',
  
  // API Keys
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  groqApiKeys: Object.keys(process.env)
    .filter(key => /^GROQ_API_KEY(_\d+)?\d*$/.test(key))
    .map(key => process.env[key])
    .filter(value => !!value),

  
  // Cache Settings
  cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || '3600000', 10), // Default: 1 hour

  
  // Business/Agent Settings
  maxRecollectionAttempts: parseInt(process.env.MAX_RECOLLECTION_ATTEMPTS || '2', 10),
};

// Validate critical keys in production or non-test environments
const validateConfig = () => {
  const missingKeys = [];
  
  if (!config.geminiApiKey) {
    missingKeys.push('GEMINI_API_KEY');
  }
  
  if (!config.tavilyApiKey) {
    missingKeys.push('TAVILY_API_KEY');
  }
  
  if (missingKeys.length > 0 && config.env === 'production') {
    console.warn(
      `[Warning]: Missing critical environment variables: ${missingKeys.join(', ')}. ` +
      'Application might degrade or fail in production mode.'
    );
  }
};

validateConfig();

module.exports = config;
