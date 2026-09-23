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
3. 修改 `src/data/exhibits.json`，新增自己的項目。ID 用穩定的英文 slug，已發布後盡量不改，以免破壞分享連結。
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
  "licenseUrl": "https://your-portfolio.example.com/terms"
}
```

`cameraOrbit`、`cameraTarget`、`fieldOfView` 為選填。預設置中並依模型尺寸自動取景。名稱與描述請填真實資料。
`source` 可填 HTTPS 來源網址或文字；若沒有授權網址，`licenseUrl` 可省略，頁面會以文字顯示授權資訊。

模型與封面也可以使用完整 HTTPS URL；外部模型主機必須允許網站來源的 CORS，GLB 建議回傳 `model/gltf-binary`。請先驗證可直接讀取，不要使用雲端硬碟的分享預覽頁 URL。所有本機資產路徑相對於 `public/`，不要把 GitHub 儲存庫名稱寫進清單。

### 封面

附有 Blender 輔助腳本，直接從實際 GLB 產生 WebP，不修改模型。需要本機 Blender 4+；一般部署不需要 Blender。

```sh
blender --background --python scripts/render-posters.py
```

上述指令會覆寫清單指定的全部本機封面。只產生單件封面可執行：

```sh
blender --background --python scripts/render-posters.py -- --id astrafixdemo
```

也可在 Blender 自行調整燈光與構圖輸出。封面的燈光與網頁即時渲染可能略有差異；幾何皆來自對應模型。

### 模型優化

- 保留原件，先移除未使用的物件與資料，再評估 Draco 幾何壓縮、KTX2 貼圖或 Meshopt。
- 10–20 MB 是展示用目標，不是硬性要求；實際性能也受面數、貼圖解析度、透明材質與 GPU 記憶體影響。
- 比較相同視角下的輪廓、細節、法線、金屬反光、透明材質及貼圖；不可只看檔案變小。
- 壓縮需要的解碼器由鎖定版本的 npm 套件在建置時複製到 `public/decoders/`，以同源網址載入。
- 只有進入單件展品才載入 model-viewer 與 GLB；首頁、目錄只有封面。切换展品會移除舊 viewer，關閉模型記憶體快取。

## 展示模式

展品頁右上角可切換「原始／Toon」。原始模式沿用 model-viewer；首次完成模型載入後，才開放 Toon，並以當前視角啟動延遲載入的 Three.js 渲染器。

- Toon 使用四階 `MeshToonMaterial` 和細描邊，保留底色貼圖與透明設定；金屬、粗糙度等 PBR 外觀不會保留。
- 兩種模式共用旋轉、重置、全螢幕和分享工具列；切換會停止自動旋轉並保留當前相機視角。
- Toon 支援拖曳、滾輪、雙指缩放；聚焦畫布後，方向鍵旋轉、加減鍵縮放。
- 切換會移除前一個 viewer；Toon 釋放控制器、GPU 資源與解碼器。模型可能命中網路快取，但仍需重新解析，因此切換時會短暫顯示封面與載入進度。
- Toon 靜止時按需重繪，自動旋轉時才連續更新；隱藏分頁暫停繪製，像素比上限為 2。
- Toon 載入失敗時可以重試或直接返回原始模式。

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

## 授權

網站程式碼與文件採用 [MIT License](LICENSE)，著作權標示為 LM。`public/models/` 的 3D 模型、`public/posters/` 的封面圖，以及 `src/data/exhibits.json` 中的作品內容不在 MIT 授權範圍內；各展品以自己的授權欄位為準。目前展品均標示為「© 2026 LM，保留所有權利」。新增展品時，請確認其素材使用權並填寫正確的作者與授權。

第三方套件、字型及 `public/decoders/` 中的解碼器仍適用各自的上游授權。

## 驗收範圍

已包含路由與子路徑單元測試；建置時驗證所有本機模型及封面。實際手機 GPU、iOS Safari／Android Chrome 的觸控與記憶體表現，需要用自己的模型在真機確認。桌面縮小 viewport 不等於真機測試。

### 動畫播放

包含動畫的 GLB 會顯示「播放動畫／暫停動畫」及「從頭」控制，預設暫停，循環播放檔案中的第一段動畫。原始與 Toon 模式切換會保留播放進度與暫停狀態；不含動畫的展品不顯示動畫控制。「重置」僅重設視角，動畫可另用「從頭」回到開頭。
