// Меню взято с https://sama.ge/ru (цены в ₾). Обновлять вручную при изменении меню.
export const CATEGORIES = [
  {
    key: 'rolls',
    title: '🍣 Роллы',
    items: [
      { id: 'r01', name: 'Калифорния с лососем', price: 39, weight: '350 г' },
      { id: 'r02', name: 'Хрустящий ролл с лососем (жареный)', price: 50, weight: '425 г' },
      { id: 'r03', name: 'Ролл огурец', price: 39, weight: '412 г' },
      { id: 'r04', name: 'Ролл дракон', price: 39, weight: '406 г' },
      { id: 'r05', name: 'GoGo ролл', price: 50, weight: '400 г' },
      { id: 'r06', name: 'Kitsune Roll', price: 50 },
      { id: 'r07', name: 'Кюри Ролл', price: 39, weight: '285 г' },
      { id: 'r08', name: 'Ролл с манго и авокадо', price: 50, weight: '430 г' },
      { id: 'r09', name: 'Ролл с креветками и манго', price: 50, weight: '385 г' },
      { id: 'r10', name: 'Филадельфия', price: 50, weight: '406 г' },
      { id: 'r11', name: 'Sama ролл', price: 50, weight: '350 г' },
      { id: 'r12', name: 'Ролл с копченым лососем', price: 50, weight: '420 г' },
      { id: 'r13', name: 'Острый ролл с лососем', price: 50, weight: '434 г' },
      { id: 'r14', name: 'Ролл с острым тунцом', price: 50, weight: '437 г' },
      { id: 'r15', name: 'Тораме ролл', price: 50 },
      { id: 'r16', name: 'Вегетарианский ролл', price: 31, weight: '350 г' },
    ],
  },
  {
    key: 'sashimi',
    title: '🐟 Сашими и нигири',
    items: [
      { id: 's01', name: 'Сашими из угря', price: 52, weight: '250 г' },
      { id: 's02', name: 'Сашими из лосося', price: 44, weight: '250 г' },
      { id: 's03', name: 'Сашими из тунца', price: 40, weight: '250 г' },
      { id: 'n01', name: 'Нигири с угрём', price: 26, weight: '100 г' },
      { id: 'n02', name: 'Нигири с лососем', price: 26, weight: '100 г' },
      { id: 'n03', name: 'Нигири с тунцом', price: 26, weight: '100 г' },
    ],
  },
  {
    key: 'asia',
    title: '🥢 Азия',
    items: [
      { id: 'a01', name: 'Говяжий стейк с соусом якитори', price: 75 },
      { id: 'a02', name: 'Дорадо с имбирём', price: 60 },
      { id: 'a03', name: 'Кунг пао с курицей', price: 40 },
      { id: 'a04', name: 'Лапша с курицей и креветками', price: 35 },
      { id: 'a05', name: 'Лапша с курицей', price: 26 },
      { id: 'a06', name: 'Рис с курицей', price: 23 },
      { id: 'a07', name: 'Спринг ролл с курицей', price: 25 },
      { id: 'a08', name: 'Эдамаме с морской солью', price: 21 },
      { id: 'a09', name: 'Кимчи', price: 18 },
      { id: 'a10', name: 'Креветки темпура (110 г)', price: 31 },
      { id: 'a11', name: 'Татаки из тунца', price: 42 },
      { id: 'a12', name: 'Спринг роллы с овощами', price: 22 },
      { id: 'a13', name: 'Рамен с курицей', price: 35 },
      { id: 'a14', name: 'Мисо-суп', price: 27 },
      { id: 'a15', name: 'Красное карри', price: 40 },
    ],
  },
  {
    key: 'drinks',
    title: '🍸 Напитки',
    items: [
      { id: 'd01', name: 'Americano', price: 7, weight: '200 мл' },
      { id: 'd02', name: 'Cappuccino', price: 9, weight: '250 мл' },
      { id: 'd03', name: 'Latte', price: 12, weight: '400 мл' },
      { id: 'd04', name: 'Flat white', price: 15, weight: '250 мл' },
      { id: 'd05', name: 'Matcha latte', price: 17, weight: '350 мл' },
      { id: 'd06', name: 'Aperol Spritz', price: 25, weight: '400 мл' },
      { id: 'd07', name: 'Gin Tonic', price: 25, weight: '200 мл' },
      { id: 'd08', name: 'Espresso Martini', price: 19, weight: '150 мл' },
      { id: 'd09', name: 'Signature-Sama', price: 40, weight: '140 мл' },
      { id: 'd10', name: 'Corona', price: 15, weight: '330 мл' },
      { id: 'd11', name: 'Sapporo', price: 20, weight: '330 мл' },
      { id: 'd12', name: 'Вода', price: 4, weight: '500 мл' },
      { id: 'd13', name: 'Апельсиновый сок', price: 15, weight: '200 мл' },
    ],
  },
];

export function findItem(id) {
  for (const cat of CATEGORIES) {
    const item = cat.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}

export function findByName(name) {
  for (const cat of CATEGORIES) {
    const item = cat.items.find((i) => i.name === name);
    if (item) return item;
  }
  return null;
}

export function findCategoryOfItem(id) {
  return CATEGORIES.find((c) => c.items.some((i) => i.id === id)) ?? null;
}

export function findCategory(key) {
  return CATEGORIES.find((c) => c.key === key) ?? null;
}
