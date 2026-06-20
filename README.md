# Boys Day Pubs

專為 **Boys Day** 打造的台南深夜微醺互動地圖。以**台南東門城（迎春門）**為中心，整合周邊推薦餐廳與 PUB 酒吧，方便規劃今晚的微醺路線。

---

## 技術棧

純前端靜態架構，無需後端與 API Key：

- **HTML5 / CSS3 / JavaScript (ES6+)**
- **Tailwind CSS (CDN)** — 工具類樣式框架
- **Leaflet.js** — 開源地圖套件
- **dakenanobox** — 自訂燈箱套件

---

## 目錄結構

```
├── css/
│   └── main.css            # 自訂樣式（地圖濾鏡、Offcanvas、輪播、標記、focus 效果）
├── data/
│   ├── data.json           # 餐廳資料（13 間）
│   ├── pubs.json           # PUB 酒吧資料（8 間）
│   └── order.json          # 自訂顯示排序（id 陣列，僅控制餐廳順序）
├── js/
│   └── script.js           # 全部互動邏輯
├── plugin/dakenanobox/     # 燈箱套件
├── favicon.ico
└── index.html              # 主入口
```

---

## 功能說明

### 地圖
- 底圖使用 CARTO Voyager（暗色調）
- 中心點標記：台南東門城（22.9871, 120.2174）
- **粉紅圓點** — 推薦餐廳；選入行程後轉為**琥珀色**
- **紫色圓點** — PUB 酒吧（較小尺寸以作區隔）
- **藍色脈衝點** — 使用者目前位置（點擊右上角 📍 按鈕觸發，需瀏覽器定位權限）

### 左側列表
- 從 `data.json` 與 `pubs.json` 動態載入
- 餐廳依 `order.json` 排序；PUB 排列於餐廳區塊之後，以漸層樣式區塊分隔
- 點擊卡片 → 地圖移動至該店並開啟 Popup，卡片出現藍色左邊框高亮
- 點擊地圖標記 → 左側對應卡片自動捲動並高亮
- 餐廳顯示琥珀色分類標籤；PUB 顯示紫色分類標籤

### 行程購物車
- 點擊 **+ 行程** 將餐廳或 PUB 加入今晚行程（上限 3 間）
- 選擇 2 間以上即可產生 Google Maps 步行路線（新分頁開啟）
- 支援混合規劃（例如 2 間餐廳 + 1 間 PUB）

### 店家預覽（Offcanvas）
- 點擊 **👁 預覽** 從右側滑入面板，點擊遮罩或 ✕ 關閉
- 上方：照片輪播（左右切換 + 圓點指示）
- 下方：標籤、描述、招牌料理（餐廳）或招牌酒款（PUB）、基本資訊（評分／價位／距離／地址／電話）

---

## 資料格式

### data.json（餐廳）

| 欄位 | 型態 | 說明 |
| :--- | :--- | :--- |
| `id` | Number | 唯一編號（1–13） |
| `slug` | String | 路徑代稱 |
| `name` | String | 店家名稱 |
| `type` | String | 分類標籤 |
| `dist` | Number | 距東門城距離（公尺） |
| `addr` | String | 完整地址 |
| `phone` | String | 電話 |
| `lat` / `lng` | Number | 經緯度 |
| `gmap` | String | Google Maps 連結 |
| `rating` | Number | 評分 |
| `price` | String | 價位（`$` ~ `$$$`） |
| `groupSize` | Array | 適合人數 |
| `foods` | Array | 招牌料理 |
| `tags` | Array | 搜尋標籤 |
| `desc` | String | 店家簡介 |
| `images` | Array | 照片（`src` + `type`），圖片來源為 Google Maps URL，統一使用 `=s1200-k-no` 參數 |
| `beer` | Boolean | 是否提供啤酒 |
| `lateNight` | Boolean | 是否為宵夜場 |
| `reservation` | Boolean | 是否可訂位 |

### pubs.json（PUB 酒吧）

結構與 `data.json` 相同，差異如下：

| 欄位 | 說明 |
| :--- | :--- |
| `id` | 唯一編號（101 起） |
| `drinks` | 招牌酒款（取代 `foods`） |

### order.json（顯示排序）

僅控制左側**餐廳**的顯示順序，PUB 固定排列於後。

```json
[7, 1, 2, 5, 6, 3, 4, 8, 9, 10, 11, 12, 13]
```

調整陣列內的 id 順序即可變更顯示順序，不影響 `data.json` 本身內容。
