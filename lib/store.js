// Хранилище состояния (корзина и шаг оформления) по user id.
// На Vercel функции не хранят память между вызовами, поэтому нужен Redis:
// в проекте Vercel подключите Upstash (Storage → Marketplace → Upstash Redis),
// тогда появятся переменные KV_REST_API_URL и KV_REST_API_TOKEN.
// Без них работает память процесса: только для локальных тестов.

const URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;
const memory = new Map();

async function redis(...args) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  return data.result;
}

const empty = () => ({ cart: {}, step: null, order: {} });

export async function getState(userId) {
  if (!URL) return memory.get(userId) ?? empty();
  const raw = await redis('GET', `sama:${userId}`);
  return raw ? JSON.parse(raw) : empty();
}

export async function setState(userId, state) {
  if (!URL) {
    memory.set(userId, state);
    return;
  }
  await redis('SET', `sama:${userId}`, JSON.stringify(state), 'EX', 60 * 60 * 24 * 7);
}
