# 通用運動引擎 - 快速開始指南

## 🚀 概述

通用運動引擎是一個完全配置驅動的運動賽事管理系統，支持任何運動類型而無需修改代碼。

## 📦 安裝與設置

### 1. 安裝依賴
```bash
npm install
```

### 2. 填充種子數據
首次使用需要填充運動和格式數據到 Firestore：

```bash
npm run seed
```

這將創建：
- 3 種運動（桌球、羽毛球、匹克球）
- 每種運動 2-3 個規則預設
- 6 種賽制格式（涵蓋 2-20 人）

### 3. 驗證數據
登入 Firebase Console，檢查：
- `/sports` 集合：應該有 3 個文檔
- `/formats` 集合：應該有 6 個文檔

---

## 🏗️ 架構概覽

### 三大引擎

```
┌────────────────┐
│  規則引擎      │  定義"如何獲勝"
│  Rule Engine   │  (ScoringConfig)
└────────────────┘
        │
        ├─────────> 快照到 Category
        │
┌────────────────┐
│  格式引擎      │  定義"誰對誰"
│  Format Engine │  (FormatDefinition)
└────────────────┘
        │
        ├─────────> 快照到 Category
        │
┌────────────────┐
│  分配引擎      │  定義"誰去哪裡"
│  Slotting      │  (generateSchedule)
└────────────────┘
```

### 核心理念：配置快照

創建賽事時，完整拷貝配置：

```typescript
// 創建時：
CategoryDoc {
  scoringConfig: { ...完整的計分規則 },
  formatConfig: { ...完整的賽制模板 }
}

// 結果：
✅ 賽事規則凍結
✅ 不受全局配置變更影響
✅ 可追溯歷史賽事配置
```

---

## 🎯 使用流程

### 完整流程

```
1. 主辦方創建賽事
   ↓
2. 添加分類（呼叫配置快照邏輯）
   ├─ 選擇運動
   ├─ 選擇規則預設
   └─ 選擇賽制格式
   ↓
3. 參賽者報名
   ↓
4. 生成賽程（Bracket）
   ├─ 驗證人數是否符合格式
   ├─ 生成比賽結構
   └─ 分配參賽者（Slotting）
   ↓
5. 進行比賽（計分）
   ├─ 讀取 scoringConfig
   ├─ 驗證獲勝條件
   └─ 自動晉級
   ↓
6. 完成賽事
```

---

## 💻 代碼示例

### 1. 創建分類（帶配置快照）

```typescript
import { createCategoryWithSnapshot } from './services/tournamentService';

// 創建分類
const categoryId = await createCategoryWithSnapshot(tournamentId, {
  name: "男子單打",
  matchType: "singles",
  sportId: "table_tennis",           // 桌球
  rulePresetId: "standard_bo5",      // 標準 BO5
  selectedFormatId: "ko_16"          // 16強淘汰賽
});

// 結果：
// 1. scoringConfig 完整拷貝（11分/3勝5局）
// 2. formatConfig 完整拷貝（16強淘汰賽模板）
// 3. 配置凍結，之後不會變更
```

### 2. 生成賽程

```typescript
import { generateScheduleUniversal } from './services/bracketService';

// 生成賽程（自動根據 formatConfig）
await generateScheduleUniversal(tournamentId, categoryId);

// 系統自動：
// 1. 讀取 formatConfig
// 2. 驗證參賽人數
// 3. 生成對應結構（循環賽/淘汰賽/混合）
// 4. 分配參賽者
// 5. 處理 Bye 自動晉級
```

### 3. 記錄分數

```typescript
import { recordScoreUniversal } from './services/matchService';

// 記錄第1局分數：11-8
await recordScoreUniversal(
  matchId,
  0,      // 第1局（0-based）
  11,     // 選手1分數
  8       // 選手2分數
);

// 系統自動：
// 1. 讀取 category.scoringConfig
// 2. 驗證獲勝條件（11分 + 領先2分？）
// 3. 更新 match.sets[0]
// 4. 重新計算累計獲勝局數
// 5. 檢查比賽是否結束
// 6. 如果結束，觸發自動晉級
```

