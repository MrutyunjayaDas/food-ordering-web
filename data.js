/* ============ PHOTOS ============
   Every dish looks up its OWN real photo by name on Wikimedia Commons (free, real-life food photos),
   skipping any picture another dish already uses. Results are cached in the browser so repeat visits are instant.
   If Commons has nothing, it tries a keyword photo from loremflickr, and finally shows the dish emoji. */
const imgURL = (kw, lock, w = 480, h = 360) => `https://loremflickr.com/${w}/${h}/${kw}?lock=${lock}`;
const TERM = {};                       // photo keyword -> human search phrase (filled below)
const TERM_OVERRIDE = { food: 'Indian cuisine dishes', wrap: 'Kati roll', cake: 'Chocolate cake', thali: 'Thali', seafood: 'Seafood dish', breakfast: 'Breakfast plate', bakery: 'Bakery pastries', korean: 'Korean cuisine dish', coffee: 'Cup of coffee', curry: 'Indian curry', icecream: 'Ice cream' };

const IMG_KEY = 'md-img-v1';
let imgCache = {};
try { imgCache = JSON.parse(localStorage.getItem(IMG_KEY) || '{}'); } catch (e) {}
const usedImgs = new Set(Object.values(imgCache));
const saveImgCache = () => { try { localStorage.setItem(IMG_KEY, JSON.stringify(imgCache)); } catch (e) {} };
const BAD_TITLE = /map|flag|logo|diagram|chart|menu|sign|icon|poster|stamp|book|painting|drawing|cartoon|illustration|statue|building|people|woman|man |girl|boy/i;

function commonsLookup(term) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&iiurlwidth=520&format=json&origin=*&gsrsearch='
    + encodeURIComponent(term);
  return fetch(url).then(r => r.json()).then(j => {
    const pages = Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index);
    for (const p of pages) {
      const ii = p.imageinfo && p.imageinfo[0];
      if (!ii || ii.mime !== 'image/jpeg' || BAD_TITLE.test(p.title)) continue;
      const u = ii.thumburl || ii.url;
      if (u && !usedImgs.has(u)) return u;
    }
    return null;
  });
}

/* small queue so we never fire hundreds of requests at once */
const lookupQueue = []; let lookupActive = 0;
function pump() {
  while (lookupActive < 5 && lookupQueue.length) {
    const job = lookupQueue.shift(); lookupActive++;
    commonsLookup(job.term).catch(() => null).then(u => { lookupActive--; job.done(u); pump(); });
  }
}
function resolveImg(img) {
  const term = img.dataset.term, key = term + '#' + img.dataset.lock;
  const useFallback = () => { img.src = img.dataset.fb; };
  if (imgCache[key]) { img.src = imgCache[key]; return; }
  lookupQueue.push({ term, done: u => {
    if (u && !usedImgs.has(u)) { usedImgs.add(u); imgCache[key] = u; saveImgCache(); img.src = u; }
    else useFallback();
  } });
  pump();
}
window.imgErr = function (img) {
  if (img.dataset.fb && img.src !== img.dataset.fb && !img.dataset.tried) { img.dataset.tried = 1; img.src = img.dataset.fb; }
  else img.remove();
};
/* a photo layered over an emoji; the emoji shows until (or unless) the photo loads */
const thumb = (kw, emoji, cls = '', lock = 1, w = 480, h = 360) =>
  `<span class="thumb ${cls}"><span class="fb">${emoji}</span><img data-term="${(TERM[kw] || kw).replace(/"/g, '')}" data-lock="${lock}" data-fb="${imgURL(kw, lock, w, h)}" alt="" referrerpolicy="no-referrer" onload="this.classList.add('ok')" onerror="imgErr(this)"></span>`;

/* lazily resolve photos only when they are about to scroll into view */
(function () {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); resolveImg(e.target); } }), { rootMargin: '400px' });
  const scan = n => { if (n.nodeType !== 1) return; if (n.matches('img[data-term]')) io.observe(n); n.querySelectorAll('img[data-term]').forEach(i => io.observe(i)); };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(document.documentElement, { childList: true, subtree: true });
})();

/* ============ DATA ============ */
const MOODS = [
  { id: 'cozy',  label: 'Cozy',          emoji: '🧣', c: '#ff8a3d' },
  { id: 'spicy', label: 'Fire me up',    emoji: '🔥', c: '#ff3d3d' },
  { id: 'sweet', label: 'Sweet tooth',   emoji: '🍯', c: '#ff4fa3' },
  { id: 'light', label: 'Feeling light', emoji: '🌿', c: '#22b573' },
  { id: 'party', label: 'Party mode',    emoji: '🎉', c: '#7b4dff' },
];

