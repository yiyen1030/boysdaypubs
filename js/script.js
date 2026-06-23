// ── 全域狀態 ──────────────────────────────────────────────
let places = [];
let pubs = [];
let selectedCart = [];
let map, markersGroup, pubMarkersGroup;
let userMarker = null;
let focusedId = null;

// ── 多語系 ────────────────────────────────────────────────
let currentLang = 'zh';
let langData = {};

async function loadLang(lang) {
    const res = await fetch(`lang/${lang}.json`);
    langData = await res.json();
    currentLang = lang;
    localStorage.setItem('lang', lang);
    applyLang();
}

// 取 UI 字串
function t(key) {
    return langData[key] !== undefined ? langData[key] : key;
}

// 取資料欄位：優先 _de（或其他語系）版本，否則回傳原欄位
function td(item, field) {
    if (currentLang !== 'zh') {
        const localized = item[`${field}_${currentLang}`];
        if (localized !== undefined) return localized;
    }
    return item[field];
}

function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langData[key] !== undefined) el.textContent = langData[key];
    });
    document.title = t('page.title');
    document.documentElement.lang = currentLang === 'zh' ? 'zh-TW' : 'de';
    updateLangButtons();
    updateCartUI();
    if (places.length > 0 || pubs.length > 0) {
        renderList();
        renderMarkers();
        renderPubMarkers();
    }
}

function setLang(lang) {
    if (lang === currentLang) { closeMenu(); return; }
    loadLang(lang).then(() => closeMenu());
}

function updateLangButtons() {
    const active   = 'border-amber-500/60 text-amber-400 bg-amber-500/10';
    const inactive = 'border-zinc-700/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500';
    ['zh', 'de'].forEach(l => {
        const btn = document.getElementById(`lang-btn-${l}`);
        if (btn) btn.className = `flex-1 py-1 text-xs rounded border transition ${l === currentLang ? active : inactive}`;
    });
}

// ── 選單 ──────────────────────────────────────────────────
function toggleMenu() {
    document.getElementById('header-menu-dropdown').classList.toggle('hidden');
}

function closeMenu() {
    document.getElementById('header-menu-dropdown').classList.add('hidden');
}

// 1. 初始化地圖 (中心點設在台南東門圓環：22.9895, 120.2122)
function initMap() {
    const centerLoc = [22.9871127557145, 120.21744023645061];
    map = L.map('map', { zoomControl: false }).setView(centerLoc, 15);
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors © CARTO'
    }).addTo(map);

    markersGroup = L.layerGroup().addTo(map);
    pubMarkersGroup = L.layerGroup().addTo(map);

    // 定位按鈕
    const LocateControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd() {
            const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control locate-btn');
            btn.innerHTML = '📍';
            btn.title = t('locate.title');
            L.DomEvent.disableClickPropagation(btn);
            L.DomEvent.on(btn, 'click', locateUser);
            return btn;
        }
    });
    new LocateControl().addTo(map);

    // 標記東門圓環中心點
    L.circleMarker(centerLoc, {
        radius: 8,
        fillColor: "#f59e0b",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map).bindPopup(`<b>${t('map.dongmen')}</b>`);
}

// 2. 使用 Fetch API 非同步讀取 data.json 與 order.json
function loadData() {
    Promise.all([
        fetch('data/data.json').then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
        fetch('data/order.json').then(r => r.json()).catch(() => null),
        fetch('data/pubs.json').then(r => r.json()).catch(() => []),
    ])
    .then(([data, order, pubsData]) => {
        if (order) {
            places = [...data].sort((a, b) => {
                const ia = order.indexOf(a.id);
                const ib = order.indexOf(b.id);
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            });
        } else {
            places = data;
        }
        pubs = pubsData;
        renderMarkers();
        renderPubMarkers();
        renderList();
    })
    .catch(error => {
        console.error('讀取店家資料失敗:', error);
        document.getElementById('restaurant-list').innerHTML = `
            <p class="text-xs text-red-400 p-4">${t('data.error')}</p>
        `;
    });
}

