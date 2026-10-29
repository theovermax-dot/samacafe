// Фото блюд взяты с https://sama.ge/ru. Файлы отдаёт их CDN через сервис изменения размера:
// адрес = https://cdn.starterapp.ru/w:<ширина>/<base64 исходной ссылки>.
// Telegram сам скачивает фото по ссылке, на нашем сервере они не хранятся.
const ORIGIN = 'https://content.cdn.starterapp.ru/images/sama/';

const FILES = {
  r01: 'adac004d69312557409471b6cb19918448c7bc4a-427x427.jpg',
  r02: 'b1088bb20c25e2dcf2a9530a4d27cd524de3ff9b-640x640.jpg',
  r03: 'e85ff5bfb4e2b8250b8396bf83025ef24de1da85-427x427.jpg',
  r04: '3734a410a0fd7a046a6535fb00193205133d3150-640x640.jpg',
  r05: '31802a75523da2057708622a7a26f1d4cafd3e30-4672x4672.jpg',
  r06: '9c62eee702dab08fa2eb1302122dfd092ee86b28-1500x1500.jpg',
  r07: '9ca1ed0e32517474c2db4e85ab9baaf138e3e201-427x427.jpg',
  r08: '17389d02fc64c0a41f4dbeec1889970f3525604a-427x427.jpg',
  r09: 'aa50f90bbcf8412d403fff487ced82f81f7b2512-640x640.jpg',
  r10: '2aa33671be24c73b503df95ca363be6925777e5c-427x427.jpg',
  r11: 'b484521da891312252031d32da2e7295227caaac-427x427.jpg',
  r12: 'c61f6ea76985adf9dc3b3ab479b5ed1e24be3e7a-640x640.jpg',
  r13: 'dccdbba52b2f6d7f0129fb6538bd9737bc63866a-427x427.jpg',
  r14: '253e8a009a17e006eef696500c8d1c8e5736f642-427x427.jpg',
  r15: '3edb45aa69f33ea699a4bd6d137e97c4f7c91f11-1500x1500.jpg',
  r16: '4ecb2ac0c639b1ea014b4aaacd2e1d83d54faad0-640x640.jpg',
  s01: '5d4576a32852ec72dfa8c5fd394e0e1b02e8c4dc-3504x2336.jpg',
  s02: 'f89dfbc91483c81ceecac56b780b9563d8ca7e9d-3504x2336.jpg',
  s03: 'e3427f3c9e56750f21715f791962996ca8f0c108-3504x2336.jpg',
  n01: 'ef5627e14461455960862ec957b5a161aedafe97-426x426.jpg',
  n02: 'ee4ca31e94900a79c3d62c59193d324aef797fa7-427x427.jpg',
  n03: 'd9158c7e79dca3bc30547ab285a480d967e29be2-3000x2000.jpg',
  a01: '8b8819732e81933ab775cf296cf0791904be77e4-1500x1500.jpg',
  a02: '8123ea35eee316ae7f51f922394b12323f0a204d-1500x1500.jpg',
  a03: '894229035f460ebdfacd6bceddaee8c51ff85eb3-1500x1500.jpg',
  a04: '0d6e25a68e1ca69fd97b6d722aa3fff2aedabb5c-1500x1500.jpg',
  a05: '6661627f7106fc570c9778c40d0331a83a4b2396-1500x1500.jpg',
  a06: '5588e6cdc4f336639a57eb6fa3210a6763d07a0b-1500x1500.jpg',
  a07: '942dc80613ab420f73267db3bb9cf0691e703fac-1500x1500.jpg',
  a08: '3d7e6104afc8365e3036fe2b4ce88cec829a3a4d-3877x3877.jpg',
  a09: '3dd4009ec3312dcd50c1d681bc5b6ab3a801428e-1500x1500.jpg',
  a10: 'bddac2e933c7a39b8f713f9d729de96e5c11027c-427x427.jpg',
  a11: '47c5bce5de023ad4bdbeaed6739387fe345f95e5-1500x1500.jpg',
  a12: '7a3b9ed30670d47b0af6525424db723cccfb5907-1500x1500.jpg',
  a13: '0fcc9a4a87210af0e6cb11d634d0eeeb703798de-1500x1500.jpg',
  a14: '5fc621f6727d0f48815e71a0960e86c46dd1d4a2-1500x1500.jpg',
  a15: 'f864cfd0c381ac1626a7c977098a7f1cc462aea9-1500x1500.jpg',
  d01: '08ac683a45a7d95155119ddb7421dad061b4d22d-640x640.jpg',
  d02: 'd745011b8bf9775a18a433c76e0c61fed3a4891f-805x805.jpg',
  d03: 'f69b1e9ddd032b0537d30a002a00bfb7ac30de19-823x823.jpg',
  d05: '5951415a1bdc65f0ff7200e7fcba5b8662c05cba-1232x1232.jpg',
  d06: '5809dc2e1b5471acd2355c75c4b1b07ba22f91ca-1170x1170.jpg',
  d07: 'b78e9e6e7c187f9c142786395d1c1c4b86d60b8e-656x1138.jpg',
  d08: '78c6505239ee54a9dc1b697e09420c95942a7b78-758x759.jpg',
  d09: '3b877b2bc2faa49a9f33860c67a1b4116418301e-2000x2000.jpg',
  d10: 'ddbff4048adfa03ec6b95ef3f53023e51b0b0ea2-1024x1536.png',
  d11: '04a73333a7e9ac599a737e8a8377f1b4d7a8ce09-1024x1536.png',
};

export const hasPhoto = (id) => id in FILES;

export function photoUrl(id) {
  const file = FILES[id];
  return file ? `https://cdn.starterapp.ru/w:800/${Buffer.from(ORIGIN + file).toString('base64')}` : null;
}
