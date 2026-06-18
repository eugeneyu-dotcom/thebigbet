# 2026 世界盃運彩分析中心 (The Big Bet)

這是一個以 Astro + Tailwind CSS 打造的高效能體育深度分析網站。
整合了即時賠率 (The-Odds-API)、官方戰績 (Football-Data.org) 與自動化的 AI 戰力分析 (Gemini)。

## 🚀 網站營運與資料更新手冊

本網站採用 **「全自動 AI 混合戰力系統」**。AI 在進行戰力評估時，必須擁有最新的客觀戰績事實，才能避免產生錯誤或幻覺。因此，每次手動更新資料時，**請務必嚴格遵守以下先後順序**：

### 🔄 標準更新 SOP
為了避免順序錯誤，我們已經將正確的邏輯封裝成一個指令，強烈建議您**只使用以下這組指令來一鍵更新全站資料**：

```bash
npm run update:all
```
> **底層運作邏輯解析：**
> 1. **Step 1:** 系統會先執行 `npm run update:standings`，連線至專業體育 API 獲取全球最新比分與小組戰績，並將真實事實記錄下來。
> 2. **Step 2:** 系統接著執行 `npm run update:ai`，呼叫 Gemini 讀取前一步取得的最即時真實戰績與新聞，生成有憑有據的繁體中文深度分析。
>    - **AI 戰力加權演算法 (70/30 Rule)**：為了避免因一場爆冷而導致分數大幅震盪，AI 被嚴格指示採用加權評分：
>      - **70% 基礎底蘊**：參考各國歷史戰績、目前世界排名、球員總身價以及賽前熱身賽狀態。
>      - **30% 盃賽近況**：讀取 `API-Football` 傳回的真實世界盃最新賽果 (勝負與得失球) 進行動態微調。
> 3. **Step 3:** 系統最後執行 `npm run update:predictions`，讀取 `The-Odds-API` 提供的最新即時賠率，利用 Gemini 為首頁的每一場比賽寫出獨家的賠率預測分析。

*注意：絕對不可以顛倒順序，否則 AI 會拿到過期資料產生錯誤的幻覺分析。*

### ⚙️ GitHub Actions 全自動更新
如果您已經將網站部署在 Vercel 並連結了 GitHub 專案，您完全不需要每天手動下指令。
我們已經為您建置好 `.github/workflows/daily-update.yml`。

**如何啟用全自動更新：**
1. 進入您 GitHub 專案的 **Settings > Secrets and variables > Actions**。
2. 新增以下三個 Secret 變數：
   - `FOOTBALL_DATA_ORG_TOKEN` (填入您的 API 金鑰)
   - `GEMINI_API_KEY` (填入您的 API 金鑰)
   - `ODDS_API_KEY` (填入您的 API 金鑰)
3. 系統會在每天午夜 (00:00 UTC) 自動在背景啟動虛擬機，嚴格遵守 SOP 順序執行更新。更新完畢後自動觸發 Vercel 發布最新版網站，達成 100% 零人工介入的全自動化營運！

### 🧑‍💼 如何新增人類專家短評預測 (CSV)？
本系統支援在首頁每場賽事卡片中，除了顯示 AI 的賠率預測外，同時並排顯示真實人類專家的見解。
1. 專家只需要打開根目錄的 **`EXPERT_PREDICTIONS.csv`**（可使用 Excel 或 Google Sheets 打開）。
2. 在裡面會看到最新的賽事列表。請在 `Prediction_ZH` 欄位填寫中文分析短評。
3. **自動翻譯**：專家只需填寫中文即可！如果 `Prediction_EN` 留白，系統在編譯時會自動呼叫 Gemini 將中文翻譯為英文，省去語言負擔。
4. 存檔並推播 (Push) 至 GitHub，`npm run build` 在部署時會自動執行 `sync_expert_csv.mjs` 腳本，將 CSV 同步轉換至內部資料庫並上線。

> **注意**：`EXPERT_PREDICTIONS.csv` 是唯一需要手動編輯的預測檔案，請勿直接修改 `src/data/humanPredictions.json`，每次建置時都會被 CSV 覆蓋。

### 📝 如何撰寫詳細賽事分析長文 (Markdown)？
針對單一賽事的長篇深度分析（顯示於獨立文章頁面中），專家完全不需要寫程式碼，只需透過純文字 (Markdown) 即可發布！
1. 在 `src/content/analysis/zh-tw/` 資料夾下，新增一個 Markdown 檔案，例如 `argentina-vs-france.md`。
2. 貼上並填寫以下格式範本：

```markdown
---
title: "阿根廷 vs 法國 決賽前瞻"
pubDate: 2026-07-15
match: "Argentina vs France"
odds: "主勝 2.50 | 平 3.00 | 客勝 2.70"
prediction: "阿根廷 2-1 法國"
confidence: 4
h2hData: [2, 1, 1]
teamAForm: [1, 1, 1, 1, 0]
teamBForm: [1, 1, 0, 1, 1]
---

在這裡輸入您想寫的任何中文分析內文。支援任何 Markdown 語法，例如粗體、列表等。
不需要寫任何複雜的圖表程式碼！
```
3. **全自動圖表渲染**：只要 `match` 欄位正確填寫了英文隊名對戰組合（例如 `Argentina vs France`），系統上線時就會自動在文章最下方幫您畫好兩隊的 **AI 五維雷達圖**與**深度戰力解析表**！

## 🛠 本地端開發
確保您的 `.env` 檔案內有齊全的 API Key：
```env
ODDS_API_KEY="..."
GEMINI_API_KEY="..."
API_FOOTBALL_KEY="..."
FOOTBALL_DATA_ORG_TOKEN="..."
PUBLIC_GA_ID="..."
PUBLIC_GSC_VERIFICATION="..."
```

接著執行：
```bash
npm run dev
```
即可預覽網站。