// 3. 在地圖上繪製所有店家的 Marker
function renderMarkers() {
    markersGroup.clearLayers();
    places.forEach(place => {
        const isSelected = selectedCart.some(item => item.id === place.id);
        const markerColor = isSelected ? '#f59e0b' : '#eca39d';

        const circle = L.circleMarker([place.lat, place.lng], {
            radius: 9,
            fillColor: markerColor,
            color: '#121212',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.95
        });

        circle.bindPopup(`
            <div class="text-zinc-900 p-1">
                <strong class="text-sm">${td(place, 'name')}</strong><br>
                <span class="text-xs text-amber-700 font-bold">[${td(place, 'type')}] ${t('card.dist')} ${place.dist} ${t('unit.meter')}</span>
            </div>
        `);

        circle.on('click', () => focusCard(place.id));
        markersGroup.addLayer(circle);
    });
}

// 4. 渲染 PUB 地圖標記
function renderPubMarkers() {
    pubMarkersGroup.clearLayers();
    pubs.forEach(pub => {
        const circle = L.circleMarker([pub.lat, pub.lng], {
            radius: 7.5,
            fillColor: '#9333ea',
            color: '#121212',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.95
        });
        circle.bindPopup(`
            <div class="text-zinc-900 p-1">
                <strong class="text-sm">${td(pub, 'name')}</strong><br>
                <span class="text-xs font-bold" style="color:#7e22ce">[${td(pub, 'type')}] ${t('card.dist')} ${pub.dist} ${t('unit.meter')}</span>
            </div>
        `);
        circle.on('click', () => focusCard(pub.id));
        pubMarkersGroup.addLayer(circle);
    });
}

