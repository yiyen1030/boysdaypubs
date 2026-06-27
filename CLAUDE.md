# CLAUDE.md — Boys Day Pubs 專案說明

## 專案概述

台南東門城深夜微醺互動地圖，純前端靜態網站，部署於 Netlify。  
網址：`https://boysdaypubs.netlify.app`

---

## 技術棧

- **HTML5 / CSS3 / Vanilla JS (ES6+)**
- **Tailwind CSS (CDN)** — 注意：class specificity（0,1,0）高於元素選擇器（0,0,1），自訂 CSS 若需覆蓋 Tailwind 請加 `!important`
- **Leaflet.js** — 地圖，CARTO Voyager 底圖（暗色調）
- **Netlify Forms** — 表單收集，AJAX 送出，不跳頁
- **dakenanobox** — 燈箱套件（`plugin/dakenanobox/`）

---

## 檔案結構

```
├── index.html          # 主入口，HTML 結構與 Offcanvas panels
├── css/main.css        # 自訂樣式（Tailwind 無法做到的部分）
├── js/script.js        # 全部互動邏輯
├── lang/
│   ├── zh.json         # 中文 UI 字串（預設語系）
│   └── de.json         # 德文 UI 字串
├── data/
│   ├── data.json       # 餐廳資料（id 1–14），含 _de 欄位
│   ├── pubs.json       # PUB 酒吧資料（id 101 起），含 _de 欄位
│   └── order.json      # 餐廳顯示排序（id 陣列）
├── plugin/dakenanobox/ # 燈箱套件
└── favicon.ico
```

---

## 多語系（i18n）

### 語系切換機制
- 預設語系：**中文（zh）**
- 支援語系：中文、德文（de）
- 語言偏好儲存於 `localStorage`（key: `lang`）
- 切換入口：Header 右側 ☰ 選單按鈕 → 底部語言區塊

### UI 字串翻譯
- 靜態元素用 `data-i18n="key"` 屬性標記
- `t(key)` 函式：從 `langData` 物件讀取對應字串
- `applyLang()` 函式：更新所有 `[data-i18n]` 元素，並重新 render 列表／標記／購物車
- `loadLang(lang)` async 函式：fetch `lang/{lang}.json`，存入 `langData`，呼叫 `applyLang()`
- `window.onload` 為 `async`，先 `await loadLang()` 再執行 `initMap()` 和 `loadData()`

### 資料內容翻譯
- 各 JSON 欄位加上對應 `_de` 版本：`name_de`、`type_de`、`desc_de`、`foods_de`（或 `drinks_de`）、`tags_de`
- `td(item, field)` 函式：若 `currentLang !== 'zh'` 且 `field_de` 存在，回傳 `_de` 版；否則回傳原欄位
- 地址（`addr`）不翻譯，中文即通用

### lang JSON 鍵值說明（共 44 個 key）
重要範例：
- `"preview.dist": "{n} m vom Dongmen-Tor"` — 使用 `replace('{n}', place.dist)` 替換
- `"cart.route.go"` — 路線按鈕啟用時的文字
- `"unit.meter"` — 距離單位（中文「公尺」/ 德文「m」）

---

## Header 選單按鈕

原先三個獨立按鈕（🍖、🍺、＋）合併為單一 ☰ 漢堡選單，避免標題斷行。

### HTML 結構
```html
<div class="relative flex-shrink-0" id="header-menu">
  <button id="header-menu-btn" onclick="toggleMenu()">
    <!-- 漢堡圖示：三條不等長橫線，靠左對齊 -->
    <div class="flex flex-col gap-[3.5px] items-start">
      <div class="w-[14px] h-[1.5px] bg-current rounded-full"></div>
      <div class="w-4   h-[1.5px] bg-current rounded-full"></div>
      <div class="w-3   h-[1.5px] bg-current rounded-full"></div>
    </div>
  </button>
  <div id="header-menu-dropdown" class="hidden absolute right-0 top-10 ...">
    <!-- 餐廳區 / PUB區 / 推薦新店家 / 語言切換 -->
  </div>
</div>
```

