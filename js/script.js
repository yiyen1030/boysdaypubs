let places = [];        // 儲存從 json 讀取進來的資料
let pubs = [];          // 儲存 PUB 資料
let selectedCart = [];  // 儲存選中店家的 Array (最多3間)
let map, markersGroup, pubMarkersGroup;
let userMarker = null;
let focusedId = null;

// 1. 初始化地圖 (中心點設在台南東門圓環：22.9895, 120.2122)
function initMap() {
    const centerLoc = [22.9871127557145, 120.21744023645061];
    map = L.map('map', { zoomControl: false }).setView(centerLoc, 15);
    L.control.zoom({ position: 'topright' }).addTo(map);

    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //     attribution: '© OpenStreetMap contributors'
    // }).addTo(map);
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
            btn.title = '定位我的位置';
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
    }).addTo(map).bindPopup("<b>臺灣府城-東門城</b>");
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
            <p class="text-xs text-red-400 p-4">⚠️ 無法載入店家資料，請檢查 data/data.json 格式是否正確。</p>
        `;
    });
}

// 3. 在地圖上繪製所有店家的 Marker
function renderMarkers() {
    markersGroup.clearLayers();
    places.forEach(place => {
        const isSelected = selectedCart.some(item => item.id === place.id);
        
        // 既然底圖沒有套用反轉濾鏡，我們直接使用你指定的正確顏色：
        // 1. 選中時：維持亮眼的琥珀橘 (#f59e0b)
        // 2. 預設推薦點：直接使用你最想要的溫柔粉紅色 (#eca39d)
        const markerColor = isSelected ? '#f59e0b' : '#eca39d';

        // 使用 L.circleMarker (SVG 渲染)，並將半徑放大到 9
        // 這樣不僅視覺上更清晰、好點擊，還能完美遮蓋住底圖上原本內建的十字符號！
        const circle = L.circleMarker([place.lat, place.lng], {
            radius: 9,           // 放大半徑，完美遮罩底圖雜訊
            fillColor: markerColor,
            color: '#121212',    // 深色邊框，讓粉紅圓點立體感更強
            weight: 2,
            opacity: 1,
            fillOpacity: 0.95    // 提高不透明度，確保底圖的 + 號不會透出來
        });

        // 將彈出視窗直接綁定在圓圈上
        circle.bindPopup(`
            <div class="text-zinc-900 p-1">
                <strong class="text-sm">${place.name}</strong><br>
                <span class="text-xs text-amber-700 font-bold">[${place.type}] 距離圓環 ${place.dist}</span>
            </div>
        `);

        circle.on('click', () => focusCard(place.id));

        // 將乾淨的圓點加入圖層
        markersGroup.addLayer(circle);
    });
}

// 4. 渲染 PUB 地圖標記（菱形紫色）
function renderPubMarkers() {
    pubMarkersGroup.clearLayers();
    pubs.forEach(pub => {
        const icon = L.divIcon({
            className: '',
            html: '<div class="pub-marker-dot"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
            popupAnchor: [0, -9]
        });
        const marker = L.marker([pub.lat, pub.lng], { icon });
        marker.bindPopup(`
            <div class="text-zinc-900 p-1">
                <strong class="text-sm">${pub.name}</strong><br>
                <span class="text-xs font-bold" style="color:#7e22ce">[${pub.type}] 距離圓環 ${pub.dist} 公尺</span>
            </div>
        `);
        marker.on('click', () => focusCard(pub.id));
        pubMarkersGroup.addLayer(marker);
    });
}

// 5. 渲染左側餐廳清單 UI
function renderList() {
    const listContainer = document.getElementById('restaurant-list');
    listContainer.innerHTML = '';

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
            if(e.target.tagName !== 'BUTTON') {
                focusCard(place.id);
                map.panTo([place.lat, place.lng]);
                markersGroup.eachLayer(layer => {
                    if(layer.getLatLng().lat === place.lat && layer.getLatLng().lng === place.lng) {
                        layer.openPopup();
                    }
                });
            }
        };

        card.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div>
                    <span class="inline-block px-1.5 py-0.5 text-[10px] font-medium tracking-wider rounded bg-zinc-800 text-zinc-400 mb-1.5">${place.type}</span>
                    <h3 class="text-sm font-medium text-zinc-200">${place.name}</h3>
                    <p class="text-xs text-zinc-500 mt-0.5">距離圓環：${place.dist} | ${place.addr}</p>
                </div>
                <button onclick="toggleCart(${place.id}); event.stopPropagation();"
                        class="text-xs px-2.5 py-1 rounded transition border whitespace-nowrap ${
                            isSelected
                            ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }">
                    ${isSelected ? '✓ 已加入' : '+ 行程'}
                </button>
                <button onclick="openPreview(${place.id}); event.stopPropagation();"
                        class="text-xs px-2.5 py-1 rounded transition border border-zinc-800 text-zinc-400 hover:bg-zinc-800 whitespace-nowrap">
                    👁 預覽
                </button>
                <a href="${place.gmap}" target="_blank" onclick="event.stopPropagation();"
                    class="text-xs px-2.5 py-1 rounded transition border border-zinc-800 text-zinc-400 hover:bg-zinc-800 whitespace-nowrap">
                    🗺 地圖
                </a>
            </div>
            <p class="text-xs text-zinc-400 mt-2 line-clamp-2 font-light leading-relaxed">${place.desc}</p>
        `;
        listContainer.appendChild(card);
    });

    // PUB 區塊
    if (pubs.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'pt-3 pb-1';
        divider.innerHTML = `
            <div class="flex items-center gap-2 px-1">
                <div class="flex-1 h-px bg-zinc-800"></div>
                <span class="text-[10px] text-zinc-500 tracking-widest font-medium">🍺 PUB 酒吧</span>
                <div class="flex-1 h-px bg-zinc-800"></div>
            </div>
        `;
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
                        <span class="inline-block px-1.5 py-0.5 text-[10px] font-medium tracking-wider rounded bg-purple-900/30 text-purple-300 border border-purple-800/40 mb-1.5">${pub.type}</span>
                        <h3 class="text-sm font-medium text-zinc-200">${pub.name}</h3>
                        <p class="text-xs text-zinc-500 mt-0.5">距離圓環：${pub.dist} 公尺 | ${pub.addr}</p>
                    </div>
                    <button onclick="toggleCart(${pub.id}); event.stopPropagation();"
                            class="text-xs px-2.5 py-1 rounded transition border whitespace-nowrap ${
                                isSelected
                                ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                            }">
                        ${isSelected ? '✓ 已加入' : '+ 行程'}
                    </button>
                    <button onclick="openPreview(${pub.id}); event.stopPropagation();"
                            class="text-xs px-2.5 py-1 rounded transition border border-zinc-800 text-zinc-400 hover:bg-zinc-800 whitespace-nowrap">
                        👁 預覽
                    </button>
                    <a href="${pub.gmap}" target="_blank" onclick="event.stopPropagation();"
                        class="text-xs px-2.5 py-1 rounded transition border border-zinc-800 text-zinc-400 hover:bg-zinc-800 whitespace-nowrap">
                        🗺 地圖
                    </a>
                </div>
                <p class="text-xs text-zinc-400 mt-2 line-clamp-2 font-light leading-relaxed">${pub.desc}</p>
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
            alert("為了維持微醺散步的品質，一晚建議安排 2-3 間店就好囉！");
            return;
        }
        selectedCart.push(place);
    }

    updateCartUI();
    renderList();
    renderMarkers();
}

