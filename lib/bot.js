import { Bot, InlineKeyboard } from 'grammy';
import { CATEGORIES, findItem, findCategory } from './menu.js';
import { getState, setState } from './store.js';

// Данные ресторана (из sama.ge и Instagram). Телефон и адрес можно поменять здесь.
const RESTAURANT = {
  name: 'SAMA',
  address: 'Ниношвили/Тавдадебули, 17/1-3 б, Батуми',
  hours: 'ежедневно 9:00–0:00',
  phone: '+995 577 28 34 34',
  site: 'https://sama.ge/ru',
};

export const bot = new Bot(process.env.BOT_TOKEN);

const money = (n) => `${n} ₾`;

function mainMenu() {
  return new InlineKeyboard()
    .text('📖 Меню', 'menu').text('🛒 Корзина', 'cart').row()
    .text('ℹ️ О ресторане', 'info').url('🌐 Сайт', RESTAURANT.site);
}

function cartTotal(cart) {
  let total = 0;
  let count = 0;
  for (const [id, qty] of Object.entries(cart)) {
    const item = findItem(id);
    if (item) {
      total += item.price * qty;
      count += qty;
    }
  }
  return { total, count };
}

function cartText(cart) {
  const lines = Object.entries(cart)
    .map(([id, qty]) => {
      const item = findItem(id);
      return item ? `${item.name} × ${qty} — ${money(item.price * qty)}` : null;
    })
    .filter(Boolean);
  const { total } = cartTotal(cart);
  return lines.length
    ? `🛒 Ваш заказ:\n\n${lines.join('\n')}\n\nИтого: ${money(total)}`
    : 'Корзина пуста. Откройте меню и добавьте блюда.';
}

bot.command('start', async (ctx) => {
  await ctx.reply(
    `Добро пожаловать в ${RESTAURANT.name}! 🍣\nВыберите блюда из меню, соберите заказ и оформите его прямо здесь.`,
    { reply_markup: mainMenu() },
  );
});

bot.command('menu', async (ctx) => showCategories(ctx));

bot.on('callback_query:data', async (ctx) => {
  const userId = ctx.from.id;
  const data = ctx.callbackQuery.data;
  const state = await getState(userId);

  if (data === 'home') {
    await ctx.editMessageText('Главное меню:', { reply_markup: mainMenu() }).catch(() => {});
  } else if (data === 'menu') {
    await showCategories(ctx, true);
  } else if (data.startsWith('cat:')) {
    await showCategory(ctx, data.slice(4), true);
  } else if (data.startsWith('add:')) {
    const id = data.slice(4);
    const item = findItem(id);
    if (item) {
      state.cart[id] = (state.cart[id] ?? 0) + 1;
      await setState(userId, state);
      await ctx.answerCallbackQuery({ text: `Добавлено: ${item.name}` });
      return;
    }
  } else if (data === 'cart') {
    await showCart(ctx, state.cart, true);
  } else if (data === 'clear') {
    state.cart = {};
    await setState(userId, state);
    await ctx.editMessageText('Корзина очищена.', { reply_markup: mainMenu() }).catch(() => {});
  } else if (data === 'checkout') {
    if (!Object.keys(state.cart).length) {
      await ctx.answerCallbackQuery({ text: 'Корзина пуста' });
      return;
    }
    state.step = 'phone';
    state.order = {};
    await setState(userId, state);
    await ctx.reply('Оставьте номер телефона для связи (например, +995 5XX XXX XXX):');
  } else if (data.startsWith('method:')) {
    state.order.method = data.slice(7);
    if (state.order.method === 'delivery') {
      state.step = 'address';
      await setState(userId, state);
      await ctx.editMessageText('Напишите адрес доставки (улица, дом, подъезд, этаж):');
    } else {
      state.order.address = RESTAURANT.address;
      await finishOrder(ctx, state);
    }
  } else if (data === 'info') {
    await ctx.editMessageText(
      `📍 ${RESTAURANT.address}\n🕘 ${RESTAURANT.hours}\n📞 ${RESTAURANT.phone}`,
      { reply_markup: new InlineKeyboard().text('⬅️ Назад', 'home') },
    ).catch(() => {});
  }

  await ctx.answerCallbackQuery().catch(() => {});
});

bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id;
  const state = await getState(userId);
  const text = ctx.message.text.trim();

  if (state.step === 'phone') {
    state.order.phone = text;
    state.step = 'method';
    await setState(userId, state);
    await ctx.reply('Как получить заказ?', {
      reply_markup: new InlineKeyboard()
        .text('🚗 Доставка', 'method:delivery')
        .text('🏃 Самовывоз', 'method:pickup'),
    });
  } else if (state.step === 'address') {
    state.order.address = text;
    await finishOrder(ctx, state);
  }
});

async function showCategories(ctx, edit = false) {
  const kb = new InlineKeyboard();
  for (const cat of CATEGORIES) kb.text(cat.title, `cat:${cat.key}`).row();
  kb.text('⬅️ Назад', 'home');
  const text = 'Выберите раздел меню:';
  if (edit) await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {});
  else await ctx.reply(text, { reply_markup: kb });
}

async function showCategory(ctx, key, edit = false) {
  const cat = findCategory(key);
  if (!cat) return;
  const kb = new InlineKeyboard();
  for (const item of cat.items) {
    kb.text(`${item.name} — ${money(item.price)}`, `add:${item.id}`).row();
  }
  kb.text('🛒 Корзина', 'cart').text('⬅️ Меню', 'menu');
  const text = `${cat.title}\nНажмите на блюдо, чтобы добавить его в корзину.`;
  if (edit) await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {});
  else await ctx.reply(text, { reply_markup: kb });
}

async function showCart(ctx, cart, edit = false) {
  const kb = new InlineKeyboard();
  if (Object.keys(cart).length) kb.text('✅ Оформить заказ', 'checkout').row().text('🗑 Очистить', 'clear').row();
  kb.text('📖 Меню', 'menu').text('⬅️ Назад', 'home');
  const text = cartText(cart);
  if (edit) await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {});
  else await ctx.reply(text, { reply_markup: kb });
}

async function finishOrder(ctx, state) {
  const userId = ctx.from.id;
  const { cart, order } = state;
  const { total } = cartTotal(cart);
  const who = ctx.from.username ? `@${ctx.from.username}` : `id ${userId}`;

  const summary = [
    `🆕 Новый заказ (${RESTAURANT.name})`,
    `Клиент: ${who}`,
    `Телефон: ${order.phone}`,
    `Получение: ${order.method === 'delivery' ? 'доставка' : 'самовывоз'}`,
    `Адрес: ${order.address}`,
    '',
    cartText(cart),
  ].join('\n');

  // Заказ уходит в чат ресторана, если указан ADMIN_CHAT_ID. Иначе — клиенту (для демо).
  const target = process.env.ADMIN_CHAT_ID || userId;
  await ctx.api.sendMessage(target, summary);

  state.cart = {};
  state.step = null;
  state.order = {};
  await setState(userId, state);

  await ctx.reply(
    `✅ Заказ принят! Сумма: ${money(total)}. Мы свяжемся с вами по номеру ${order.phone}.`,
    { reply_markup: mainMenu() },
  );
}
