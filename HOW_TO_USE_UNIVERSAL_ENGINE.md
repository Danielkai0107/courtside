# 如何使用通用運動引擎

## 重要說明

當前系統支持兩種引擎模式：

### 1. 傳統引擎（舊版）
- 使用 `createCategory()` 創建分類
- 使用 `generateKnockoutOnly()` 或 `generateGroupThenKnockout()` 發布
- 需要手動選擇分組方案

### 2. 通用引擎（新版）
- 使用 `createCategoryUniversal()` 或 `createCategoryWithSnapshot()` 創建分類
- 使用 `generateScheduleUniversal()` 發布
- 完全配置驅動，自動處理所有邏輯

## 當前問題

**CreateTournament.tsx 仍在使用傳統引擎創建分類**

這意味著通過「創建賽事」頁面創建的分類：
- 沒有 `formatConfig` 和 `scoringConfig`
- 無法使用通用引擎功能
- 發布時會使用傳統邏輯

## 解決方案

有兩個選擇：

### 選項 A：在 TournamentDashboard 中添加通用引擎分類

在賽事控制台中添加「創建通用引擎分類」按鈕：

```typescript
// 在 TournamentDashboard.tsx
import UniversalCategoryForm from '../../components/features/UniversalCategoryForm';

// 添加按鈕
<Button onClick={() => setShowUniversalForm(true)}>
  創建通用引擎分類
</Button>

// 顯示表單
{showUniversalForm && (
  <UniversalCategoryForm
    tournamentId={tournamentId}
    onSuccess={(categoryId) => {
      console.log('分類創建成功:', categoryId);
      setShowUniversalForm(false);
      loadCategories();
    }}
    onCancel={() => setShowUniversalForm(false)}
  />
)}
```

### 選項 B：更新 CreateTournament 使用通用引擎

這需要較大的重構，因為：
1. 表單結構不同（需要選擇運動、規則預設、格式）
2. 驗證邏輯不同
3. 創建流程不同

**建議**：先使用選項 A，逐步遷移到通用引擎

## 使用通用引擎的完整流程

### 步驟 1：創建賽事（使用現有流程）

```typescript
// 在 CreateTournament.tsx 中正常創建賽事
const tournamentId = await createTournament({
  name: "測試賽事",
  sportId: "table_tennis",
  // ...
});
```

### 步驟 2：在 TournamentDashboard 中添加通用引擎分類

```typescript
// 使用 UniversalCategoryForm 組件
<UniversalCategoryForm
  tournamentId={tournamentId}
  onSuccess={(categoryId) => {
    // 分類創建成功，包含完整的配置快照
    loadCategories();
  }}
/>
```

這會創建包含以下配置的分類：
```typescript
{
  sportId: "table_tennis",
  rulePresetId: "standard_bo5",
  scoringConfig: { matchType: "set_based", pointsPerSet: 11, ... },
  selectedFormatId: "ko_16",
  formatConfig: { id: "ko_16", minParticipants: 12, ... }
}
```

### 步驟 3：報名參賽者

使用現有的報名流程，無需修改。

### 步驟 4：發布賽程

在 CategoryPublisher 中點擊「發布賽程」：
- 系統自動檢測到 `formatConfig` 存在
- 使用 `generateScheduleUniversal()` 發布
- 完全配置驅動，無需選擇分組方案

### 步驟 5：計分

使用 UniversalScoreboard 組件：
```typescript
<UniversalScoreboard
  match={match}
  onScoreUpdate={() => loadMatchData()}
/>
```

## 測試通用引擎

### 方式 1：使用測試腳本

```bash
npm run test:engine
```

這會自動：
1. 創建測試賽事
2. 使用 `createCategoryUniversal()` 創建分類
3. 添加 8 位參賽者
4. 使用 `generateScheduleUniversal()` 生成賽程
5. 使用 `recordScoreUniversal()` 模擬計分
6. 驗證自動晉級

### 方式 2：手動測試

1. 在 Firebase Console 中手動創建測試分類：

```javascript
// 在 /tournaments/{tournamentId}/categories 中添加文檔
{
  name: "測試通用引擎",
  matchType: "singles",
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
  selectedFormatId: "ko_8",
  formatConfig: {
    id: "ko_8",
    name: "8強淘汰賽",
    minParticipants: 6,
    maxParticipants: 8,
    stages: [
      { type: "knockout", size: 8, name: "單淘汰賽" }
    ],
    supportSeeding: true
  },
  status: "REGISTRATION",
  currentParticipants: 0,
  maxParticipants: 8,
  createdAt: firebase.firestore.Timestamp.now(),
  updatedAt: firebase.firestore.Timestamp.now()
}
```

2. 在 UI 中報名參賽者
3. 點擊「發布賽程」
4. 觀察控制台日誌，應該看到：
   ```
   [CategoryPublisher] 檢測到通用引擎分類
   [CategoryPublisher] 使用通用運動引擎發布賽程
   ```

## 當前狀態

### 已實現
- 通用引擎核心邏輯（100%）
- CategoryPublisher 支持雙引擎（100%）
- 自動引擎檢測（100%）

### 待整合
- CreateTournament 頁面（仍使用傳統引擎）
- TournamentDashboard 添加通用引擎分類按鈕

## 快速驗證

檢查分類是否使用通用引擎：

```typescript
const categoryDoc = await getCategory(tournamentId, categoryId);

if (categoryDoc.formatConfig && categoryDoc.scoringConfig) {
  console.log("這是通用引擎分類");
} else {
  console.log("這是傳統引擎分類");
}
```

## 建議

1. **短期**：在 TournamentDashboard 添加「創建通用引擎分類」功能
2. **中期**：更新 CreateTournament 使用通用引擎
3. **長期**：移除傳統引擎代碼

---

**當前狀態**：
- 通用引擎：完全實施
- UI 整合：部分完成（需要在 Dashboard 中添加入口）
- 向後兼容：完全支持

**建議操作**：
使用測試腳本驗證通用引擎功能，然後在 TournamentDashboard 中添加通用引擎分類創建入口。

