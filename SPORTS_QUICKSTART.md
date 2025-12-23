# 球類項目快速入門指南

## 🎯 更新內容

已根據您的 Firestore `sports` 集合結構更新整個專案，新增了以下功能：

###  更新的檔案

1. **型別定義** (`src/types/index.ts`)
   - 新增 `RulePresetConfig` 和 `RulePreset` 介面
   - 更新 `Sport` 介面以符合新結構

2. **初始化腳本** (`src/scripts/initSports.ts`)
   - 支援羽毛球、匹克球、桌球的完整配置
   - 包含多種規則預設

3. **分類管理器** (`src/components/features/CategoryManager.tsx`)
   - 新增規則預設選擇器
   - 自動套用規則配置

4. **建立賽事頁面** (`src/pages/organizer/CreateTournament.tsx`)
   - 整合新的運動項目結構
   - 支援規則預設選擇

5. **管理頁面** (`src/pages/admin/InitSports.tsx`)
   - 全新的初始化介面
   - 支援一鍵初始化或個別建立

## 🚀 使用步驟

### 步驟 1: 初始化球類項目資料

訪問管理頁面初始化運動項目：

```
http://localhost:5173/admin/init-sports
```

在頁面上點擊「**初始化所有球類項目**」按鈕，系統會自動建立：
- 🏓 匹克球（2種規則預設）
- 羽毛球（3種規則預設）
- 🏓 桌球（2種規則預設）

### 步驟 2: 建立賽事

1. 切換到「主辦方」角色
2. 點擊「建立賽事」
3. 選擇球類項目（會顯示圖示和可用模式）
4. 設定分類時，可以選擇預定義的規則預設

### 步驟 3: 選擇規則預設

建立賽事分類時，您會看到該運動項目的所有規則預設：

**羽毛球規則預設：**
- BWF 標準賽制（每局21分，3局2勝，30分封頂）
- 單局30分制（快速比賽）
- 單局21分制（2分領先，30分封頂）

**匹克球規則預設：**
- 標準11分制（每局11分，3局2勝，15分封頂）
- 單局21分制（快速比賽）

**桌球規則預設：**
- 標準11分制（每局11分，5局3勝）
- 7局4勝制（每局11分，7局4勝）

## 📊 新的資料結構

### Sport 文檔結構

```typescript
{
  id: "badminton",
  name: "羽毛球",
  icon: "",
  isActive: true,
  order: 2,
  defaultPresetId: "bwf_standard",
  modes: ["singles", "doubles"],
  rulePresets: [
    {
      id: "bwf_standard",
      label: "BWF 標準賽制",
      description: "每局21分，3局2勝，30分封頂",
      config: {
        cap: 30,
        matchType: "set_based",
        maxSets: 3,
        pointsPerSet: 21,
        setsToWin: 2,
        winByTwo: true
      }
    }
    // ... 更多規則預設
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 規則配置說明

| 欄位 | 說明 | 範例 |
|------|------|------|
| `cap` | 分數上限（封頂） | 30 |
| `matchType` | 比賽類型 | "set_based" 或 "point_based" |
| `maxSets` | 最多局數 | 3 |
| `pointsPerSet` | 每局分數 | 21 |
| `setsToWin` | 獲勝所需局數 | 2 |
| `winByTwo` | 是否需要贏兩分 | true/false |

## 🎨 UI 改進

### 運動項目選擇
- 顯示運動項目圖示（emoji）
- 副標題顯示可用模式（singles / doubles）

### 規則預設選擇
- 卡片式選擇介面
- 顯示規則標籤和說明
- 選擇後自動填入分數配置

### 初始化頁面
- 一鍵初始化所有項目
- 個別運動項目建立
- 即時狀態回饋
- 成功指示器

## 🔧 開發者資訊

### 在程式碼中使用

```typescript
import { initAllSports } from './scripts/initSports';

// 初始化所有運動項目
await initAllSports();
```

### 在 Console 中使用

```javascript
// 初始化所有項目
await window.initAllSports();

// 或個別初始化
await window.initBadminton();
await window.initPickleball();
await window.initTableTennis();
```

### 讀取運動項目

```typescript
import { getActiveSports, getSport } from './services/sportService';

// 獲取所有啟用的運動項目
const sports = await getActiveSports();

// 獲取特定運動項目
const badminton = await getSport('badminton');

// 使用規則預設
const defaultPreset = badminton.rulePresets.find(
  p => p.id === badminton.defaultPresetId
);
console.log(defaultPreset.config.pointsPerSet); // 21
```

## ✨ 優點

1. **靈活性** - 每個運動項目可以有多個規則預設
2. **一致性** - 標準化的規則配置結構
3. **可擴展性** - 輕鬆新增新的運動項目
4. **使用者友善** - 主辦方可快速選擇常用規則
5. **維護性** - 規則集中管理

## 📝 未來擴展建議

1. 新增更多運動項目（排球、籃球等）
2. 支援自訂規則預設
3. 規則預設的匯入/匯出功能
4. 規則預設版本控制
5. 統計分析各規則預設的使用頻率

## 🐛 疑難排解

### 問題：無法訪問 `/admin/init-sports`
**解決方案：** 確保已登入並有權限訪問管理頁面

### 問題：建立運動項目失敗
**解決方案：** 檢查 Firestore 權限規則，確保有寫入 `sports` 集合的權限

### 問題：運動項目未顯示
**解決方案：** 檢查 `isActive` 是否為 `true`，並確認 Firestore 索引已建立

## 📞 相關檔案

- `/src/types/index.ts` - 型別定義
- `/src/scripts/initSports.ts` - 初始化腳本
- `/src/services/sportService.ts` - 運動項目服務
- `/src/components/features/CategoryManager.tsx` - 分類管理
- `/src/pages/organizer/CreateTournament.tsx` - 建立賽事
- `/src/pages/admin/InitSports.tsx` - 管理頁面
- `/Documents/SPORTS_STRUCTURE_UPDATE.md` - 詳細技術文檔

---

**最後更新：** 2024-12-23
**版本：** 2.0


