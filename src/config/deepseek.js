/**
 * Configuración para la API de Deepseek
 */
require('dotenv').config();

module.exports = {
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: process.env.DEEPSEEK_MODEL || 'deepseek-coder',
  temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.5'),
  maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '4096'),
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
};