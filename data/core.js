window.KCD = window.KCD || {};
KCD.articles = KCD.articles || [];
KCD.sections = [
  { id: 'era', t: 'Эпоха', img: 'wenc_portrait_7', d: 'Политика 1400-х: два брата-короля, раскол церкви, серебро и предгуситское брожение.',
    long: 'Почему в 1403 году Богемия оказалась без короля, кто такие Люксембурги, откуда в чешских деревнях венгерские наёмники и почему через двенадцать лет страна взорвётся гуситской революцией.' },
  { id: 'places', t: 'Места', img: 'trosky_0', d: 'Троски, скальные города Богемского рая, Куттенберг с его рудниками, монетным двором и монастырём.',
    long: 'Реальные места, по которым ходит Индржих: замок Троски и деревни у его подножия, песчаниковые скалы, серебряный Куттенберг. Где это находится сегодня и как выглядело в 1403 году.' },
  { id: 'people', t: 'Люди', img: 'sigis_0', d: 'Короли, паны, проповедники и наёмники — реальные и придуманные.',
    long: 'Исторические личности, вымышленные герои и персонажи с реальными прототипами. У каждого есть отметка, а судьба реальных людей после 1403 года вынесена в отдельный блок.' },
  { id: 'life', t: 'Жизнь', img: 'tres_riches_1', d: 'Сословия, деньги, еда, бани, медицина, алхимия, ремёсла и игры.',
    long: 'Повседневность Богемии около 1400 года: как жили крестьяне и горожане, чем платили и что ели, как лечили, судили и развлекались.' },
  { id: 'war', t: 'Война', img: 'talhoffer_0', d: 'Доспехи, мечи, арбалеты, первый порох, фехтовальные книги и осады.',
    long: 'Всё, что звенит, режет и стреляет: снаряжение рубежа XIV–XV веков, фехтовальные школы, осадная техника и рыцарская культура.' }
];
KCD.home = {
  hero: 'g_riders',
  locations: ['trosky-castle', 'rock-cities', 'kuttenberg', 'sedlec'],
  people: ['wenceslas', 'sigismund', 'henry', 'hans-capon', 'otto-bergow', 'zizka', 'hus', 'jobst'],
  years: [{ y: 1378, t: 'Умирает Карл IV, королём становится Вацлав IV', i: 6 }, { y: 1394, t: 'Панская уния берёт короля в плен', i: 13 }, { y: 1400, t: 'Курфюрсты низлагают Вацлава как римского короля', i: 17 }, { y: 1402, t: 'Сигизмунд арестовывает брата в Пражском граде', i: 19 }],
  gallery: ['kh_mining_0', 'wenc_bath_0', 'trosky2_1', 'talhoffer_4', 'g_town', 'bellifortis_4', 'chronicon_4', 'hunt_6'],
  quote: { q: 'Ищи правду, слушай правду, учись правде, люби правду, говори правду, держись правды, защищай правду до смерти.', c: 'Ян Гус, «Výklad víry» (Толкование веры), 1412' }
};
KCD.lit = [
  ['Čornej P., Bělina P. (red.) Velké dějiny zemí Koruny české. Sv. V: 1402–1437. Praha: Paseka, 2000', '', 'академическая история периода'],
  ['Spěváček J. Václav IV. (1361–1419): K předpokladům husitské revoluce. Praha: Svoboda, 1986', '', 'биография Вацлава IV'],
  ['Hoensch J. K. Kaiser Sigismund: Herrscher an der Schwelle zur Neuzeit 1368–1437. München: Beck, 1996', '', 'биография Сигизмунда'],
  ['Šmahel F. Husitská revoluce. Praha: Karolinum, 1993–1996', '', 'фундаментальный труд о гуситстве'],
  ['Kejř J. Jan Hus známý i neznámý. Praha: Karolinum, 2000', '', ''],
  ['Šmahel F. Jan Žižka z Trocnova. Praha', '', ''],
  ['Pečenka M. и др. Kutná Hora. Praha: NLN, 2000', '', 'история города'],
  ['Wenceslaus IV of Bohemia — Wikipedia', 'https://en.wikipedia.org/wiki/Wenceslaus_IV_of_Bohemia', ''],
  ['League of Lords — Wikipedia', 'https://en.wikipedia.org/wiki/League_of_Lords', ''],
  ['Conquest of Kutná Hora (1402–1403) — Wikipedia', 'https://en.wikipedia.org/wiki/Conquest_of_Kutn%C3%A1_Hora', ''],
  ['Siege of Suchdol (1402–1403) — Wikipedia', 'https://en.wikipedia.org/wiki/Siege_of_Suchdol', ''],
  ['The Second Captivity of Wenceslas IV (1402–1403) — e-stredovek.cz', 'https://www.e-stredovek.cz/en/post/second-captivity-wenceslaus-iv', 'популярный чешский медиевистический ресурс'],
  ['Trosky Castle — Wikipedia', 'https://en.wikipedia.org/wiki/Trosky_Castle', ''],
  ['Otto III of Bergau — Wikipedia', 'https://en.wikipedia.org/wiki/Otto_III_of_Bergau', ''],
  ['Hynce Ptáček of Pirkštejn — Wikipedia', 'https://en.wikipedia.org/wiki/Hynce_Pt%C3%A1%C4%8Dek_of_Pirk%C5%A1tejn', ''],
  ['Konrad Kyeser — Wikipedia', 'https://en.wikipedia.org/wiki/Konrad_Kyeser', ''],
  ['Kutná Hora: Historical Town Centre with the Church of St Barbara and the Cathedral of Our Lady at Sedlec — UNESCO', 'https://whc.unesco.org/en/list/732/', ''],
  ['Hrad Trosky — официальный сайт замка', 'https://www.hrad-trosky.eu/', ''],
  ['České muzeum stříbra (Кутна-Гора)', 'https://www.cms-kh.cz/', ''],
  ['Kingdom Come: Deliverance Wiki (wiki.gg) — кодекс игры', 'https://kingdomcomedeliverance.wiki.gg/', 'игровые названия и внутриигровой кодекс'],
  ['Historical figures in Kingdom Come: Deliverance 2 — Seven Swords', 'https://sevenswords.uk/historical-figures-in-kingdom-come-deliverance-2/', ''],
  ['Wiktenauer — библиотека средневековых фехтовальных трактатов', 'https://wiktenauer.com/', ''],
  ['Wikimedia Commons', 'https://commons.wikimedia.org/', 'источник исторических иллюстраций'],
  ['Steam: Kingdom Come: Deliverance II', 'https://store.steampowered.com/app/1771300/', 'кадры игры']
];
