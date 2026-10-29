import { webhookCallback } from 'grammy';
import { bot } from '../lib/bot.js';

// Telegram шлёт обновления сюда. WEBHOOK_SECRET проверяет, что запрос пришёл от Telegram.
export default webhookCallback(bot, 'https', {
  secretToken: process.env.WEBHOOK_SECRET,
  // Отправка фото может занять больше 10 секунд. Не даём Telegram повторять обновление и дублировать альбомы.
  timeoutMilliseconds: 50_000,
  onTimeout: 'return',
});