---

## 🎨 前端組件使用

### UniversalCategoryForm - 創建分類表單

```tsx
import UniversalCategoryForm from './components/features/UniversalCategoryForm';

<UniversalCategoryForm
  tournamentId={tournamentId}
  onSuccess={(categoryId) => {
    console.log('分類創建成功:', categoryId);
    navigate(`/tournaments/${tournamentId}/categories/${categoryId}`);
  }}
  onCancel={() => navigate(-1)}
/>
```

**功能**：
- Step 1: 選擇運動（動態讀取 `/sports`）
- Step 2: 選擇規則預設（根據運動動態顯示）
- Step 3: 選擇賽制格式（根據預估人數自動篩選）
- 配置預覽與快照說明
- 自動整合 `createCategoryWithSnapshot()`

### UniversalScoreboard - 通用計分板

```tsx
import UniversalScoreboard from './components/features/UniversalScoreboard';

<UniversalScoreboard
  match={match}
  onScoreUpdate={() => {
    // 重新載入比賽數據
    loadMatchData();
  }}
/>
```

**功能**：
- 動態渲染局數框（根據 `scoringConfig.maxSets`）
- Deuce 檢測與顯示
- 分數上限提示
- 接近獲勝指示
- 自動整合 `recordScoreUniversal()`

---

## 🔧 添加新運動

只需修改種子數據腳本，無需修改代碼！

### 示例：添加網球

編輯 `src/scripts/seed-db.ts`：

```typescript
const sportsData: SportDefinition[] = [
  // ... 現有運動 ...
  
  // 新增網球
  {
    id: "tennis",
    name: "網球",
    icon: "🎾",
    modes: ["singles", "doubles"],
    defaultPresetId: "grand_slam",
    rulePresets: [
      {
        id: "grand_slam",
        label: "大滿貫賽制 (Best of 5)",
        description: "每局4分，搶7局，5盤3勝",
        config: {
          matchType: "set_based",
          pointsPerSet: 6,      // 搶6局
          setsToWin: 3,
          maxSets: 5,
          winByTwo: true,
          tieBreakAt: 6,        // 6-6 進入搶7
        },
      },
    ],
    isActive: true,
    order: 4,
  },
];
```

然後重新執行：

```bash
npm run seed
```

完成！系統立即支持網球，無需修改任何業務邏輯代碼。

---

## 🧪 測試流程

### 端到端測試

1. **創建賽事**
   ```typescript
   const tournamentId = await createTournament({
     name: "測試桌球賽",
     sportId: "table_tennis",
     // ...
   });
   ```

2. **創建分類**
   ```typescript
   const categoryId = await createCategoryWithSnapshot(tournamentId, {
     name: "男子單打",
     matchType: "singles",
     sportId: "table_tennis",
     rulePresetId: "standard_bo5",
     selectedFormatId: "ko_8"  // 8強淘汰賽
   });
   ```

3. **註冊8位選手**
   ```typescript
   // 使用現有的 registration service
   for (let i = 1; i <= 8; i++) {
     await registerPlayer(tournamentId, categoryId, {
       name: `選手 ${i}`,
       email: `player${i}@test.com`
     });
   }
   ```

4. **生成賽程**
   ```typescript
   await generateScheduleUniversal(tournamentId, categoryId);
   // 系統自動生成：
   // - Round 1: 4 場比賽
   // - Round 2: 2 場比賽（準決賽）
   // - Round 3: 1 場比賽（決賽）
   ```

