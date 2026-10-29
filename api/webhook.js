import { webhookCallback } from 'grammy';
import { bot } from '../lib/bot.js';

// Telegram шлёт обновления сюда. WEBHOOK_SECRET проверяет, что запрос пришёл от Telegram.
export default webhookCallback(bot, 'https', {
  secretToken: process.env.WEBHOOK_SECRET,
});
