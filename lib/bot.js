import { Bot, InlineKeyboard } from 'grammy';
import { CATEGORIES, findItem, findByName, findCategory, findCategoryOfItem } from './menu.js';
import { hasPhoto, photoUrl } from './photos.js';

// Бот не использует базу данных: корзина и шаги оформления хранятся в тексте сообщений.
// Каждый экран показывает корзину строками «• Блюдо × N — X ₾». При нажатии кнопки бот
// читает корзину из текста сообщения, меняет её и перерисовывает экран.
// Заказ уходит в чат ресторана (ADMIN_CHAT_ID) карточкой с кнопками статусов.

const RESTAURANT = {
  name: 'SAMA',
  address: 'Ниношвили/Тавдадебули, 17/1-3 б, Батуми',
  hours: 'ежедневно с 9:00 до 24:00',
  phone: '+995 577 28 34 34',
  site: 'https://sama.ge/ru',
  openHour: 9,
  timeZone: 'Asia/Tbilisi',
};

export const bot = new Bot(process.env.BOT_TOKEN);

// Все сообщения отправляем в HTML. 'none' в parse_mode отключает разметку для конкретного вызова.
bot.api.config.use((prev, method, payload, signal) => {
  if (method === 'sendMessage' || method === 'editMessageText') {
    if (payload.parse_mode === 'none') {
      const { parse_mode, ...rest } = payload;
      payload = rest;
    } else if (!payload.parse_mode && !payload.entities) {
      payload = { ...payload, parse_mode: 'HTML' };
    }
  }
  return prev(method, payload, signal);
});

// ---------- утилиты ----------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n) => `${n} ₾`;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function hourNow() {
  const h = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: RESTAURANT.timeZone }).format(new Date());
  return Number(h) % 24;
}
const timeNow = () =>
  new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: RESTAURANT.timeZone }).format(new Date());
const isOpen = () => hourNow() >= RESTAURANT.openHour;

function greeting() {
  const h = hourNow();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

const orderNumber = () => `#${Math.floor(Date.now() / 1000).toString(36).slice(-4).toUpperCase()}`;

function userLink(user) {
  if (user.username) return `@${esc(user.username)}`;
  return `<a href="tg://user?id=${user.id}">${esc(user.first_name || 'Клиент')}</a>`;
}

function field(text, label) {
  const m = text.match(new RegExp(`^${label}: (.+)$`, 'm'));
  return m ? m[1].trim() : '';
}

// ---------- тексты ----------

const PHONE_PROMPT = 'Оставьте номер телефона для связи. Напишите его ответом на это сообщение, например: +995 5XX XXX XXX.';
const ADDRESS_PROMPT = 'Напишите адрес доставки ответом на это сообщение: улица, дом, подъезд, этаж. Если нужно, добавьте комментарий для курьера.';

const HOME_LINES = [
  'Выберите блюда в меню и оформите заказ здесь же. Доставка по Батуми бесплатная, обычно около часа.',
  'Роллы, сашими, азиатская кухня и напитки. Заказ собирается в несколько нажатий.',
  'Можно заказать доставку или забрать заказ самостоятельно. Меню такое же, как на сайте sama.ge.',
];
const ADD_TOASTS = (name) => [`Добавили: ${name}`, `${name} в корзине`];
const THANKS = [
  'Спасибо, что выбрали SAMA. Заказ передан ресторану.',
  'Заказ передан ресторану, скоро с вами свяжутся для подтверждения.',
  'Спасибо за заказ. Мы передали его ресторану и свяжемся с вами в ближайшее время.',
];
const NOT_UNDERSTOOD = [
  'Чтобы сделать заказ, нажмите /start и выберите блюда в меню.',
  'Меню открывается командой /start. Там можно собрать заказ.',
];

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
    return `• ${esc(item.name)} × ${qty} — ${money(item.price * qty)}`;
  });
  return `🛒 <b>Корзина</b>\n<blockquote>${lines.join('\n')}</blockquote>\n<b>Итого: ${money(total(cart))}</b>`;
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

// ---------- экраны ----------

function mainMenu() {
  return new InlineKeyboard()
    .text('📖 Меню', 'menu').text('🛒 Корзина', 'cart').row()
    .text('ℹ️ О ресторане', 'info').url('🌐 Сайт', RESTAURANT.site);
}