5. **計分並驗證晉級**
   ```typescript
   // 記錄第1場比賽的第1局
   await recordScoreUniversal(match1Id, 0, 11, 8);
   // 記錄第1局
   await recordScoreUniversal(match1Id, 1, 11, 9);
   // 記錄第2局
   await recordScoreUniversal(match1Id, 2, 11, 7);
   // 記錄第3局 → 比賽結束（3勝0負）
   
   // 驗證：
   // 1. match1.status === "COMPLETED"
   // 2. match1.winnerId 已設定
   // 3. 準決賽的對應位置已填入勝者
   ```

---

## 📊 數據結構示例

### CategoryDoc（分組文檔）

```typescript
{
  id: "cat_123",
  tournamentId: "tourn_456",
  name: "男子單打",
  matchType: "singles",
  
  // === 快照配置 ===
  sportId: "table_tennis",
  rulePresetId: "standard_bo5",
  scoringConfig: {
    matchType: "set_based",
    pointsPerSet: 11,
    setsToWin: 3,
    maxSets: 5,
    winByTwo: true,
    cap: null
  },
  
  selectedFormatId: "ko_16",
  formatConfig: {
    id: "ko_16",
    name: "16強淘汰賽",
    minParticipants: 12,
    maxParticipants: 16,
    stages: [
      { type: "knockout", size: 16 }
    ]
  },
  
  status: "ONGOING",
  currentParticipants: 14,
  maxParticipants: 16
}
```

### MatchDoc（比賽文檔）

```typescript
{
  id: "match_789",
  categoryId: "cat_123",
  tournamentId: "tourn_456",
  
  // === Linked List 結構 ===
  round: 1,
  matchOrder: 1,
  stage: "knockout",
  roundLabel: "R16",
  nextMatchId: "match_810",
  nextMatchSlot: "p1",
  
  // === 參賽者 ===
  player1Id: "player_001",
  player2Id: "player_002",
  player1Name: "張三",
  player2Name: "李四",
  
  // === 通用計分板 ===
  sets: [
    { setNumber: 1, p1Score: 11, p2Score: 8, winner: "p1", isCompleted: true },
    { setNumber: 2, p1Score: 9, p2Score: 11, winner: "p2", isCompleted: true },
    { setNumber: 3, p1Score: 11, p2Score: 7, winner: "p1", isCompleted: true },
    { setNumber: 4, p1Score: 11, p2Score: 6, winner: "p1", isCompleted: true }
  ],
  p1Aggregate: 3,  // 張三贏了3局
  p2Aggregate: 1,  // 李四贏了1局
  
  winnerId: "player_001",
  status: "COMPLETED"
}
```

---

## 🐛 常見問題

### Q1: 種子腳本執行失敗
**A**: 檢查 Firebase 配置：
- 確認 `.env` 文件中的 Firebase 配置正確
- 確認有 Firestore 寫入權限

### Q2: 找不到適合的格式
**A**: 檢查參賽人數範圍：
- 當前格式涵蓋 2-20 人
- 如需支持更多人數，在 seed-db.ts 中添加新格式

### Q3: 計分時出錯
**A**: 確認分類配置：
- 檢查 `category.scoringConfig` 是否存在
- 確認 `match.sets` 陣列已初始化

### Q4: 自動晉級不工作
**A**: 檢查 Linked List 結構：
- 確認 `match.nextMatchId` 和 `nextMatchSlot` 已設置
- 檢查下一場比賽是否存在

---

## 📚 相關文檔

- [實施狀態報告](./UNIVERSAL_ENGINE_STATUS.md)
- [專案結構](./PROJECT_STRUCTURE.md)
- [三層架構](./THREE_TIER_ARCHITECTURE_IMPLEMENTATION.md)

---

## 🎉 成功指標

完成以下測試即表示系統運行正常：

- [ ] 種子腳本成功執行
- [ ] 能創建分類（帶配置快照）
- [ ] 能生成賽程（Bracket）
- [ ] 能記錄分數並自動晉級
- [ ] 能完成整場賽事
- [ ] 不同運動都能正常運作

---

**版本**: v3.0 (Universal Engine)  
**分支**: `feature/universal-sports-engine`  
**最後更新**: 2024-12-23