// 5. 渲染左側餐廳清單 UI
function renderList() {
    const listContainer = document.getElementById('restaurant-list');
    listContainer.innerHTML = '';

    // 餐廳分隔區塊
    const restDivider = document.createElement('div');
    restDivider.id = 'section-restaurant';
    restDivider.className = 'px-4 py-2.5 bg-zinc-800/60 border border-zinc-600 rounded';
    restDivider.style.backgroundImage = 'linear-gradient(30deg, transparent 30%, rgba(82, 82, 91, .5) 70%)';
    restDivider.innerHTML = `<span class="text-xs text-zinc-400 font-medium tracking-widest">${t('section.restaurant')}</span>`;
    listContainer.appendChild(restDivider);

    places.forEach(place => {
        const isSelected = selectedCart.some(item => item.id === place.id);

        const card = document.createElement('div');
        card.id = `card-${place.id}`;
        card.className = `p-4 rounded border transition-all duration-200 cursor-pointer ${
            isSelected
            ? 'bg-zinc-900/80 border-amber-500/50 shadow-md shadow-amber-500/5'
            : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800'
        } ${focusedId === place.id ? 'card-focused' : ''}`;

        card.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                focusCard(place.id);
                map.panTo([place.lat, place.lng]);
                markersGroup.eachLayer(layer => {
                    if (layer.getLatLng().lat === place.lat && layer.getLatLng().lng === place.lng) {
                        layer.openPopup();
                    }
                });
            }
        };

        card.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div>
                    <span class="inline-block px-1.5 py-0.5 text-[10px] font-medium tracking-wider rounded bg-zinc-800 text-zinc-400 mb-1.5">${td(place, 'type')}</span>
                    <h3 class="text-sm font-medium text-zinc-200">${td(place, 'name')}</h3>
                    <p class="text-xs text-zinc-500 mt-0.5">${t('card.dist')} ${place.dist} ${t('unit.meter')} | ${place.addr}</p>
                </div>
                <button onclick="toggleCart(${place.id}); event.stopPropagation();"
                        class="text-xs px-2.5 py-1 rounded transition border whitespace-nowrap ${
                            isSelected
                            ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }">
                    ${isSelected ? t('card.added') : t('card.add')}
                </button>
                <button onclick="openPreview(${place.id}); event.stopPropagation();"
                        class="text-xs px-2.5 py-1 rounded transition border border-zinc-800 text-zinc-400 hover:bg-zinc-800 whitespace-nowrap">
                    ${t('card.preview')}
                </button>
                <a href="${place.gmap}" target="_blank" onclick="event.stopPropagation();"
                    class="text-xs px-2.5 py-1 rounded transition border border-zinc-800 text-zinc-400 hover:bg-zinc-800 whitespace-nowrap">
                    ${t('card.map')}
                </a>
            </div>
            <p class="text-xs text-zinc-400 mt-2 line-clamp-2 font-light leading-relaxed">${td(place, 'desc')}</p>
        `;
        listContainer.appendChild(card);
    });

    // PUB 區塊
    if (pubs.length > 0) {
        const divider = document.createElement('div');
        divider.id = 'section-pub';
        divider.className = 'mt-3 px-4 py-2.5 bg-zinc-800/60 border border-zinc-600 rounded';
        divider.style.backgroundImage = 'linear-gradient(30deg, transparent 30%, rgba(82, 82, 91, .5) 70%)';
        divider.innerHTML = `<span class="text-xs text-zinc-400 font-medium tracking-widest">${t('section.pub')}</span>`;
        listContainer.appendChild(divider);

        pubs.forEach(pub => {
            const isSelected = selectedCart.some(item => item.id === pub.id);

            const pubCard = document.createElement('div');
            pubCard.id = `card-${pub.id}`;
            pubCard.className = `p-4 rounded border transition-all duration-200 cursor-pointer ${
                isSelected
                ? 'bg-zinc-900/80 border-amber-500/50 shadow-md shadow-amber-500/5'
                : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800'
            } ${focusedId === pub.id ? 'card-focused' : ''}`;

            pubCard.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
                    focusCard(pub.id);
                    map.panTo([pub.lat, pub.lng]);
                    pubMarkersGroup.eachLayer(layer => {
                        if (layer.getLatLng().lat === pub.lat && layer.getLatLng().lng === pub.lng) {
                            layer.openPopup();
                        }
                    });
                }
            };

            pubCard.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <div>
                        <span class="inline-block px-1.5 py-0.5 text-[10px] font-medium tracking-wider rounded bg-purple-900/30 text-purple-300 border border-purple-800/40 mb-1.5">${td(pub, 'type')}</span>
                        <h3 class="text-sm font-medium text-zinc-200">${td(pub, 'name')}</h3>
                        <p class="text-xs text-zinc-500 mt-0.5">${t('card.dist')} ${pub.dist} ${t('unit.meter')} | ${pub.addr}</p>
                    </div>
                    <button onclick="toggleCart(${pub.id}); event.stopPropagation();"
                            class="text-xs px-2.5 py-1 rounded transition border whitespace-nowrap ${
                                isSelected
                                ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                            }">
                        ${isSelected ? t('card.added') : t('card.add')}
                    </button>
                    <button onclick="openPreview(${pub.id}); event.stopPropagation();"
                            class="text-xs px-2.5 py-1 rounded transition border border-zinc-800 text-zinc-400 hover:bg-zinc-800 whitespace-nowrap">
                        ${t('card.preview')}
                    </button>
                    <a href="${pub.gmap}" target="_blank" onclick="event.stopPropagation();"
                        class="text-xs px-2.5 py-1 rounded transition border border-zinc-800 text-zinc-400 hover:bg-zinc-800 whitespace-nowrap">
                        ${t('card.map')}
                    </a>
                </div>
                <p class="text-xs text-zinc-400 mt-2 line-clamp-2 font-light leading-relaxed">${td(pub, 'desc')}</p>
            `;
            listContainer.appendChild(pubCard);
        });
    }
}

// 6. 控制行程購物車的加入與刪除
function toggleCart(id) {
    const place = places.find(p => p.id === id) || pubs.find(p => p.id === id);
    const index = selectedCart.findIndex(item => item.id === id);

    if (index > -1) {
        selectedCart.splice(index, 1);
    } else {
        if (selectedCart.length >= 3) {
            alert(t('cart.full'));
            return;
        }
        selectedCart.push(place);
    }

    updateCartUI();
    renderList();
    renderMarkers();
}

// 7. 清空購物車
function clearCart() {
    selectedCart = [];
    updateCartUI();
    renderList();
    renderMarkers();
}

