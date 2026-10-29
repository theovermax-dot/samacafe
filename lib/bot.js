import { Bot, InlineKeyboard } from 'grammy';
import { CATEGORIES, findItem, findByName, findCategory, findCategoryOfItem } from './menu.js';

// Бот не использует базу данных: корзина и шаги оформления хранятся в тексте сообщений.
// Каждый экран показывает корзину строками «• Блюдо × N — X ₾», при нажатии кнопки бот
// читает корзину из текста сообщения, меняет её и перерисовывает экран.

const RESTAURANT = {
  name: 'SAMA',
  address: 'Ниношвили/Тавдадебули, 17/1-3 б, Батуми',
  hours: 'ежедневно 9:00–0:00',
  phone: '+995 577 28 34 34',
  site: 'https://sama.ge/ru',
};

export const bot = new Bot(process.env.BOT_TOKEN);

const PHONE_PROMPT = '📞 Напишите номер телефона для связи ответом на это сообщение (например, +995 5XX XXX XXX).';
const ADDRESS_PROMPT = '📍 Напишите адрес доставки ответом на это сообщение (улица, дом, подъезд, этаж).';

const money = (n) => `${n} ₾`;

// ---------- корзина ----------

function parseCart(text = '') {
  const cart = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('• ')) continue;
    const body = line.slice(2);
    const sep = body.lastIndexOf(' × ');
    if (sep < 0) continue;
    const item = findByName(body.slice(0, sep));
    const qty = parseInt(body.slice(sep + 3), 10);
    if (item && qty > 0) cart.push({ id: item.id, qty });
  }
  return cart;
}

const total = (cart) => cart.reduce((sum, { id, qty }) => sum + findItem(id).price * qty, 0);

function cartBlock(cart) {
  if (!cart.length) return '🛒 Корзина пуста';
  const lines = cart.map(({ id, qty }) => {
    const item = findItem(id);
    return `• ${item.name} × ${qty} — ${money(item.price * qty)}`;
  });
  return `🛒 Корзина:\n${lines.join('\n')}\nИтого: ${money(total(cart))}`;
}

function addToCart(cart, id) {
  const entry = cart.find((c) => c.id === id);
  if (entry) entry.qty += 1;
  else cart.push({ id, qty: 1 });
}

function removeLast(cart) {
  const last = cart[cart.length - 1];
  if (!last) return;
  last.qty -= 1;
  if (last.qty <= 0) cart.pop();
}

function field(text, label) {
  const m = text.match(new RegExp(`^${label}: (.+)$`, 'm'));
  return m ? m[1].trim() : '';
}

// ---------- экраны ----------

function mainMenu() {
  return new InlineKeyboard()
    .text('📖 Меню', 'menu').text('🛒 Корзина', 'cart').row()
    .text('ℹ️ О ресторане', 'info').url('🌐 Сайт', RESTAURANT.site);
}

const screens = {
  home: (cart) => ({
    text: `Добро пожаловать в ${RESTAURANT.name}! 🍣\nВыберите блюда, соберите заказ и оформите его прямо здесь.\n\n${cartBlock(cart)}`,
    kb: mainMenu(),
  }),
  menu: (cart) => {
    const kb = new InlineKeyboard();
    for (const cat of CATEGORIES) kb.text(cat.title, `cat:${cat.key}`).row();
    kb.text('🛒 Корзина', 'cart').text('⬅️ Назад', 'home');
    return { text: `Выберите раздел меню:\n\n${cartBlock(cart)}`, kb };
  },
  category: (cart, key) => {
    const cat = findCategory(key);
    const kb = new InlineKeyboard();
    for (const item of cat.items) kb.text(`${item.name} — ${money(item.price)}`, `add:${item.id}`).row();
    kb.text('🛒 Корзина', 'cart').text('⬅️ Меню', 'menu');
    return { text: `${cat.title}\nНажмите на блюдо, чтобы добавить его в заказ.\n\n${cartBlock(cart)}`, kb };
  },
  cart: (cart) => {
    const kb = new InlineKeyboard();
    if (cart.length) {
      kb.text('✅ Оформить заказ', 'checkout').row();
      kb.text('➖ Убрать последнее', 'undo').text('🗑 Очистить', 'clear').row();
    }
    kb.text('📖 Меню', 'menu').text('⬅️ Назад', 'home');
    return { text: cartBlock(cart), kb };
  },
  info: (cart) => ({
    text: `📍 ${RESTAURANT.address}\n🕘 ${RESTAURANT.hours}\n📞 ${RESTAURANT.phone}\n\n${cartBlock(cart)}`,
    kb: new InlineKeyboard().text('⬅️ Назад', 'home'),
  }),
};

// ---------- команды ----------