// 6. 清空購物車
function clearCart() {
    selectedCart = [];
    updateCartUI();
    renderList();
    renderMarkers();
}

// 7. 更新底部購物車區塊的 UI
function updateCartUI() {
    document.getElementById('cart-count').innerText = selectedCart.length;
    const cartItemsContainer = document.getElementById('cart-items');
    const routeBtn = document.getElementById('route-btn');

    if (selectedCart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="text-zinc-600 self-center">尚未選擇店家，請從上方列表中加入...</p>`;
        routeBtn.disabled = true;
        routeBtn.className = "w-full py-3 rounded bg-zinc-800 text-zinc-500 font-medium tracking-wide text-sm cursor-not-allowed";
        routeBtn.innerText = "請先選擇 2-3 間餐廳";
    } else {
        cartItemsContainer.innerHTML = selectedCart.map(item => `
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                ${item.name}
                <span onclick="toggleCart(${item.id})" class="text-zinc-500 hover:text-zinc-300 cursor-pointer font-bold ml-1">×</span>
            </span>
        `).join('');

        if (selectedCart.length >= 2) {
            routeBtn.disabled = false;
            routeBtn.className = "w-full py-3 rounded bg-amber-500 text-zinc-950 font-semibold tracking-widest text-sm hover:bg-amber-400 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-amber-500/10";
            routeBtn.innerText = "⚡ 產生今晚微醺路線 (開啟 Google Maps)";
        } else {
            routeBtn.disabled = true;
            routeBtn.className = "w-full py-3 rounded bg-zinc-800 text-zinc-500 font-medium tracking-wide text-sm cursor-not-allowed";
            routeBtn.innerText = "請再選擇 1 間店家";
        }
    }
}

// 8. 核心邏輯：動態拼裝 Google Maps Universal URL 並開啟導航
function generateRoute() {
    if (selectedCart.length < 2) return;

    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    const origin = encodeURIComponent(selectedCart[0].addr);
    const destination = encodeURIComponent(selectedCart[selectedCart.length - 1].addr);
    
    let waypointsParam = "";
    if (selectedCart.length === 3) {
        waypointsParam = `&waypoints=${encodeURIComponent(selectedCart[1].addr)}`;
    }

    const travelMode = "&travelmode=walking";
    const finalMapUrl = `${baseUrl}&origin=${origin}&destination=${destination}${waypointsParam}${travelMode}`;

    window.open(finalMapUrl, '_blank');
}

// 9. 店家卡片 focus
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

// 10. 使用者定位
function locateUser() {
    if (!navigator.geolocation) {
        alert('您的瀏覽器不支援定位功能');
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
                .bindPopup('<b>📍 你在這裡</b>');

            map.setView(latlng, 16);
            userMarker.openPopup();
        },
        () => {
            alert('無法取得位置，請確認已允許定位權限。');
        }
    );
}

// 10. 店家介紹
function openMap(title,url) {
    if (!url) return;
    NanoBox.open(url, {
        title: title,
    });
}

// 10. Preview Offcanvas
let carouselIndex = 0;
let carouselTotal = 0;

function openPreview(id) {
    const place = places.find(p => p.id === id) || pubs.find(p => p.id === id);
    if (!place) return;

    // 標題
    document.getElementById('preview-title').textContent = place.name;

    // 描述
    document.getElementById('preview-desc').textContent = place.desc || '';

    // 標籤
    const tagsEl = document.getElementById('preview-tags');
    tagsEl.innerHTML = (place.tags || []).map(tag =>
        `<span class="px-2 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400 border border-zinc-700">${tag}</span>`
    ).join('');

    // 基本資訊
    const metaEl = document.getElementById('preview-meta');
    const dot = `<span class="mx-1.5 text-zinc-700">·</span>`;
    const row1 = [
        place.rating && `<span>⭐ ${place.rating} 分</span>`,
        place.price  && `<span>💰 ${place.price}</span>`,
        place.dist   && `<span>📏 距東門城 ${place.dist} 公尺</span>`,
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
    const items = place.foods || place.drinks || [];
    const isPub = !!place.drinks;
    const foodsBlock = document.getElementById('preview-foods-block');
    if (items.length > 0) {
        document.getElementById('preview-items-label').textContent = isPub ? '招牌酒款' : '招牌料理';
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
    const images = (place.images || []);
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
        track.innerHTML = `<div class="w-full h-[260px] flex items-center justify-center text-zinc-600 text-sm">尚無照片</div>`;
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

// 網頁載入完成後依序初始化地圖、抓取資料
window.onload = () => {
    initMap();
    loadData();
};