const CATS = [
  { id: 'all',       label: 'All',           emoji: '🍽️', kw: 'food',      c: '#7b4dff' },
  { id: 'biryani',   label: 'Biryani',       emoji: '🍛', kw: 'biryani',   c: '#ff8a3d' },
  { id: 'pizza',     label: 'Pizza & Pasta', emoji: '🍕', kw: 'pizza',     c: '#ff4d4d' },
  { id: 'burger',    label: 'Burgers',       emoji: '🍔', kw: 'burger',    c: '#f5a700' },
  { id: 'south',     label: 'South Indian',  emoji: '🥞', kw: 'dosa',      c: '#22b573' },
  { id: 'chinese',   label: 'Asian',         emoji: '🍜', kw: 'noodles',   c: '#ff3d81' },
  { id: 'rolls',     label: 'Rolls',         emoji: '🌯', kw: 'wrap',      c: '#e8590c' },
  { id: 'street',    label: 'Street Food',   emoji: '🥘', kw: 'chaat',     c: '#e03131' },
  { id: 'thali',     label: 'Thali',         emoji: '🍱', kw: 'thali',     c: '#d9822b' },
  { id: 'seafood',   label: 'Seafood',       emoji: '🦐', kw: 'seafood',   c: '#1c7ed6' },
  { id: 'breakfast', label: 'Breakfast',     emoji: '🍳', kw: 'breakfast', c: '#fab005' },
  { id: 'beverage',  label: 'Coffee & Chai', emoji: '☕', kw: 'coffee',    c: '#9c6b3f' },
  { id: 'dessert',   label: 'Desserts',      emoji: '🍰', kw: 'dessert',   c: '#c04dff' },
  { id: 'healthy',   label: 'Healthy',       emoji: '🥗', kw: 'salad',     c: '#12b886' },
];

/* d(id, name, price, veg, spice 0-3, emoji, photo keyword(s), mood tags, description) */
const d = (id, name, price, veg, spice, emoji, kw, tags, desc) => ({ id, name, price, veg, spice, emoji, kw, tags, desc });