// 8. 更新底部購物車區塊的 UI
function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items');
    const routeBtn = document.getElementById('route-btn');
    if (!cartItemsContainer || !routeBtn) return;

    if (countEl) countEl.innerText = selectedCart.length;

    if (selectedCart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="text-zinc-600 self-center">${t('cart.empty')}</p>`;
        routeBtn.disabled = true;
        routeBtn.className = "w-full py-3 rounded bg-zinc-800 text-zinc-500 font-medium tracking-wide text-sm cursor-not-allowed";
        routeBtn.innerText = t('cart.route.disabled0');
    } else {
        cartItemsContainer.innerHTML = selectedCart.map(item => `
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                ${td(item, 'name')}
                <span onclick="toggleCart(${item.id})" class="text-zinc-500 hover:text-zinc-300 cursor-pointer font-bold ml-1">×</span>
            </span>
        `).join('');

        if (selectedCart.length >= 2) {
            routeBtn.disabled = false;
            routeBtn.className = "w-full py-3 rounded bg-amber-500 text-zinc-950 font-semibold tracking-widest text-sm hover:bg-amber-400 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-amber-500/10";
            routeBtn.innerText = t('cart.route.go');
        } else {
            routeBtn.disabled = true;
            routeBtn.className = "w-full py-3 rounded bg-zinc-800 text-zinc-500 font-medium tracking-wide text-sm cursor-not-allowed";
            routeBtn.innerText = t('cart.route.disabled1');
        }
    }
}

// 9. 核心邏輯：動態拼裝 Google Maps Universal URL 並開啟導航
function generateRoute() {
    if (selectedCart.length < 2) return;

    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    const origin = encodeURIComponent(selectedCart[0].addr);
    const destination = encodeURIComponent(selectedCart[selectedCart.length - 1].addr);

    let waypointsParam = "";
    if (selectedCart.length === 3) {
        waypointsParam = `&waypoints=${encodeURIComponent(selectedCart[1].addr)}`;
    }

    window.open(`${baseUrl}&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=walking`, '_blank');
}

// 10. 店家卡片 focus
function focusCard(id) {
    if (focusedId !== null) {
        const prev = document.getElementById(`card-${focusedId}`);
        if (prev) prev.classList.remove('card-focused');
    }
    focusedId = id;
    const card = document.getElementById(`card-${id}`);
    if (card) {
        card.classList.add('card-focused');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 11. 使用者定位
function locateUser() {
    if (!navigator.geolocation) {
        alert(t('locate.unsupported'));
        return;
    }
    navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
            const latlng = [coords.latitude, coords.longitude];
            if (userMarker) map.removeLayer(userMarker);

            const icon = L.divIcon({
                className: '',
                html: '<div class="user-location-dot"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -10]
            });

            userMarker = L.marker(latlng, { icon })
                .addTo(map)
                .bindPopup(`<b>${t('locate.here')}</b>`);

            map.setView(latlng, 16);
            userMarker.openPopup();
        },
        () => {
            alert(t('locate.error'));
        }
    );
}

// 12. 店家介紹（NanoBox）
function openMap(title, url) {
    if (!url) return;
    NanoBox.open(url, { title });
}

// 13. Preview Offcanvas
let carouselIndex = 0;
let carouselTotal = 0;

function openPreview(id) {
    const place = places.find(p => p.id === id) || pubs.find(p => p.id === id);
    if (!place) return;

    // 標題 & 描述
    document.getElementById('preview-title').textContent = td(place, 'name');
    document.getElementById('preview-desc').textContent = td(place, 'desc') || '';

    // 標籤列
    const tagsEl = document.getElementById('preview-tags');
    tagsEl.innerHTML = (td(place, 'tags') || []).map(tag =>
        `<span class="px-2 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400 border border-zinc-700">${tag}</span>`
    ).join('');

    // 基本資訊
    const metaEl = document.getElementById('preview-meta');
    const dot = `<span class="mx-1.5 text-zinc-700">·</span>`;
    const distText = place.dist ? t('preview.dist').replace('{n}', place.dist) : null;
    const row1 = [
        place.rating && `<span>⭐ ${place.rating}${t('preview.rating.suffix')}</span>`,
        place.price  && `<span>💰 ${place.price}</span>`,
        distText     && `<span>📏 ${distText}</span>`,
    ].filter(Boolean).join(dot);
    const row2 = [
        place.addr  && `<span>📍 ${place.addr}</span>`,
        place.phone && `<span>📞 ${place.phone}</span>`,
    ].filter(Boolean).join(dot);
    metaEl.innerHTML = [
        row1 && `<div class="flex flex-wrap items-center">${row1}</div>`,
        row2 && `<div class="flex flex-wrap items-center">${row2}</div>`,
    ].filter(Boolean).join('');

    // 招牌料理 / 招牌酒款
    const isPub = !!place.drinks;
    const items = td(place, isPub ? 'drinks' : 'foods') || [];
    const foodsBlock = document.getElementById('preview-foods-block');
    if (items.length > 0) {
        document.getElementById('preview-items-label').textContent = isPub ? t('preview.drinks') : t('preview.foods');
        const itemStyle = isPub
            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        document.getElementById('preview-foods').innerHTML = items.map(f =>
            `<span class="px-2 py-0.5 text-[10px] rounded ${itemStyle}">${f}</span>`
        ).join('');
        foodsBlock.classList.remove('hidden');
    } else {
        foodsBlock.classList.add('hidden');
    }

    // 照片輪播
    const images = place.images || [];
    carouselIndex = 0;
    carouselTotal = images.length;

    const track = document.getElementById('carousel-track');
    track.innerHTML = images.map(img =>
        `<img src="${img.src}" alt="${img.type}" onerror="this.src='https://placehold.co/480x260/27272a/52525b?text=No+Image'">`
    ).join('');
    track.style.transform = 'translateX(0)';

    const dotsEl = document.getElementById('carousel-dots');
    dotsEl.innerHTML = images.map((_, i) =>
        `<div class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="carouselGoTo(${i})"></div>`
    ).join('');

    const noImage = images.length === 0;
    document.getElementById('carousel-prev').style.display = noImage ? 'none' : '';
    document.getElementById('carousel-next').style.display = noImage ? 'none' : '';
    if (noImage) {
        track.innerHTML = `<div class="w-full h-[260px] flex items-center justify-center text-zinc-600 text-sm">${t('preview.noPhoto')}</div>`;
    }

    document.getElementById('preview-panel').classList.add('open');
    document.getElementById('preview-backdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closePreview() {
    document.getElementById('preview-panel').classList.remove('open');
    document.getElementById('preview-backdrop').classList.remove('open');
    document.body.style.overflow = '';
}

function carouselMove(dir) {
    carouselGoTo((carouselIndex + dir + carouselTotal) % carouselTotal);
}

function carouselGoTo(index) {
    carouselIndex = index;
    document.getElementById('carousel-track').style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// 快速捲動至指定區塊
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 推薦表單
function openForm() {
    document.getElementById('storeRequestForm').classList.remove('hidden');
    document.getElementById('form-success').classList.add('hidden');
    document.getElementById('form-error').classList.add('hidden');
    document.getElementById('form-panel').classList.add('open');
    document.getElementById('form-backdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeForm() {
    document.getElementById('form-panel').classList.remove('open');
    document.getElementById('form-backdrop').classList.remove('open');
    document.body.style.overflow = '';
}

// ── 初始化 ────────────────────────────────────────────────
window.onload = async () => {
    const savedLang = localStorage.getItem('lang') || 'zh';
    await loadLang(savedLang);
    initMap();
    loadData();

    // 點選單外部自動關閉
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('header-menu');
        if (menu && !menu.contains(e.target)) closeMenu();
    });

    document.getElementById('storeRequestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        try {
            await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData).toString(),
            });
            form.classList.add('hidden');
            document.getElementById('form-error').classList.add('hidden');
            document.getElementById('form-success').classList.remove('hidden');
            form.reset();
        } catch (err) {
            document.getElementById('form-error').classList.remove('hidden');
        }
    });
};
