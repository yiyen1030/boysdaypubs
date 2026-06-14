# Boys Day Pubs 🍻

一個專為 **Boys Day** 打造的台南精選酒吧互動地圖網頁。以**台南東區東門城（迎春門）**為中心，彙整周圍半徑 **2 公里內**的推薦店家，方便使用者快速查詢店家資訊並規劃微醺路線。

## 📍 專案核心與範圍
* **中心起點**：台南東門城（台南市東區東門路一段）
* **搜尋範圍**：周圍 2 公里內（涵蓋台南東區、部分中西區與北區）
* **主要功能**：店家資訊呈現、Google Maps 位置標記、地圖分享、路線規劃輔助、店家預覽 Offcanvas

---

## 🛠️ 技術棧
本專案採用純前端架構開發，具備輕量、快速部署的優點：
* **HTML5** - 網頁基本結構與 UI 框架
* **CSS3** - 介面視覺設計、排版樣式與 Offcanvas 動畫
* **JavaScript (ES6+)** - 地圖核心邏輯、資料讀取、互動功能與輪播控制
* **Tailwind CSS (CDN)** - 工具類樣式框架
* **Leaflet.js** - 輕量開源地圖套件（取代 Google Maps API）
* **dakenanobox** - 自訂燈箱套件

---

## 📁 目錄結構
```text
├── css/                 # 網頁樣式表 (CSS)
├── data/                # 店家資料庫 (data.json)
├── images/              # 店家照片 (依 slug 分資料夾)
│   └── restaurants/
│       └── {slug}/      # 01.jpg, 02.jpg, 03.jpg ...
├── js/                  # 前端核心邏輯
├── plugin/dakenanobox/  # 燈箱套件
└── index.html           # 網站主入口
```

---

## ✨ 功能說明

### 店家列表
* 從 `data/data.json` 動態載入所有店家
* 點擊卡片會將地圖移動至該店家並開啟 Popup

### 行程購物車
* 點擊 **+ 行程** 將店家加入今晚行程（最多 3 間）
* 選擇 2 間以上後可產生 Google Maps 步行路線

### 👁 店家預覽（Offcanvas）
* 點擊 **👁 預覽** 從右側滑入預覽面板
* **上方**：照片輪播（支援左右切換、圓點指示）
* **下方**：標籤、地址／電話／評分／價位、描述、招牌料理
* 點擊背景遮罩或 ✕ 關閉

### 🗺 地圖
* 點擊 **🗺 地圖** 直接開啟 Google Maps 導航連結

---

## 📊 店家資料格式 (data.json 規範)

| 欄位名 | 型態 | 說明 | 範例 |
| :--- | :--- | :--- | :--- |
| `id` | Number | 店家不重複編號 | `1` |
| `slug` | String | 網頁網址/圖片路徑代稱 | `"three-barbecue"` |
| `name` | String | 店家名稱 | `"3號燒烤美食"` |
| `type` | String | 店家分類標籤 | `"串燒居酒屋"` |
| `dist` | Number | 距離東門城的實際距離 (公尺) | `950` |
| `addr` | String | 店家完整地址 | `"台南市東區長榮路二段3號"` |
| `phone` | String | 聯絡電話 | `"06-200-6521"` |
| `lat` / `lng` | Number | Google 地圖精確經緯度 | `22.9872`, `120.2187` |
| `gmap` | String | Google Maps 導航連結 | `"https://maps.app.goo.gl/..."` |
| `rating` | Number | Google 地圖評分 | `4.9` |
| `price` | String | 消費價位區間 ($ ~ $$$) | `"$$"` |
| `groupSize` | Array | 適合的聚會人數區間 | `[3, 4, 5, 6, 7, 8]` |
| `foods` | Array | 招牌料理清單 | `["串燒", "宵夜"]` |
| `tags` | Array | 搜尋標籤 | `["居酒屋", "可訂位"]` |
| `desc` | String | 店家簡介 | `"..."` |
| `images` | Array | 照片列表（含 src 與 type） | `[{"src": "...", "type": "cover"}]` |
| `beer` | Boolean | 是否提供啤酒 | `true` |
| `lateNight` | Boolean | 是否為宵夜場 | `true` |
| `reservation` | Boolean | 是否可訂位 | `true` |