const RESTAURANTS = [
  { id: 1, name: 'Dum Pukht Darbar', cat: 'biryani', cuisine: 'Biryani, Mughlai, Kebabs', rating: 4.5, time: 35, cost: 350, pureVeg: false,
    offer: '20% OFF up to ₹100', emoji: '🍛', kw: 'biryani', c: '#ff8a3d', items: [
      d(101, 'Hyderabadi Chicken Biryani', 289, false, 3, '🍛', 'chickenbiryani', ['spicy','party'], 'Slow-cooked dum biryani with saffron rice.'),
      d(102, 'Paneer Tikka Biryani', 249, true, 2, '🍚', 'paneer', ['spicy'], 'Smoky paneer layered with basmati.'),
      d(103, 'Seekh Kebab Platter', 319, false, 2, '🍢', 'seekhkebab', ['party'], 'Six juicy minced-lamb kebabs, mint dip.'),
      d(104, 'Shahi Tukda', 129, true, 0, '🍮', 'bread,pudding', ['sweet','cozy'], 'Fried bread soaked in rabri.'),
      d(105, 'Mutton Dum Biryani', 349, false, 3, '🍖', 'muttoncurry', ['spicy','party'], 'Tender mutton, sealed and slow-steamed.'),
      d(106, 'Chicken Tangdi Kebab', 299, false, 2, '🍗', 'drumsticks', ['party','spicy'], 'Smoky drumsticks marinated overnight.'),
      d(107, 'Chicken 65', 229, false, 3, '🍗', 'friedchicken', ['spicy','party'], 'Crisp, curry-leaf spiked chicken bites.'),
      d(108, 'Phirni Kulhad', 99, true, 0, '🥛', 'ricepudding', ['sweet','cozy'], 'Chilled ground-rice pudding in clay.'),
    ] },
  { id: 2, name: 'Napoli Nights', cat: 'pizza', cuisine: 'Pizza, Pasta, Italian', rating: 4.4, time: 30, cost: 450, pureVeg: false,
    offer: 'Buy 1 Get 1', emoji: '🍕', kw: 'pizza', c: '#ff4d4d', items: [
      d(201, 'Margherita Classica', 299, true, 0, '🍕', 'margheritapizza', ['cozy','light'], 'San Marzano sauce, fior di latte, basil.'),
      d(202, 'Peri-Peri Chicken Pizza', 429, false, 3, '🌶️', 'chickenpizza', ['spicy','party'], 'Fiery peri-peri chicken, jalapeños.'),
      d(203, 'Baked Mac & Cheese', 259, true, 0, '🧀', 'macaroni', ['cozy'], 'Three-cheese bubbling comfort.'),
      d(204, 'Garlic Bread Sticks', 139, true, 0, '🥖', 'garlicbread', ['party','cozy'], 'Butter, garlic, herbs.'),
      d(205, 'Penne Arrabbiata', 279, true, 2, '🍝', 'penne', ['spicy','cozy'], 'Garlicky tomato sauce with red chilli.'),
      d(206, 'Tiramisu Cup', 169, true, 0, '🍮', 'tiramisu', ['sweet'], 'Mascarpone, espresso, cocoa.'),
      d(207, 'Farmhouse Pizza', 379, true, 1, '🍕', 'vegetablepizza', ['party','light'], 'Capsicum, mushroom, olives, corn.'),
      d(208, 'Pepperoni Pizza', 449, false, 2, '🍕', 'pepperoni', ['party','spicy'], 'Crisp-edged pepperoni, mozzarella.'),
    ] },
  { id: 3, name: 'Smash Shack', cat: 'burger', cuisine: 'Burgers, Fries, Shakes', rating: 4.2, time: 25, cost: 300, pureVeg: false,
    offer: 'Free fries over ₹399', emoji: '🍔', kw: 'burger', c: '#f5a700', items: [
      d(301, 'Double Smash Burger', 249, false, 1, '🍔', 'cheeseburger', ['party','cozy'], 'Two smashed patties, American cheese.'),
      d(302, 'Crispy Veg Burger', 169, true, 1, '🍔', 'vegburger', ['light'], 'Crunchy patty, lettuce, chipotle mayo.'),
      d(303, 'Loaded Masala Fries', 149, true, 2, '🍟', 'loadedfries', ['spicy','party'], 'Chaat masala, cheese, jalapeños.'),
      d(304, 'Oreo Thick Shake', 179, true, 0, '🥤', 'milkshake', ['sweet'], 'Thick enough to hold a spoon.'),
      d(305, 'Chicken Zinger Burger', 219, false, 2, '🍗', 'chickenburger', ['spicy','party'], 'Crispy fried chicken, spicy slaw.'),
      d(306, 'Onion Rings', 119, true, 0, '🧅', 'onionrings', ['party'], 'Beer-batter crunch, garlic dip.'),
      d(307, 'Paneer Crunch Burger', 189, true, 2, '🍔', 'sliders', ['spicy'], 'Panko paneer slab, tandoori mayo.'),
      d(308, 'Nachos Supreme', 199, true, 1, '🌮', 'nachos', ['party'], 'Corn chips, salsa, queso, beans.'),
    ] },
  { id: 4, name: 'Idli & Co.', cat: 'south', cuisine: 'South Indian, Breakfast', rating: 4.6, time: 22, cost: 180, pureVeg: true,
    offer: 'Flat ₹50 OFF', emoji: '🥞', kw: 'dosa', c: '#22b573', items: [
      d(401, 'Ghee Podi Idli', 99, true, 2, '⚪', 'idli', ['cozy','spicy','light'], 'Mini idlis tossed in gunpowder & ghee.'),
      d(402, 'Masala Dosa', 119, true, 1, '🥞', 'masaladosa', ['cozy'], 'Crisp dosa, potato masala, coconut chutney.'),
      d(403, 'Medu Vada (2 pcs)', 79, true, 1, '🍩', 'vada', ['cozy','light'], 'Crunchy outside, fluffy inside.'),
      d(404, 'Filter Coffee', 59, true, 0, '☕', 'filtercoffee', ['cozy'], 'Strong decoction, frothy milk.'),
      d(405, 'Rava Dosa', 129, true, 1, '🥞', 'crepe', ['light'], 'Lacy, crisp semolina dosa.'),
      d(406, 'Ven Pongal', 109, true, 0, '🍚', 'pongal', ['cozy'], 'Peppery rice-lentil comfort with ghee.'),
      d(407, 'Onion Uttapam', 119, true, 1, '🫓', 'uttapam', ['cozy'], 'Thick, soft, onion-topped pancake.'),
      d(408, 'Mysore Pak', 89, true, 0, '🟨', 'indiansweet', ['sweet'], 'Melt-in-mouth gram-flour fudge.'),
    ] },
  { id: 5, name: 'Wok This Way', cat: 'chinese', cuisine: 'Chinese, Thai, Noodles', rating: 4.1, time: 32, cost: 320, pureVeg: false,
    offer: '15% OFF', emoji: '🍜', kw: 'noodles', c: '#ff3d81', items: [
      d(501, 'Schezwan Hakka Noodles', 199, true, 3, '🍜', 'hakkanoodles', ['spicy'], 'Wok-tossed with a punchy schezwan sauce.'),
      d(502, 'Chilli Chicken Dry', 259, false, 3, '🍗', 'chillichicken', ['spicy','party'], 'Crispy chicken, capsicum, soy glaze.'),
      d(503, 'Veg Manchow Soup', 129, true, 1, '🍲', 'soup', ['cozy','light'], 'Hot, tangy, with crispy noodles.'),
      d(504, 'Veg Momos (8 pcs)', 139, true, 1, '🥟', 'dumplings', ['party','light'], 'Steamed dumplings, fiery red chutney.'),
      d(505, 'Hot Garlic Fried Rice', 189, true, 2, '🍚', 'friedrice', ['spicy'], 'Smoky wok rice, burnt garlic.'),
      d(506, 'Honey Chilli Potato', 169, true, 2, '🥔', 'crispypotato', ['sweet','party','spicy'], 'Crispy potato in sticky honey-chilli glaze.'),
      d(507, 'Veg Spring Rolls', 149, true, 0, '🥢', 'springrolls', ['party','light'], 'Golden rolls, sweet chilli dip.'),
      d(508, 'Chicken Manchurian', 249, false, 2, '🍗', 'manchurian', ['spicy','cozy'], 'Dark, garlicky gravy, tender chicken.'),
    ] },
  { id: 6, name: 'The Sugar Lab', cat: 'dessert', cuisine: 'Desserts, Bakery, Ice Cream', rating: 4.7, time: 28, cost: 250, pureVeg: true,
    offer: 'Free brownie over ₹499', emoji: '🍰', kw: 'cake', c: '#c04dff', items: [
      d(601, 'Molten Lava Cake', 159, true, 0, '🍫', 'lavacake', ['sweet','cozy'], 'Warm chocolate centre that flows.'),
      d(602, 'Gulab Jamun Cheesecake', 189, true, 0, '🍰', 'cheesecake', ['sweet','party'], 'Desi twist on a classic.'),
      d(603, 'Rasmalai Tiramisu', 199, true, 0, '🍨', 'trifle', ['sweet'], 'Creamy, cardamom-kissed, no coffee.'),
      d(604, 'Mango Sorbet', 99, true, 0, '🍧', 'sorbet', ['sweet','light'], 'Alphonso, nothing else.'),
      d(605, 'Belgian Waffle', 179, true, 0, '🧇', 'waffle', ['sweet','cozy'], 'Crisp waffle, chocolate sauce, berries.'),
      d(606, 'Red Velvet Jar', 149, true, 0, '🍰', 'redvelvet', ['sweet'], 'Layered cake, cream cheese frosting.'),
      d(607, 'Chocolate Truffle Pastry', 129, true, 0, '🎂', 'pastry', ['sweet','cozy'], 'Rich ganache, soft sponge.'),
      d(608, 'Blueberry Cheesecake', 189, true, 0, '🫐', 'blueberry', ['sweet'], 'Baked, creamy, berry compote.'),
    ] },
  { id: 7, name: 'Green Bowl Co.', cat: 'healthy', cuisine: 'Salads, Bowls, Smoothies', rating: 4.3, time: 20, cost: 280, pureVeg: false,
    offer: '10% OFF', emoji: '🥗', kw: 'salad', c: '#12b886', items: [
      d(701, 'Quinoa Power Bowl', 269, true, 0, '🥗', 'quinoa', ['light'], 'Quinoa, chickpeas, avocado, tahini.'),
      d(702, 'Grilled Chicken Salad', 289, false, 1, '🥙', 'chickensalad', ['light'], 'Greens, grilled chicken, lemon vinaigrette.'),
      d(703, 'Green Detox Smoothie', 149, true, 0, '🥬', 'greensmoothie', ['light'], 'Spinach, apple, ginger, mint.'),
      d(704, 'Peanut Butter Oats Jar', 139, true, 0, '🥜', 'overnightoats', ['sweet','light'], 'Overnight oats, banana, honey.'),
      d(705, 'Falafel Wrap', 189, true, 1, '🌯', 'falafel', ['light'], 'Crisp falafel, hummus, pickled onion.'),
      d(706, 'Berry Blast Smoothie', 159, true, 0, '🫐', 'berrysmoothie', ['sweet','light'], 'Mixed berries, yoghurt, honey.'),
      d(707, 'Paneer Tikka Salad', 239, true, 1, '🥗', 'grilledpaneer', ['light'], 'Charred paneer on crunchy greens.'),
      d(708, 'Hummus Platter', 199, true, 0, '🫓', 'hummus', ['light','party'], 'Hummus, pita, olives, crudités.'),
    ] },
  { id: 8, name: 'Tandoor Tales', cat: 'biryani', cuisine: 'North Indian, Tandoor, Curries', rating: 4.0, time: 38, cost: 380, pureVeg: false,
    offer: 'Free dessert', emoji: '🍗', kw: 'curry', c: '#e8590c', items: [
      d(801, 'Butter Chicken + 2 Naan', 349, false, 1, '🍗', 'butterchicken', ['cozy','party'], 'Silky tomato-butter gravy, charred naan.'),
      d(802, 'Dal Makhani', 229, true, 1, '🍲', 'dalmakhani', ['cozy'], 'Overnight-simmered black lentils.'),
      d(803, 'Tandoori Paneer Tikka', 269, true, 2, '🧆', 'paneertikka', ['spicy','party'], 'Charred in the clay oven.'),
      d(804, 'Gajar Halwa', 119, true, 0, '🥕', 'gajarhalwa', ['sweet','cozy'], 'Slow-cooked carrot, khoya, nuts.'),
      d(805, 'Garlic Naan Basket', 99, true, 0, '🫓', 'naan', ['cozy'], 'Four buttery garlic naans.'),
      d(806, 'Tandoori Chicken (Half)', 329, false, 2, '🍗', 'tandoorichicken', ['spicy','party'], 'Yoghurt-marinated, clay-oven roasted.'),
      d(807, 'Palak Paneer', 249, true, 1, '🥬', 'palakpaneer', ['cozy','light'], 'Cottage cheese in silky spinach.'),
      d(808, 'Chicken Tikka Masala', 339, false, 2, '🍛', 'tikkamasala', ['cozy','spicy'], 'Charred tikka in spiced tomato gravy.'),
    ] },
  { id: 9, name: 'Roll Mantra', cat: 'rolls', cuisine: 'Kathi Rolls, Wraps', rating: 4.3, time: 24, cost: 220, pureVeg: false,
    offer: 'Flat ₹40 OFF', emoji: '🌯', kw: 'wrap', c: '#e8590c', items: [
      d(901, 'Chicken Kathi Roll', 149, false, 2, '🌯', 'kathiroll', ['spicy','party'], 'Smoky chicken, onions, green chutney.'),
      d(902, 'Egg Double Roll', 129, false, 1, '🍳', 'eggroll', ['cozy'], 'Two eggs, flaky paratha.'),
      d(903, 'Paneer Tikka Roll', 159, true, 2, '🌯', 'paneerwrap', ['spicy'], 'Tandoori paneer, mint mayo.'),
      d(904, 'Mutton Seekh Roll', 199, false, 2, '🌯', 'lambwrap', ['party'], 'Seekh kebab rolled hot.'),
      d(905, 'Veg Schezwan Wrap', 139, true, 2, '🌯', 'veggiewrap', ['spicy'], 'Indo-Chinese crunch in a wrap.'),
      d(906, 'Cheesy Corn Roll', 129, true, 0, '🌽', 'quesadilla', ['cozy','light'], 'Sweet corn, molten cheese.'),
      d(907, 'Egg Chicken Roll', 169, false, 1, '🌯', 'burrito', ['party'], 'Egg-wrapped chicken, onion rings.'),
      d(908, 'Aloo Tikki Roll', 99, true, 1, '🥔', 'potatotikki', ['cozy'], 'Spiced potato patty, tangy chutney.'),
    ] },
  { id: 10, name: 'Chaat Gali', cat: 'street', cuisine: 'Chaat, Street Food, Snacks', rating: 4.4, time: 20, cost: 150, pureVeg: true,
    offer: 'Flat 25% OFF', emoji: '🥘', kw: 'chaat', c: '#e03131', items: [
      d(1001, 'Pani Puri (6 pcs)', 49, true, 2, '🫧', 'panipuri', ['spicy','party'], 'Crisp puris, tangy mint water.'),
      d(1002, 'Dahi Puri', 69, true, 1, '🥣', 'dahipuri', ['light','party'], 'Yoghurt, sev, sweet-tamarind.'),
      d(1003, 'Samosa Chaat', 79, true, 2, '🥟', 'samosa', ['spicy','cozy'], 'Crushed samosa, chole, chutneys.'),
      d(1004, 'Pav Bhaji', 129, true, 2, '🍞', 'pavbhaji', ['cozy','spicy'], 'Buttery mashed vegetables, toasted pav.'),
      d(1005, 'Aloo Tikki Chaat', 89, true, 2, '🥔', 'alootikki', ['spicy'], 'Crisp tikki, curd, chutneys.'),
      d(1006, 'Vada Pav (2 pcs)', 59, true, 2, '🍔', 'vadapav', ['cozy','spicy'], 'The classic, with garlic chutney.'),
      d(1007, 'Bhel Puri', 69, true, 1, '🥗', 'bhelpuri', ['light','party'], 'Puffed rice, tamarind, onions, sev.'),
      d(1008, 'Dahi Bhalla', 89, true, 1, '🥣', 'dahivada', ['cozy'], 'Soft lentil dumplings in sweet curd.'),
    ] },
  { id: 11, name: 'Brew & Bean', cat: 'beverage', cuisine: 'Coffee, Tea, Shakes', rating: 4.5, time: 18, cost: 200, pureVeg: true,
    offer: 'B1G1 on lattes', emoji: '☕', kw: 'coffee', c: '#9c6b3f', items: [
      d(1101, 'Cappuccino', 149, true, 0, '☕', 'cappuccino', ['cozy'], 'Double shot, velvety foam.'),
      d(1102, 'Cold Coffee', 159, true, 0, '🧋', 'icedcoffee', ['sweet'], 'Blended with vanilla ice cream.'),
      d(1103, 'Masala Chai (Kulhad)', 49, true, 1, '🍵', 'masalachai', ['cozy'], 'Ginger, cardamom, served in clay.'),
      d(1104, 'Iced Peach Tea', 139, true, 0, '🍑', 'icedtea', ['light'], 'Black tea, peach, mint.'),
      d(1105, 'Hot Chocolate', 169, true, 0, '🍫', 'hotchocolate', ['sweet','cozy'], 'Dark chocolate, whipped cream.'),
      d(1106, 'Banana Caramel Shake', 179, true, 0, '🍌', 'bananashake', ['sweet'], 'Thick, creamy, salted caramel.'),
      d(1107, 'Espresso Doppio', 119, true, 0, '☕', 'espresso', ['cozy'], 'Two intense shots, nothing else.'),
      d(1108, 'Mango Lassi', 109, true, 0, '🥭', 'lassi', ['sweet','light'], 'Thick yoghurt, alphonso, cardamom.'),
    ] },
  { id: 12, name: 'Thali House', cat: 'thali', cuisine: 'Odia, North Indian, Thali', rating: 4.6, time: 30, cost: 260, pureVeg: true,
    offer: 'Free sweet', emoji: '🍱', kw: 'thali', c: '#d9822b', items: [
      d(1201, 'Odia Veg Thali', 249, true, 1, '🍱', 'indianthali', ['cozy'], 'Dalma, santula, saga, rice, pitha.'),
      d(1202, 'Dalma + Rice', 129, true, 0, '🍛', 'dal,rice', ['cozy','light'], 'Lentils with vegetables, ghee rice.'),
      d(1203, 'Chhena Poda', 99, true, 0, '🍰', 'baked,cheesecake', ['sweet'], 'Caramelised baked cottage cheese.'),
      d(1204, 'Rasabali', 89, true, 0, '🍮', 'rasmalai', ['sweet'], 'Fried chhena discs in thickened milk.'),
      d(1205, 'Pakhala Bhata Combo', 139, true, 0, '🥣', 'ricebowl', ['light'], 'Cool fermented rice, badi chura, saga.'),
      d(1206, 'Rajma Chawal', 149, true, 1, '🍚', 'rajma', ['cozy'], 'Kidney bean curry over steamed rice.'),
      d(1207, 'Santula', 99, true, 0, '🥦', 'vegetablecurry', ['light','cozy'], 'Lightly sautéed vegetables, no oil heaviness.'),
      d(1208, 'Gulab Jamun (2 pcs)', 69, true, 0, '🟤', 'gulabjamun', ['sweet'], 'Warm, saffron-syrup soaked.'),
    ] },
  { id: 13, name: 'Pasta Fresca', cat: 'pizza', cuisine: 'Pasta, Salads, Italian', rating: 4.2, time: 33, cost: 420, pureVeg: false,
    offer: '20% OFF', emoji: '🍝', kw: 'pasta', c: '#d6336c', items: [
      d(1301, 'Alfredo Penne', 289, true, 0, '🍝', 'alfredo', ['cozy'], 'Creamy parmesan white sauce.'),
      d(1302, 'Spaghetti Bolognese', 329, false, 1, '🍝', 'spaghetti', ['cozy'], 'Slow-simmered beef ragù.'),
      d(1303, 'Pesto Fusilli', 299, true, 0, '🌿', 'pesto', ['light'], 'Basil pesto, pine nuts, cherry tomato.'),
      d(1304, 'Baked Lasagna', 349, false, 1, '🧀', 'lasagna', ['cozy'], 'Layered pasta, ragù, béchamel.'),
      d(1305, 'Caesar Salad', 229, true, 0, '🥗', 'caesarsalad', ['light'], 'Romaine, parmesan, garlic croutons.'),
      d(1306, 'Panna Cotta', 159, true, 0, '🍮', 'pannacotta', ['sweet'], 'Vanilla cream, berry coulis.'),
      d(1307, 'Mushroom Risotto', 319, true, 0, '🍄', 'risotto', ['cozy'], 'Creamy arborio, porcini, parmesan.'),
      d(1308, 'Garlic Prawn Linguine', 379, false, 1, '🦐', 'prawnpasta', ['party'], 'Prawns, chilli flakes, white wine.'),
    ] },
  { id: 14, name: 'Sandwich Society', cat: 'burger', cuisine: 'Sandwiches, Subs, Fries', rating: 4.1, time: 22, cost: 240, pureVeg: false,
    offer: 'Free fries over ₹299', emoji: '🥪', kw: 'sandwich', c: '#74b816', items: [
      d(1401, 'Grilled Cheese Sandwich', 149, true, 0, '🧀', 'grilledcheese', ['cozy'], 'Three cheeses, golden sourdough.'),
      d(1402, 'Club Sandwich', 199, false, 0, '🥪', 'clubsandwich', ['party'], 'Chicken, egg, lettuce, triple decker.'),
      d(1403, 'Bombay Masala Sandwich', 119, true, 2, '🥪', 'toast,sandwich', ['spicy'], 'Chutney, potato, beetroot, tomato.'),
      d(1404, 'Chicken Tikka Sub', 229, false, 2, '🥖', 'submarine', ['spicy','party'], 'Tandoori chicken in a toasted sub.'),
      d(1405, 'Peri Peri Fries', 129, true, 2, '🍟', 'frenchfries', ['spicy','party'], 'Tossed in smoky peri-peri.'),
      d(1406, 'Cold Cocoa', 129, true, 0, '🥛', 'chocolatemilk', ['sweet'], 'Chilled chocolate milk, whipped cream.'),
      d(1407, 'Paneer Tikka Sandwich', 169, true, 2, '🥪', 'panini', ['spicy'], 'Tandoori paneer, mint chutney, cheese.'),
      d(1408, 'Chicken Mayo Sandwich', 179, false, 0, '🥪', 'chickensandwich', ['light','cozy'], 'Shredded chicken, herby mayo.'),
    ] },
  { id: 15, name: 'Cone Culture', cat: 'dessert', cuisine: 'Ice Cream, Sundaes, Shakes', rating: 4.8, time: 26, cost: 220, pureVeg: true,
    offer: 'Flat ₹60 OFF', emoji: '🍦', kw: 'icecream', c: '#1c7ed6', items: [
      d(1501, 'Belgian Chocolate Tub', 189, true, 0, '🍫', 'chocolateicecream', ['sweet'], 'Dark chocolate, 500ml tub.'),
      d(1502, 'Kulfi Falooda', 149, true, 0, '🍨', 'kulfi', ['sweet','party'], 'Pistachio kulfi, rose, vermicelli.'),
      d(1503, 'Brownie Sundae', 199, true, 0, '🍨', 'brownie', ['sweet','cozy'], 'Warm brownie, vanilla, fudge.'),
      d(1504, 'Alphonso Mango Scoops', 169, true, 0, '🥭', 'mangoicecream', ['sweet','light'], 'Seasonal mango ice cream.'),
      d(1505, 'Cookie Dough Shake', 189, true, 0, '🥤', 'cookieshake', ['sweet','party'], 'Cookie chunks, malted milk.'),
      d(1506, 'Waffle Cone Trio', 159, true, 0, '🍦', 'icecreamcone', ['sweet'], 'Three scoops in a fresh waffle cone.'),
      d(1507, 'Strawberry Sundae', 179, true, 0, '🍓', 'strawberrysundae', ['sweet','light'], 'Strawberry compote, cream, wafer.'),
      d(1508, 'Pistachio Gelato', 199, true, 0, '🍨', 'gelato', ['sweet'], 'Sicilian-style, nutty and smooth.'),
    ] },
  { id: 16, name: 'Seoul Street', cat: 'chinese', cuisine: 'Korean, Asian, Rice Bowls', rating: 4.3, time: 34, cost: 400, pureVeg: false,
    offer: '15% OFF', emoji: '🥢', kw: 'korean', c: '#4263eb', items: [
      d(1601, 'Korean Fried Chicken', 329, false, 3, '🍗', 'koreanfriedchicken', ['spicy','party'], 'Double-fried, gochujang glaze.'),
      d(1602, 'Bibimbap Bowl', 299, true, 1, '🍲', 'bibimbap', ['light'], 'Rice, veg, gochujang, fried egg.'),
      d(1603, 'Spicy Ramyun', 249, true, 3, '🍜', 'ramen', ['spicy','cozy'], 'Fiery broth, springy noodles.'),
      d(1604, 'Kimchi Fried Rice', 229, true, 2, '🍚', 'kimchi', ['spicy'], 'Wok-fried with fermented kimchi.'),
      d(1605, 'Tteokbokki', 219, true, 3, '🍢', 'tteokbokki', ['spicy','party'], 'Chewy rice cakes in red chilli sauce.'),
      d(1606, 'Cheesy Corn Dog', 159, false, 0, '🌭', 'corndog', ['party'], 'Mozzarella-stuffed, panko-crusted.'),
      d(1607, 'Japchae', 239, true, 0, '🍝', 'glassnoodles', ['light'], 'Glass noodles, sesame, veggies.'),
      d(1608, 'Kimbap Roll', 199, true, 0, '🍙', 'kimbap', ['light'], 'Seaweed-wrapped rice and veg rolls.'),
    ] },
  { id: 17, name: 'Momo Mania', cat: 'chinese', cuisine: 'Momos, Dumplings, Soups', rating: 4.4, time: 25, cost: 200, pureVeg: false,
    offer: 'Flat ₹30 OFF', emoji: '🥟', kw: 'dumplings', c: '#e64980', items: [
      d(1701, 'Steamed Chicken Momos', 149, false, 1, '🥟', 'steameddumplings', ['cozy','light'], 'Juicy chicken, ginger, spring onion.'),
      d(1702, 'Pan-Fried Veg Momos', 139, true, 1, '🥟', 'potstickers', ['party'], 'Crisp-bottomed, soft-topped.'),
      d(1703, 'Tandoori Momos', 169, false, 2, '🍢', 'tandoorimomo', ['spicy','party'], 'Charred in yoghurt-spice marinade.'),
      d(1704, 'Kurkure Momos', 159, true, 1, '🥟', 'friedmomo', ['party'], 'Crunchy coating, cheesy centre.'),
      d(1705, 'Cheese Corn Momos', 149, true, 0, '🧀', 'cheesedumpling', ['cozy'], 'Sweet corn with molten cheese.'),
      d(1706, 'Schezwan Momos', 159, false, 3, '🌶️', 'spicydumplings', ['spicy'], 'Tossed in fiery schezwan sauce.'),
      d(1707, 'Wonton Soup', 129, false, 0, '🍲', 'wonton', ['cozy','light'], 'Silky wontons in clear broth.'),
      d(1708, 'Chocolate Momos', 119, true, 0, '🍫', 'chocolatedumpling', ['sweet'], 'Dessert momos with melted chocolate.'),
    ] },
  { id: 18, name: 'Coastal Catch', cat: 'seafood', cuisine: 'Seafood, Odia Coastal, Curries', rating: 4.5, time: 36, cost: 450, pureVeg: false,
    offer: '25% OFF', emoji: '🦐', kw: 'seafood', c: '#1c7ed6', items: [
      d(1801, 'Fish Fry (Rohu)', 249, false, 2, '🐟', 'fishfry', ['spicy','party'], 'Crisp rawa-crusted fish fry.'),
      d(1802, 'Chingudi Malai Curry', 399, false, 1, '🦐', 'prawncurry', ['cozy'], 'Prawns in coconut-mustard gravy.'),
      d(1803, 'Fish Curry Rice', 279, false, 2, '🍛', 'fishcurry', ['cozy'], 'Tangy mustard fish curry, steamed rice.'),
      d(1804, 'Crab Masala', 449, false, 3, '🦀', 'crab', ['spicy','party'], 'Whole crab in a fiery masala.'),
      d(1805, 'Fish Tikka', 329, false, 2, '🍢', 'grilledfish', ['party','spicy'], 'Ajwain-spiced tandoori fish cubes.'),
      d(1806, 'Prawn Biryani', 389, false, 2, '🍤', 'shrimp', ['party'], 'Fragrant rice layered with prawns.'),
      d(1807, 'Calamari Rings', 299, false, 0, '🦑', 'calamari', ['party','light'], 'Golden squid rings, lemon aioli.'),
      d(1808, 'Grilled Lemon Fish', 349, false, 0, '🐟', 'salmon', ['light'], 'Herb-butter fillet, charred lemon.'),
    ] },
  { id: 19, name: 'Crumb & Co.', cat: 'dessert', cuisine: 'Bakery, Cookies, Pastries', rating: 4.6, time: 24, cost: 180, pureVeg: true,
    offer: 'Flat 15% OFF', emoji: '🥐', kw: 'bakery', c: '#f08c00', items: [
      d(1901, 'Choco Chip Cookies (4)', 119, true, 0, '🍪', 'chocolatechipcookies', ['sweet','cozy'], 'Gooey centres, crisp edges.'),
      d(1902, 'Butter Croissant', 99, true, 0, '🥐', 'croissant', ['cozy','light'], 'Flaky, buttery, baked fresh.'),
      d(1903, 'Cinnamon Roll', 129, true, 0, '🌀', 'cinnamonroll', ['sweet','cozy'], 'Cream-cheese glaze, warm spice.'),
      d(1904, 'Blueberry Muffin', 89, true, 0, '🧁', 'muffin', ['sweet'], 'Bursting with berries.'),
      d(1905, 'Garlic Focaccia', 139, true, 0, '🍞', 'focaccia', ['cozy','party'], 'Rosemary, olive oil, sea salt.'),
      d(1906, 'Banana Bread Slice', 79, true, 0, '🍌', 'bananabread', ['cozy','sweet'], 'Moist, walnut-studded.'),
      d(1907, 'Doughnut Box (6)', 299, true, 0, '🍩', 'donuts', ['sweet','party'], 'Assorted glazed doughnuts.'),
      d(1908, 'Almond Danish', 109, true, 0, '🥮', 'danish', ['sweet'], 'Frangipane, flaked almonds.'),
    ] },
  { id: 20, name: 'Egg & Toast', cat: 'breakfast', cuisine: 'Breakfast, Brunch, All-day', rating: 4.4, time: 21, cost: 210, pureVeg: false,
    offer: 'Free coffee over ₹349', emoji: '🍳', kw: 'breakfast', c: '#fab005', items: [
      d(2001, 'Avocado Toast', 219, true, 0, '🥑', 'avocadotoast', ['light'], 'Sourdough, smashed avocado, chilli flakes.'),
      d(2002, 'Masala Omelette', 119, false, 2, '🍳', 'omelette', ['spicy','cozy'], 'Three eggs, onion, chilli, coriander.'),
      d(2003, 'Pancake Stack', 189, true, 0, '🥞', 'pancakes', ['sweet','cozy'], 'Fluffy stack, maple syrup, butter.'),
      d(2004, 'French Toast', 159, true, 0, '🍞', 'frenchtoast', ['sweet'], 'Custard-soaked, cinnamon sugar.'),
      d(2005, 'Aloo Paratha + Curd', 129, true, 1, '🫓', 'paratha', ['cozy'], 'Stuffed, griddled, white butter.'),
      d(2006, 'Poha', 79, true, 1, '🥣', 'poha', ['light','cozy'], 'Flattened rice, peanuts, lemon.'),
      d(2007, 'Eggs Benedict', 249, false, 0, '🍳', 'eggsbenedict', ['party','cozy'], 'Poached eggs, hollandaise, muffin.'),
      d(2008, 'Fruit & Granola Bowl', 169, true, 0, '🍓', 'granola', ['light','sweet'], 'Yoghurt, seasonal fruit, crunchy granola.'),
    ] },
];

RESTAURANTS.forEach(r => { r.bg = `linear-gradient(135deg,${r.c},${r.c}aa)`; });

/* build search phrases: dishes use their own name; restaurants/categories use their keyword */
const cleanName = n => n.replace(/\(.*?\)/g, '').replace(/\+.*$/, '').replace(/\s+/g, ' ').trim();
RESTAURANTS.forEach(r => { if (!TERM[r.kw]) TERM[r.kw] = r.kw; r.items.forEach(i => { TERM[i.kw] = cleanName(i.name); }); });
CATS.forEach(c => { if (!TERM[c.kw]) TERM[c.kw] = c.kw; });
Object.keys(TERM_OVERRIDE).forEach(k => { TERM[k] = TERM_OVERRIDE[k]; });
