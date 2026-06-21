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
├── data/
│   ├── data.json       # 餐廳資料（id 1–14）
│   ├── pubs.json       # PUB 酒吧資料（id 101 起）
│   └── order.json      # 餐廳顯示排序（id 陣列）
├── plugin/dakenanobox/ # 燈箱套件
└── favicon.ico
```

---

## 資料慣例

### 餐廳（data.json）
- id：1 起連續編號，目前最大為 **14**
- 新增餐廳後，需同步在 `order.json` 加入該 id

### PUB（pubs.json）
- id：**101 起**，與餐廳分開區段
- 欄位用 `drinks`（招牌酒款），餐廳用 `foods`（招牌料理）

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
