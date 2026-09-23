# LM 3D Museum

策展式 3D 展示網站。React + TypeScript + Vite + model-viewer；純靜態輸出，支援 GitHub Pages 子目錄與展品永久連結。

## 本機啟動

需要 Node.js 22.12+ 或 24+。

```sh
npm ci
node scripts/prepare-decoders.mjs
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## 新增自己的展品

1. 原始檔放在 `originals/`（已排除版本控制），不要放到 `public/`。
2. 展示用 GLB 放在 `public/models/`，封面放在 `public/posters/`。
3. 修改 `src/data/exhibits.json`，移除示範展品，新增自己的項目。ID 用穩定的英文 slug，已發布後盡量不改，以免破壞分享連結。
4. `npm run build` 會檢查展品資料與 GLB 檔案；預覽確認後提交並推送。

```json
{
  "id": "my-sculpture",
  "title": "作品名稱",
  "subtitle": "MY SCULPTURE",
  "summary": "一行作品簡介。",
  "description": ["第一段作品說明。", "第二段作品說明。"],
  "order": 1,
  "model": "models/my-sculpture.glb",
  "poster": "posters/my-sculpture.webp",
  "alt": "描述模型的外形、顏色與材質，提供給使用輔助工具的觀眾",
  "cameraOrbit": "25deg 75deg 105%",
  "creator": "你的名字",
  "source": "https://your-portfolio.example.com/",
  "license": "© 2026 作者，保留所有權利",
  "licenseUrl": "https://your-portfolio.example.com/terms",
  "sample": false
}
```

`cameraOrbit`、`cameraTarget`、`fieldOfView` 為選填。預設置中並依模型尺寸自動取景。名稱與描述請填真實資料；示範文案不代表作品史實。

模型與封面也可以使用完整 HTTPS URL；外部模型主機必須允許網站來源的 CORS，GLB 建議回傳 `model/gltf-binary`。請先驗證可直接讀取，不要使用雲端硬碟的分享預覽頁 URL。所有本機資產路徑相對於 `public/`，不要把 GitHub 儲存庫名稱寫進清單。

### 封面

附有 Blender 輔助腳本，直接從實際 GLB 產生 WebP，不修改模型。需要本機 Blender 4+；一般部署不需要 Blender。

```sh
blender --background --python scripts/render-posters.py
```

會覆寫清單指定的本機封面。也可在 Blender 自行調整燈光與構圖輸出。示範封面的燈光與網頁即時渲染略有差異；幾何皆來自對應模型。

### 模型優化

- 保留原件，先移除未使用的物件與資料，再評估 Draco 幾何壓縮、KTX2 貼圖或 Meshopt。
- 10–20 MB 是展示用目標，不是硬性要求；實際性能也受面數、貼圖解析度、透明材質與 GPU 記憶體影響。
- 比較相同視角下的輪廓、細節、法線、金屬反光、透明材質及貼圖；不可只看檔案變小。
- 壓縮需要的解碼器由鎖定版本的 npm 套件在建置時複製到 `public/decoders/`，以同源網址載入。
- 只有進入單件展品才載入 model-viewer 與 GLB；首頁、目錄只有封面。切换展品會移除舊 viewer，關閉模型記憶體快取。

## GitHub Pages 部署

1. 建立公開 GitHub 儲存庫並推送本專案。
2. 在 **Settings → Pages → Build and deployment** 選擇 **GitHub Actions**。
3. 推送到 `main`，或手動執行 **Deploy museum to GitHub Pages**。
4. Workflow 執行測試、建置與資產檢查，再發布 `dist/`。使用 Pages 回傳的 base path，相容專案站、帳號首頁與自訂網域。

本機驗證專案子路徑：

```sh
BASE_PATH=/LM3DMuseum/ npm run build
BASE_PATH=/LM3DMuseum/ npm run preview
```

展品網址為 `https://<帳號>.github.io/LM3DMuseum/#/exhibit/<id>`。Hash 路由重新整理不依賴伺服器 rewrite。

## 示範素材與授權

**內附作品不是 LM 原創作品。** 詳細來源、作者、授權與使用限制見 [ATTRIBUTIONS.md](ATTRIBUTIONS.md) 及 `public/licenses/`。Damaged Helmet 的原始作者標示非商業授權；將網站用於商業推廣前請換成自己的作品或確認另有適用授權。

## 驗收範圍

已包含路由與子路徑單元測試；建置時驗證所有本機模型及封面。實際手機 GPU、iOS Safari／Android Chrome 的觸控與記憶體表現，需要用自己的模型在真機確認。桌面縮小 viewport 不等於真機測試。
