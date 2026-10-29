# SAMA Telegram-бот (демо)

Меню, корзина, оформление заказа (доставка или самовывоз) и информация о ресторане.
Меню взято с sama.ge/ru, цены в ₾.

## Структура
- `api/webhook.js`: точка входа для Telegram (Vercel)
- `lib/bot.js`: логика бота (меню, корзина, заказ)
- `lib/menu.js`: блюда и цены (менять здесь)
- `lib/store.js`: корзина, хранится в Upstash Redis
- `.env.example`: список переменных окружения

## Запуск (после согласования)
1. Создать репозиторий на GitHub и загрузить эти файлы.
2. Vercel → Add New → Project → выбрать репозиторий → Deploy.
3. Vercel → Storage → Upstash Redis → подключить к проекту (появятся KV_REST_API_*).
4. Vercel → Settings → Environment Variables: добавить BOT_TOKEN, WEBHOOK_SECRET, ADMIN_CHAT_ID (по желанию). Затем Redeploy.
5. Подключить webhook:
   `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<проект>.vercel.app/api/webhook&secret_token=<WEBHOOK_SECRET>`
6. Команды боту: `/start`, `/menu`.
