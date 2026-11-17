/* ============ STATE ============ */
const state = {
  mood: null, cat: 'all', q: '',
  veg: false, rating: false, fast: false, fav: false, sort: 'rel',
  cart: loadCart(),      // { restaurantId, items: { itemId: qty } }
  coupon: null,
  favs: loadFavs(),
};
function loadCart() {
  try { const c = JSON.parse(localStorage.getItem('md-cart')); if (c && c.items) return c; } catch (e) {}
  return { restaurantId: null, items: {} };
}
function saveCart() { try { localStorage.setItem('md-cart', JSON.stringify(state.cart)); } catch (e) {} }
function loadFavs() { try { return new Set(JSON.parse(localStorage.getItem('md-favs') || '[]')); } catch (e) { return new Set(); } }
function saveFavs() { try { localStorage.setItem('md-favs', JSON.stringify([...state.favs])); } catch (e) {} }

/* ============ HELPERS ============ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rupee = n => '₹' + Math.round(n).toLocaleString('en-IN');
const findResto = id => RESTAURANTS.find(r => r.id === id);
const findItem = id => {
  for (const r of RESTAURANTS) { const it = r.items.find(i => i.id === id); if (it) return { item: it, resto: r }; }
  return null;
};
const catColor = id => (CATS.find(c => c.id === id) || {}).c || '#ff6b35';
const spiceStr = n => n ? '🌶'.repeat(n) : '';
const dot = veg => `<span class="dot ${veg ? '' : 'nv'}" title="${veg ? 'Veg' : 'Non-veg'}"></span>`;
const totalDishes = () => RESTAURANTS.reduce((a, r) => a + r.items.length, 0);

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============ BRAND + HERO ============ */
function renderBrand() {
  const mark = (cls) => thumb('burger', '🍔', 'logoimg ' + cls, 7, 120, 120);
  $('#logo').innerHTML = mark('') + '<span><span class="md">MD</span><span class="dl">delights</span></span>';
  $('#footLogo').innerHTML = `<span class="logo" style="font-size:1.2rem">${mark('sm')}<span><span class="md">MD</span><span class="dl">delights</span></span></span>`;
}
function renderHeroArt() {
  $('#heroArt').innerHTML =
    thumb('biryani', '🍛', 'main', 901, 500, 500) +
    thumb('pizza', '🍕', 's1', 902, 240, 240) +
    thumb('cake', '🍰', 's2', 903, 240, 240) +
    thumb('salad', '🥗', 's3', 904, 240, 240) +
    thumb('noodles', '🍜', 's4', 905, 240, 240);
}
function renderMarquee() {
  const bits = RESTAURANTS.map(r => `<span>🔥 ${r.name}: ${r.offer}</span>`).join('');
  $('#marquee').innerHTML = bits + bits;
}
function runCounters() {
  $$('[data-count]').forEach(el => {
    const key = el.dataset.count;
    const target = key === 'restaurants' ? RESTAURANTS.length : key === 'dishes' ? totalDishes() : +key;
    const suffix = el.dataset.suffix || '';
    const t0 = performance.now(), dur = 1400;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ============ MOODS + PICKS ============ */
function renderMoods() {
  $('#moods').innerHTML = MOODS.map(m =>
    `<button class="mood ${state.mood === m.id ? 'active' : ''}" data-mood="${m.id}" style="--c:${m.c}" role="tab" aria-selected="${state.mood === m.id}">
       <i>${m.emoji}</i>${m.label}</button>`).join('');
}
function renderPicks() {
  const sec = $('#picksSection');
  if (!state.mood) { sec.hidden = true; return; }
  const mood = MOODS.find(m => m.id === state.mood);
  const picks = [];
  RESTAURANTS.forEach(r => r.items.forEach(i => { if (i.tags.includes(state.mood)) picks.push({ ...i, resto: r }); }));
  picks.sort((a, b) => b.resto.rating - a.resto.rating);
  $('#picksTitle').textContent = `${mood.emoji} ${picks.length} dishes for "${mood.label}"`;
  $('#picks').innerHTML = picks.map((p, i) => `
    <div class="pick" style="animation-delay:${i * 35}ms">
      ${thumb(p.kw, p.emoji, 'pickimg', p.id, 480, 300)}
      <b>${dot(p.veg)} ${p.name}</b>
      <div class="spice">${spiceStr(p.spice)}</div>
      <div class="from">${p.resto.name} · ⭐ ${p.resto.rating}</div>
      <div class="row"><span class="price">${rupee(p.price)}</span><button class="btn sm" data-add="${p.id}">ADD</button></div>
    </div>`).join('');
  sec.hidden = false;
  sec.classList.add('in');
}

/* ============ CATEGORIES ============ */
function renderCats() {
  $('#cats').innerHTML = CATS.map(c =>
    `<button class="cat ${state.cat === c.id ? 'active' : ''}" data-cat="${c.id}" style="--c:${c.c}">
       ${thumb(c.kw, c.emoji, 'catimg', 600 + CATS.indexOf(c), 160, 160)}${c.label}</button>`).join('');
}

/* ============ RESTAURANTS ============ */
function filteredRestaurants() {
  const q = state.q.trim().toLowerCase();
  const list = RESTAURANTS.filter(r => {
    if (state.cat !== 'all' && r.cat !== state.cat) return false;
    if (state.veg && !r.pureVeg) return false;
    if (state.rating && r.rating < 4.3) return false;
    if (state.fast && r.time > 30) return false;
    if (state.fav && !state.favs.has(r.id)) return false;
    if (q) {
      const hay = (r.name + ' ' + r.cuisine + ' ' + r.items.map(i => i.name).join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (state.mood && !r.items.some(i => i.tags.includes(state.mood))) return false;
    return true;
  });
  if (state.sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  if (state.sort === 'time') list.sort((a, b) => a.time - b.time);
  if (state.sort === 'cost') list.sort((a, b) => a.cost - b.cost);
  return list;
}
function renderRestaurants() {
  const list = filteredRestaurants();
  $('#countTitle').textContent = list.length ? `${list.length} restaurant${list.length > 1 ? 's' : ''} near you` : 'No restaurants found';
  $('#empty').hidden = list.length > 0;
  $('#restaurants').innerHTML = list.map((r, i) => `
    <article class="rcard" data-resto="${r.id}" tabindex="0" role="button" aria-label="Open ${r.name}" style="--c:${r.c};animation-delay:${Math.min(i, 12) * 45}ms">
      <div class="banner" style="background:${r.bg}">
        ${thumb(r.kw, r.emoji, 'cover', 1000 + r.id, 640, 400)}
        <span class="offer">${r.offer}</span>
        ${r.pureVeg ? '<span class="vegdot">🌱 Pure veg</span>' : ''}
        <button class="heart ${state.favs.has(r.id) ? 'on' : ''}" data-fav="${r.id}" aria-label="Favourite">♥</button>
      </div>
      <div class="info">
        <h3>${r.name}</h3>
        <div class="meta"><span class="rating">★ ${r.rating}</span><span>${r.time} min</span><span>${rupee(r.cost)} for one</span></div>
        <div class="cuisine">${r.cuisine}</div>
      </div>
    </article>`).join('');
}

/* ============ MENU MODAL ============ */
function openMenu(id) {
  const r = findResto(id);
  $('#menuContent').innerHTML = `
    <div class="mhead" style="background:${r.bg}">
      ${thumb(r.kw, r.emoji, 'mhimg', 1000 + r.id, 320, 320)}
      <div><h2>${r.name}</h2>
        <div class="meta"><span class="rating">★ ${r.rating}</span><span>${r.time} min</span><span>${r.cuisine}</span></div>
      </div>
    </div>
    <div class="mlist">
      ${r.items.map(i => `
        <div class="item">
          ${thumb(i.kw, i.emoji, 'itemimg', i.id, 480, 300)}
          <div class="it">
            <b>${dot(i.veg)} ${i.name}</b>
            <p>${i.desc}</p>
            <span class="spice">${spiceStr(i.spice)}</span>
          </div>
          <div class="bar"><span class="price">${rupee(i.price)}</span><span data-ctrl="${i.id}">${ctrlHTML(i.id)}</span></div>
        </div>`).join('')}
    </div>`;
  $('#menuModal').hidden = false;
}
function closeModals() { $('#menuModal').hidden = true; }
function ctrlHTML(itemId) {
  const q = state.cart.items[itemId] || 0;
  return q
    ? `<span class="qty"><button data-dec="${itemId}">−</button><span>${q}</span><button data-inc="${itemId}">+</button></span>`
    : `<button class="btn sm" data-add="${itemId}">ADD</button>`;
}
function refreshCtrls() { $$('[data-ctrl]').forEach(el => { el.innerHTML = ctrlHTML(+el.dataset.ctrl); }); }

/* ============ CART ============ */
const cartCount = () => Object.values(state.cart.items).reduce((a, b) => a + b, 0);

function flyToCart(fromEl) {
  if (!fromEl || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const a = fromEl.getBoundingClientRect(), b = $('#cartBtn').getBoundingClientRect();
  const img = fromEl.querySelector('img');
  const el = document.createElement('div');
  el.className = 'fly';
  const size = 64;
  Object.assign(el.style, { width: size + 'px', height: size + 'px', left: a.left + a.width / 2 - size / 2 + 'px', top: a.top + a.height / 2 - size / 2 + 'px' });
  if (img && img.complete && img.naturalWidth) el.style.backgroundImage = `url("${img.src}")`;
  else el.textContent = (fromEl.querySelector('.fb') || {}).textContent || '🍽️';
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  el.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * .5}px,${dy * .5 - 80}px) scale(.8)`, opacity: 1, offset: .5 },
    { transform: `translate(${dx}px,${dy}px) scale(.15)`, opacity: .4 },
  ], { duration: 750, easing: 'cubic-bezier(.5,0,.7,.4)' }).onfinish = () => el.remove();
}

function addItem(itemId, fromEl) {
  const found = findItem(itemId);
  if (!found) return;
  if (state.cart.restaurantId && state.cart.restaurantId !== found.resto.id && cartCount() > 0) {
    const ok = confirm(`Your bag has items from ${findResto(state.cart.restaurantId).name}.\nStart a new bag with ${found.resto.name}?`);
    if (!ok) return;
    state.cart = { restaurantId: null, items: {} };
  }
  state.cart.restaurantId = found.resto.id;
  state.cart.items[itemId] = (state.cart.items[itemId] || 0) + 1;
  flyToCart(fromEl);
  afterCartChange();
  toast(`${found.item.emoji} ${found.item.name} added`);
  setTimeout(() => { const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }, 600);
}
function changeQty(itemId, delta) {
  const q = (state.cart.items[itemId] || 0) + delta;
  if (q <= 0) delete state.cart.items[itemId]; else state.cart.items[itemId] = q;
  if (cartCount() === 0) { state.cart.restaurantId = null; state.coupon = null; }
  afterCartChange();
}
function afterCartChange() { saveCart(); $('#cartCount').textContent = cartCount(); refreshCtrls(); renderCart(); }

function totals() {
  let sub = 0;
  for (const [id, q] of Object.entries(state.cart.items)) { const f = findItem(+id); if (f) sub += f.item.price * q; }
  let discount = 0;
  if (state.coupon === 'MDFIRST50') discount = Math.min(sub * 0.5, 100);
  if (state.coupon === 'MOOD20') discount = Math.min(sub * 0.2, 80);
  const delivery = sub === 0 || sub >= 499 ? 0 : 30;
  const tax = (sub - discount) * 0.05;
  return { sub, discount, delivery, tax, total: sub - discount + delivery + tax };
}
function renderCart() {
  const body = $('#cartBody'), foot = $('#cartFoot');
  const ids = Object.keys(state.cart.items);
  if (!ids.length) {
    body.innerHTML = `<div class="empty-cart"><div class="big">🛍️</div><p>Your bag is empty.<br/>Pick a mood and fill it up!</p></div>`;
    foot.innerHTML = ''; return;
  }
  const r = findResto(state.cart.restaurantId);
  body.innerHTML = `<p class="crest">From <b>${r.name}</b></p>` + ids.map(id => {
    const { item } = findItem(+id); const q = state.cart.items[id];
    return `<div class="crow">
      ${thumb(item.kw, item.emoji, 'cartimg', item.id, 120, 120)}
      <div class="n">${dot(item.veg)} ${item.name}<small>${rupee(item.price)}</small></div>
      <span class="qty"><button data-dec="${id}">−</button><span>${q}</span><button data-inc="${id}">+</button></span>
      <b style="min-width:62px;text-align:right">${rupee(item.price * q)}</b>
    </div>`;
  }).join('');
  const t = totals();
  foot.innerHTML = `
    <div class="coupon"><input id="couponIn" placeholder="Coupon: MDFIRST50 / MOOD20" value="${state.coupon || ''}" /><button class="btn sm" id="applyCoupon">Apply</button></div>
    <div class="bill"><span>Item total</span><span>${rupee(t.sub)}</span></div>
    ${t.discount ? `<div class="bill disc"><span>Coupon (${state.coupon})</span><span>−${rupee(t.discount)}</span></div>` : ''}
    <div class="bill"><span>Delivery ${t.delivery ? '' : '(free)'}</span><span>${t.delivery ? rupee(t.delivery) : '₹0'}</span></div>
    <div class="bill"><span>GST (5%)</span><span>${rupee(t.tax)}</span></div>
    <div class="bill total"><span>To pay</span><span>${rupee(t.total)}</span></div>
    <button class="btn block" id="placeOrder" style="margin-top:12px">Place order · ${rupee(t.total)}</button>`;
}
function openCart() { $('#scrim').hidden = false; $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); }
function closeCart() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#scrim').hidden = true; }

/* ============ CONFETTI + ORDER TRACKING ============ */
function confetti() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const bits = ['🎉', '🍕', '🍔', '✨', '🍩', '🥳', '🍟', '🌮'];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('span');
    s.className = 'confetti'; s.textContent = bits[i % bits.length]; document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, dist = 160 + Math.random() * 320;
    s.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist - 120}px) rotate(${Math.random() * 720}deg) scale(1)`, opacity: 1, offset: .6 },
      { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist + 220}px) rotate(900deg) scale(.8)`, opacity: 0 },
    ], { duration: 1600 + Math.random() * 700, easing: 'ease-out' }).onfinish = () => s.remove();
  }
}
let trackTimer;
function placeOrder() {
  const r = findResto(state.cart.restaurantId);
  const id = '#MD' + Math.floor(1000 + Math.random() * 9000);
  closeCart(); closeModals();
  state.cart = { restaurantId: null, items: {} }; state.coupon = null; afterCartChange();
  $('#orderId').textContent = id;
  $('#trackDone').hidden = true; $('#trackModal').hidden = false;
  const stepsEl = $$('#steps li');
  const labels = ['Order confirmed ✅', `${r.name} is cooking 👨‍🍳`, 'Rider is on the way 🛵', 'Delivered — enjoy! 🎉'];
  let step = 0;
  const update = () => {
    const pct = (step / 3) * 100;
    $('#trackFill').style.width = pct + '%'; $('#rider').style.left = pct + '%';
    stepsEl.forEach((li, i) => li.classList.toggle('done', i <= step));
    $('#trackSub').textContent = labels[step];
  };
  update(); confetti();
  clearInterval(trackTimer);
  trackTimer = setInterval(() => {
    step++; update();
    if (step >= 3) { clearInterval(trackTimer); $('#trackDone').hidden = false; confetti(); }
  }, 2500);
}

/* ============ EVENTS ============ */
function refreshAll() { renderMoods(); renderPicks(); renderRestaurants(); }
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-close], .scrim, [data-resto]');
  if (!t) { if (e.target.id === 'menuModal') closeModals(); return; }
  if (t.dataset.mood) {
    state.mood = state.mood === t.dataset.mood ? null : t.dataset.mood;
    refreshAll();
    if (state.mood) $('#picksSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  else if (t.id === 'clearMood') { state.mood = null; refreshAll(); }
  else if (t.dataset.cat) { state.cat = t.dataset.cat; renderCats(); renderRestaurants(); }
  else if (t.dataset.fav) {
    const id = +t.dataset.fav;
    if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id);
    saveFavs(); t.classList.toggle('on', state.favs.has(id));
    toast(state.favs.has(id) ? '❤️ Saved to favourites' : 'Removed from favourites');
    if (state.fav) renderRestaurants();
  }
  else if (t.dataset.add) addItem(+t.dataset.add, t.closest('.item, .pick')?.querySelector('.thumb'));
  else if (t.dataset.inc) changeQty(+t.dataset.inc, 1);
  else if (t.dataset.dec) changeQty(+t.dataset.dec, -1);
  else if (t.hasAttribute('data-close')) closeModals();
  else if (t.id === 'cartBtn') { renderCart(); openCart(); }
  else if (t.id === 'closeCart' || t.id === 'scrim') closeCart();
  else if (t.id === 'placeOrder') placeOrder();
  else if (t.id === 'trackDone') { $('#trackModal').hidden = true; toast('Hope it was yummy! 😋'); }
  else if (t.id === 'applyCoupon') {
    const code = $('#couponIn').value.trim().toUpperCase();
    if (['MDFIRST50', 'MOOD20'].includes(code)) { state.coupon = code; toast(`Coupon ${code} applied 🎟️`); }
    else { state.coupon = null; toast('Invalid coupon'); }
    renderCart();
  }
  else if (t.id === 'locBtn') {
    const city = prompt('Enter your city:', $('#locText').textContent);
    if (city && city.trim()) $('#locText').textContent = city.trim();
  }
  else if (t.dataset.resto) openMenu(+t.dataset.resto);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModals(); closeCart(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.rcard')) { e.preventDefault(); openMenu(+e.target.dataset.resto); }
});
$('#scrim').addEventListener('click', closeCart);
$('#search').addEventListener('input', e => { state.q = e.target.value; renderRestaurants(); });
[['fVeg', 'veg'], ['fRating', 'rating'], ['fFast', 'fast'], ['fFav', 'fav']].forEach(([id, key]) =>
  $('#' + id).addEventListener('change', e => { state[key] = e.target.checked; renderRestaurants(); }));
$('#sort').addEventListener('change', e => { state.sort = e.target.value; renderRestaurants(); });

/* ============ INTERACTIVITY: cursor, tilt, magnet, parallax, reveal ============ */
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;

if (finePointer && !reduceMotion) {
  const ring = $('#cursor'), dotEl = $('#cursorDot'), hero = $('#hero');
  let tiltEl = null, magEl = null, raf = 0, px = 0, py = 0;
  const HOT = 'a,button,input,select,label,.rcard,.pick,.item,.cat,.mood';
  const MAGNETIC = '.cart-btn,.btn,.mood,.cat,.loc,.heart,.logo';
  const reset = el => { if (el) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); } };

  const frame = () => {
    raf = 0;
    document.body.classList.add('has-cursor');
    ring.style.transform = `translate(${px}px,${py}px)`;
    dotEl.style.transform = `translate(${px}px,${py}px)`;
    const under = document.elementFromPoint(px, py);
    ring.classList.toggle('hot', !!(under && under.closest(HOT)));

    // 3D tilt that follows the cursor
    const card = under && under.closest('.rcard,.pick,.item');
    if (card !== tiltEl) { reset(tiltEl); tiltEl = card; }
    if (card) {
      const r = card.getBoundingClientRect();
      const x = (px - r.left) / r.width, y = (py - r.top) / r.height;
      card.style.setProperty('--ry', ((x - .5) * 14).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((.5 - y) * 14).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    }

    // magnetic buttons: they lean toward the cursor
    const mag = under && under.closest(MAGNETIC);
    if (mag !== magEl) { if (magEl) magEl.style.translate = ''; magEl = mag; }
    if (mag) {
      const r = mag.getBoundingClientRect();
      mag.style.translate = `${((px - (r.left + r.width / 2)) * .22).toFixed(1)}px ${((py - (r.top + r.height / 2)) * .3).toFixed(1)}px`;
    }

    // hero parallax: floating photos and blobs drift with the cursor
    const hr = hero.getBoundingClientRect();
    if (py > hr.top - 60 && py < hr.bottom + 60) {
      hero.style.setProperty('--px', (((px - hr.left) / hr.width - .5) * 2).toFixed(3));
      hero.style.setProperty('--py', (((py - hr.top) / hr.height - .5) * 2).toFixed(3));
    }
  };
  document.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(frame); });
  document.addEventListener('pointerleave', () => { document.body.classList.remove('has-cursor'); reset(tiltEl); if (magEl) magEl.style.translate = ''; });
  document.addEventListener('mouseleave', () => { document.body.classList.remove('has-cursor'); });
  document.addEventListener('pointerdown', () => ring.animate([{ scale: 1 }, { scale: .6 }, { scale: 1 }], { duration: 260 }));
}

// header shadow on scroll
addEventListener('scroll', () => $('#top').classList.toggle('scrolled', scrollY > 20), { passive: true });

// scroll reveal
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 })
  : null;
$$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

/* ============ INIT ============ */
renderBrand();
renderHeroArt();
renderMarquee();
renderMoods();
renderCats();
renderRestaurants();
afterCartChange();
runCounters();