### 選單互動
- `toggleMenu()` — 切換 dropdown `hidden` class
- `closeMenu()` — 關閉 dropdown
- 外部點擊自動關閉：`document.addEventListener('click', e => { if (!menu.contains(e.target)) closeMenu() })`
- 每個選單項目的 icon `<span>` 加 `inline-flex w-5 justify-center` 確保對齊

---

## 資料慣例

### 餐廳（data.json）
- id：1 起連續編號，目前最大為 **14**
- 新增餐廳後，需同步在 `order.json` 加入該 id
- 各項目含 `name_de`、`type_de`、`desc_de`、`foods_de`、`tags_de` 德文欄位

### PUB（pubs.json）
- id：**101 起**，與餐廳分開區段
- 欄位用 `drinks` / `drinks_de`（招牌酒款），餐廳用 `foods` / `foods_de`（招牌料理）

### order.json
- 只控制餐廳顯示順序，PUB 固定排在餐廳後面
- 格式：`[7, 1, 2, 5, 6, 3, 4, 8, 9, 10, 11, 12, 13, 14]`

### 圖片 URL
- 來源為 Google Maps，統一使用 `=s1200-k-no` 參數取大圖

---

## 地圖標記顏色

| 類型 | 顏色 | 說明 |
|------|------|------|
| 餐廳（預設）| 粉紅 `#eca39d` | circleMarker radius 9 |
| 餐廳（選入行程）| 琥珀 `#f59e0b` | 同上，選中後變色 |
| PUB | 紫色 `#9333ea` | circleMarker radius 7.5 |
| 使用者定位 | 藍色 `#3b82f6` | divIcon + pulse 動畫 |
| 東門城中心點 | 琥珀 `#f59e0b` | 固定標記 |

---

## 主要 JS 函式

| 函式 | 說明 |
|------|------|
| `initMap()` | 初始化 Leaflet 地圖、控制項、東門城標記 |
| `loadData()` | Promise.all 讀取三個 JSON，排序後呼叫 render |
| `renderMarkers()` | 繪製餐廳圓點 |
| `renderPubMarkers()` | 繪製 PUB 圓點 |
| `renderList()` | 渲染左側列表（含兩個分隔區塊） |
| `focusCard(id)` | 高亮左側卡片（藍色左邊框） |
| `toggleCart(id)` | 加入／移除行程購物車 |
| `openPreview(id)` | 開啟右側店家預覽 Offcanvas |
| `openForm()` | 開啟推薦新店家表單 Offcanvas |
| `scrollToSection(id)` | 捲動列表至指定分隔區塊 |
| `locateUser()` | 瀏覽器 Geolocation 定位 |
| `loadLang(lang)` | fetch 語系 JSON，存入 langData，呼叫 applyLang |
| `applyLang()` | 更新所有 data-i18n 元素，重新 render 動態內容 |
| `t(key)` | 讀取 langData 中的 UI 字串 |
| `td(item, field)` | 讀取資料欄位（自動選擇 _de 版本） |
| `setLang(lang)` | 切換語系並儲存至 localStorage |
| `toggleMenu()` | 開關漢堡選單 dropdown |

---

## CSS 注意事項

- `#preview-panel` / `#form-panel`：右側 Offcanvas，`.open` class 控制顯示
- `.card-focused`：藍色左邊框高亮，用 `!important` 覆蓋 Tailwind border
- 手機版 Header top padding 用 `!important` 覆蓋 Tailwind `.py-5`，搭配 `env(safe-area-inset-top)` 讓開 iOS 狀態列
- `meta viewport` 已加 `viewport-fit=cover`，safe area 變數才有作用

---

## 部署

- 平台：Netlify，`main` 分支推送後自動部署
- Netlify Forms 已在 `index.html` 的 `<form>` 上設定 `data-netlify="true"`
- 表單送出使用 AJAX（fetch POST 到 `/`），成功後原地顯示感謝訊息