bot.command('start', async (ctx) => {
  const s = screens.home([]);
  await ctx.reply(s.text, { reply_markup: s.kb });
});

bot.command('menu', async (ctx) => {
  const s = screens.menu([]);
  await ctx.reply(s.text, { reply_markup: s.kb });
});

// ---------- кнопки ----------

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const text = ctx.callbackQuery.message?.text ?? '';
  const cart = parseCart(text);
  let toast;
  let screen = null;

  if (data === 'home') screen = screens.home(cart);
  else if (data === 'menu') screen = screens.menu(cart);
  else if (data === 'cart') screen = screens.cart(cart);
  else if (data === 'info') screen = screens.info(cart);
  else if (data.startsWith('cat:')) {
    if (findCategory(data.slice(4))) screen = screens.category(cart, data.slice(4));
  } else if (data.startsWith('add:')) {
    const item = findItem(data.slice(4));
    if (item) {
      addToCart(cart, item.id);
      screen = screens.category(cart, findCategoryOfItem(item.id).key);
      toast = `Добавлено: ${item.name}`;
    }
  } else if (data === 'undo') {
    removeLast(cart);
    screen = screens.cart(cart);
  } else if (data === 'clear') {
    screen = screens.cart([]);
  } else if (data === 'checkout') {
    if (!cart.length) toast = 'Корзина пуста';
    else {
      await ctx.reply(`${PHONE_PROMPT}\n\n${cartBlock(cart)}`, {
        reply_markup: { force_reply: true, input_field_placeholder: '+995 ...' },
      });
    }
  } else if (data === 'method:delivery' || data === 'method:pickup') {
    const phone = field(text, 'Телефон');
    await ctx.editMessageReplyMarkup().catch(() => {});
    if (!cart.length) toast = 'Корзина пуста';
    else if (data === 'method:delivery') {
      await ctx.reply(`${ADDRESS_PROMPT}\nТелефон: ${phone}\n\n${cartBlock(cart)}`, {
        reply_markup: { force_reply: true, input_field_placeholder: 'Улица, дом, подъезд' },
      });
    } else {
      await finishOrder(ctx, { cart, phone, method: 'pickup', address: RESTAURANT.address });
    }
  }

  if (screen) await ctx.editMessageText(screen.text, { reply_markup: screen.kb }).catch(() => {});
  await ctx.answerCallbackQuery(toast ? { text: toast } : undefined).catch(() => {});
});

// ---------- ответы пользователя (телефон, адрес) ----------

bot.on('message:text', async (ctx) => {
  const base = ctx.message.reply_to_message?.text ?? '';
  const input = ctx.message.text.trim();

  if (base.startsWith(PHONE_PROMPT)) {
    const cart = parseCart(base);
    if (input.replace(/\D/g, '').length < 6) {
      await ctx.reply(`Не похоже на номер телефона. Попробуйте ещё раз.\n\n${PHONE_PROMPT}\n\n${cartBlock(cart)}`, {
        reply_markup: { force_reply: true },
      });
      return;
    }
    await ctx.reply(`Как получить заказ?\nТелефон: ${input}\n\n${cartBlock(cart)}`, {
      reply_markup: new InlineKeyboard().text('🚗 Доставка', 'method:delivery').text('🏃 Самовывоз', 'method:pickup'),
    });
  } else if (base.startsWith(ADDRESS_PROMPT)) {
    await finishOrder(ctx, {
      cart: parseCart(base),
      phone: field(base, 'Телефон'),
      method: 'delivery',
      address: input,
    });
  } else {
    await ctx.reply('Нажмите /start, чтобы открыть меню.');
  }
});

// ---------- оформление ----------

async function finishOrder(ctx, { cart, phone, method, address }) {
  if (!cart.length) {
    await ctx.reply('Корзина пуста. Нажмите /start и соберите заказ заново.');
    return;
  }
  const who = ctx.from.username ? `@${ctx.from.username}` : `id ${ctx.from.id}`;
  const summary = [
    `🆕 Новый заказ (${RESTAURANT.name})`,
    `Клиент: ${who}`,
    `Телефон: ${phone}`,
    `Получение: ${method === 'delivery' ? 'доставка' : 'самовывоз'}`,
    `Адрес: ${address}`,
    '',
    cartBlock(cart),
  ].join('\n');

  // Заказ уходит в чат ресторана, если указан ADMIN_CHAT_ID. Иначе клиенту (режим демо).
  await ctx.api.sendMessage(process.env.ADMIN_CHAT_ID || ctx.from.id, summary);

  await ctx.reply(
    `✅ Заказ принят! Сумма: ${money(total(cart))}.\nМы свяжемся с вами по номеру ${phone}.`,
    { reply_markup: mainMenu() },
  );
}

bot.catch((err) => console.error('bot error:', err.error ?? err));