const screens = {
  home: (cart) => {
    const closed = isOpen() ? '' : `\n\nСейчас мы закрыты, работаем ${RESTAURANT.hours}. Заказ можно оформить заранее, мы обработаем его с открытия.`;
    return {
      text: `<b>${greeting()}, это ${RESTAURANT.name}</b>\nАзиатская кухня и суши в Батуми\n\n${pick(HOME_LINES)}${closed}\n\n${cartBlock(cart)}`,
      kb: mainMenu(),
    };
  },
  menu: (cart) => {
    const kb = new InlineKeyboard();
    for (const cat of CATEGORIES) kb.text(cat.title, `cat:${cat.key}`).row();
    kb.text('🛒 Корзина', 'cart').text('⬅️ Назад', 'home');
    return { text: `<b>Меню</b>\n\nВыберите раздел:\n\n${cartBlock(cart)}`, kb };
  },
  category: (cart, key) => {
    const cat = findCategory(key);
    const kb = new InlineKeyboard();
    for (const item of cat.items) {
      const qty = cart.find((c) => c.id === item.id)?.qty;
      kb.text(`${qty ? `✓ ${qty} × ` : ''}${money(item.price)} · ${item.name}`, `add:${item.id}`).row();
    }
    if (cat.items.some((i) => hasPhoto(i.id))) kb.text('🖼 Показать фото блюд', `ph:${cat.key}`).row();
    kb.text('🛒 Корзина', 'cart').text('⬅️ Меню', 'menu');
    return {
      text: `<b>${cat.title}</b>\n\n<i>Нажмите на блюдо, чтобы добавить его в заказ. Повторное нажатие увеличивает количество.</i>\n\n${cartBlock(cart)}`,
      kb,
    };
  },
  cart: (cart) => {
    const kb = new InlineKeyboard();
    if (cart.length) {
      kb.text('✅ Оформить заказ', 'checkout').row();
      kb.text('➖ Убрать последнее блюдо', 'undo').row();
      kb.text('🗑 Очистить корзину', 'clear').row();
    }
    kb.text('📖 Меню', 'menu').text('⬅️ Назад', 'home');
    return { text: cart.length ? cartBlock(cart) : '🛒 Корзина пуста\n\nДобавьте блюда из меню.', kb };
  },
  info: (cart) => ({
    text:
      `<b>${RESTAURANT.name}</b>\nАзиатская кухня и суши\n\n` +
      `📍 <b>Адрес</b>\n${esc(RESTAURANT.address)}\n\n` +
      `🕘 <b>Часы работы</b>\n${RESTAURANT.hours[0].toUpperCase()}${RESTAURANT.hours.slice(1)}\n\n` +
      `📞 <b>Телефон</b>\n${RESTAURANT.phone}\n\n` +
      `🚗 <b>Доставка</b>\nПо Батуми бесплатная, обычно около часа\n\n${cartBlock(cart)}`,
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

// Показывает id чата: нужен, чтобы указать ADMIN_CHAT_ID (чат ресторана для заказов).
bot.command('id', async (ctx) => {
  await ctx.reply(`ID этого чата: <code>${ctx.chat.id}</code>`);
});

// ---------- фото блюд ----------

async function sendPhotos(ctx, cat) {
  const items = cat.items.filter((i) => hasPhoto(i.id));
  let ok = true;
  for (let n = 0; n < items.length; n += 10) {
    const chunk = items.slice(n, n + 10);
    const caption = (i) => `<b>${esc(i.name)}</b>\n${money(i.price)}`;
    try {
      if (chunk.length === 1) {
        await ctx.replyWithPhoto(photoUrl(chunk[0].id), { caption: caption(chunk[0]), parse_mode: 'HTML' });
      } else {
        await ctx.replyWithMediaGroup(
          chunk.map((i) => ({ type: 'photo', media: photoUrl(i.id), caption: caption(i), parse_mode: 'HTML' })),
        );
      }
    } catch (err) {
      ok = false;
      console.error('photo error:', err.description ?? err);
    }
  }
  return ok;
}

// ---------- кнопки ----------

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const text = ctx.callbackQuery.message?.text ?? '';

  if (data.startsWith('o:')) return handleOrderAction(ctx, data, text);

  const cart = parseCart(text);
  let toast;
  let screen = null;

  if (data === 'home') screen = screens.home(cart);
  else if (data === 'menu') screen = screens.menu(cart);
  else if (data === 'cart') screen = screens.cart(cart);
  else if (data === 'info') screen = screens.info(cart);
  else if (data.startsWith('cat:')) {
    if (findCategory(data.slice(4))) screen = screens.category(cart, data.slice(4));
  } else if (data.startsWith('ph:')) {
    const cat = findCategory(data.slice(3));
    if (cat) {
      await ctx.answerCallbackQuery({ text: 'Отправляю фото…' }).catch(() => {});
      const ok = await sendPhotos(ctx, cat);
      const s = screens.category(cart, cat.key);
      await ctx.reply(ok ? `Это все фото раздела. Выбирайте блюда ниже.\n\n${s.text}` : s.text, { reply_markup: s.kb });
      if (!ok) await ctx.reply('Часть фото сейчас не загрузилась. Блюда можно заказывать и без фото.');
      return;
    }
  } else if (data.startsWith('add:')) {
    const item = findItem(data.slice(4));
    if (item) {
      addToCart(cart, item.id);
      screen = screens.category(cart, findCategoryOfItem(item.id).key);
      toast = pick(ADD_TOASTS(item.name));
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
  } else if (data === 'phone:edit') {
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
    if (!cart.length) toast = 'Корзина пуста';
    else {
      await ctx.reply(`${PHONE_PROMPT}\n\n${cartBlock(cart)}`, {
        reply_markup: { force_reply: true, input_field_placeholder: '+995 ...' },
      });
    }
  } else if (data === 'method:delivery' || data === 'method:pickup') {
    const phone = field(text, 'Телефон');
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
    if (!cart.length) toast = 'Корзина пуста';
    else if (data === 'method:delivery') {
      await ctx.reply(`${ADDRESS_PROMPT}\n\nТелефон: ${esc(phone)}\n\n${cartBlock(cart)}`, {
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
  const replied = ctx.message.reply_to_message;
  const base = replied?.text ?? '';
  const input = ctx.message.text.trim();

  if (base.includes(PHONE_PROMPT)) {
    const cart = parseCart(base);
    const digits = input.replace(/\D/g, '').length;
    if (digits < 9 || digits > 15) {
      await ctx.reply(`Не получилось распознать номер. Проверьте его и отправьте ещё раз.\n\n${PHONE_PROMPT}\n\n${cartBlock(cart)}`, {
        reply_markup: { force_reply: true, input_field_placeholder: '+995 ...' },
      });
      return;
    }
    await ctx.reply(
      `<b>Как получить заказ?</b>\n\nТелефон: ${esc(input.slice(0, 40))}\n\n${cartBlock(cart)}\n\n` +
        `<i>Доставка по Батуми бесплатная.\nСамовывоз: ${esc(RESTAURANT.address)}</i>`,
      {
        reply_markup: new InlineKeyboard()
          .text('🚗 Доставка', 'method:delivery').text('🏃 Самовывоз', 'method:pickup').row()
          .text('✏️ Изменить номер', 'phone:edit'),
      },
    );
  } else if (base.includes(ADDRESS_PROMPT)) {
    const ok = await finishOrder(ctx, {
      cart: parseCart(base),
      phone: field(base, 'Телефон'),
      method: 'delivery',
      address: input.slice(0, 300),
    });
    // Закрываем вопрос, чтобы повторный ответ на него не создал второй заказ.
    if (ok) {
      await ctx.api
        .editMessageText(ctx.chat.id, replied.message_id, 'Адрес получен, заказ оформлен.', {
          reply_markup: { inline_keyboard: [] },
        })
        .catch(() => {});
    }
  } else if (input.replace(/\D/g, '').length >= 5) {
    await ctx.reply(
      'Чтобы отправить номер, ответьте на сообщение бота с просьбой написать телефон: нажмите на него и выберите «Ответить». ' +
        'Если сообщения уже нет, нажмите /start и соберите заказ заново.',
    );
  } else {
    await ctx.reply(pick(NOT_UNDERSTOOD));
  }
});

// ---------- оформление заказа ----------

function orderKeyboard(stage, uid, method) {
  const kb = new InlineKeyboard();
  if (stage === 'new') kb.text('✅ Принять', `o:ok:${uid}`).text('✖️ Отклонить', `o:cx:${uid}`);
  else if (stage === 'accepted') {
    kb.text(method === 'delivery' ? '🚗 Передан курьеру' : '🛍 Готов к выдаче', `o:rd:${uid}`).row();
    kb.text('✖️ Отменить', `o:cx:${uid}`);
  } else if (stage === 'ready') kb.text('🏁 Завершить', `o:dn:${uid}`);
  return kb;
}

async function finishOrder(ctx, { cart, phone, method, address }) {
  if (!cart.length) {
    await ctx.reply('Корзина пуста. Нажмите /start и соберите заказ заново.');
    return false;
  }
  const num = orderNumber();
  const methodText = method === 'delivery' ? 'доставка' : 'самовывоз';
  const card = [
    `<b>Заказ ${num}</b>`,
    '',
    `Клиент: ${userLink(ctx.from)}`,
    `Телефон: ${esc(phone)}`,
    `Получение: ${methodText}`,
    `Адрес: ${esc(address)}`,
    `Время заказа: ${timeNow()}`,
    '',
    cartBlock(cart),
    '',
    'Статус: 🆕 Новый',
  ].join('\n');

  // Заказ уходит в чат ресторана, если указан ADMIN_CHAT_ID. Иначе клиенту (режим демо).
  const target = process.env.ADMIN_CHAT_ID || ctx.from.id;
  try {
    await ctx.api.sendMessage(target, card, { reply_markup: orderKeyboard('new', ctx.from.id, method) });
  } catch (err) {
    console.error('order delivery failed:', err);
    await ctx.reply(`Не удалось передать заказ ресторану. Пожалуйста, позвоните нам: ${RESTAURANT.phone}.`);
    return false;
  }

  const closedNote = isOpen() ? '' : `\n\nСейчас ресторан закрыт, заказ обработают с ${RESTAURANT.openHour}:00.`;
  await ctx.reply(
    `✅ <b>Заказ ${num} принят</b>\n\n${pick(THANKS)}\n\n` +
      `Сумма: <b>${money(total(cart))}</b>\nПолучение: ${methodText}\n\n` +
      `Если понадобится что-то уточнить, мы позвоним на ${esc(phone)}.${closedNote}`,
    { reply_markup: mainMenu() },
  );
  return true;
}

// ---------- панель ресторана: статусы заказа ----------

async function handleOrderAction(ctx, data, text) {
  const adminChat = process.env.ADMIN_CHAT_ID;
  if (adminChat && String(ctx.callbackQuery.message?.chat.id) !== String(adminChat)) {
    await ctx.answerCallbackQuery({ text: 'Нет доступа' }).catch(() => {});
    return;
  }
  const [, code, uidRaw] = data.split(':');
  const uid = Number(uidRaw);
  const num = text.match(/Заказ (#\w+)/)?.[1];
  if (!uid || !num) {
    await ctx.answerCallbackQuery({ text: 'Не удалось прочитать заказ' }).catch(() => {});
    return;
  }
  const method = field(text, 'Получение') === 'доставка' ? 'delivery' : 'pickup';

  const steps = {
    ok: {
      label: '👨‍🍳 Принят в работу',
      stage: 'accepted',
      msg: `👨‍🍳 <b>Заказ ${num} принят в работу.</b>\n\n${pick([
        'Готовим и сообщим, когда он будет готов.',
        'Ресторан уже занимается вашим заказом.',
      ])}`,
    },
    rd: {
      label: method === 'delivery' ? '🚗 Передан курьеру' : '🛍 Готов к выдаче',
      stage: 'ready',
      msg:
        method === 'delivery'
          ? `🚗 <b>Заказ ${num} передан курьеру.</b>\n\nЕсли курьер не выйдет на связь, позвоните нам: ${RESTAURANT.phone}.`
          : `🛍 <b>Заказ ${num} готов к выдаче.</b>\n\nЖдём вас: ${esc(RESTAURANT.address)}.`,
    },
    dn: {
      label: '🏁 Завершён',
      stage: 'done',
      msg: `🏁 <b>Заказ ${num} выполнен.</b>\n\n${pick([
        'Приятного аппетита! Будем рады видеть вас снова.',
        'Спасибо, что выбрали SAMA. Приятного аппетита!',
      ])}`,
    },
    cx: {
      label: '✖️ Отменён',
      stage: 'done',
      msg: `✖️ <b>Заказ ${num} отменён.</b>\n\nПодробности можно уточнить по телефону ${RESTAURANT.phone}.`,
    },
  };
  const step = steps[code];
  if (!step) {
    await ctx.answerCallbackQuery().catch(() => {});
    return;
  }
  if (text.includes(`Статус: ${step.label}`)) {
    await ctx.answerCallbackQuery({ text: 'Этот статус уже стоит' }).catch(() => {});
    return;
  }

  // Статус стоит в последней строке карточки, поэтому форматирование остальных строк не сдвигается.
  const newText = text.replace(/^Статус: .*$/m, `Статус: ${step.label}`);
  await ctx
    .editMessageText(newText, {
      parse_mode: 'none',
      entities: ctx.callbackQuery.message.entities,
      reply_markup: step.stage === 'done' ? { inline_keyboard: [] } : orderKeyboard(step.stage, uid, method),
    })
    .catch((err) => console.error('edit order card failed:', err));

  let toast = 'Статус обновлён, клиент уведомлён';
  try {
    await ctx.api.sendMessage(uid, step.msg);
  } catch (err) {
    console.error('notify customer failed:', err);
    toast = 'Статус обновлён, но клиент не получил сообщение';
  }
  await ctx.answerCallbackQuery({ text: toast }).catch(() => {});
}

bot.catch((err) => console.error('bot error:', err.error ?? err));
