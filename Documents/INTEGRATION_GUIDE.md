# 通用運動引擎整合指南

## 概述

本文檔說明如何將通用運動引擎整合到現有的 UI 流程中。

## 已完成的更新

### 1. CategoryPublisher 組件

**文件**: `src/components/features/CategoryPublisher.tsx`

**更新內容**:
- 添加引擎類型檢測（通用引擎 vs 傳統引擎）
- 使用 `generateScheduleUniversal()` 發布通用引擎分類
- 保留舊邏輯支持傳統引擎分類（向後兼容）
- 添加格式驗證和建議功能

**使用方式**:
```typescript
// 自動檢測引擎類型
const categoryDoc = await getCategory(tournamentId, category.id);

if (categoryDoc && categoryDoc.formatConfig) {
  // 通用引擎：使用 generateScheduleUniversal
  await generateScheduleUniversal(tournamentId, category.id);
} else {
  // 傳統引擎：使用舊函數
  await generateKnockoutOnly(...);
}
```

### 2. CategoryService 服務

**文件**: `src/services/categoryService.ts`

**新增函數**:
- `createCategoryUniversal()`: 使用通用引擎創建分類
- 保留 `createCategory()` 向後兼容（標記為 deprecated）

**使用方式**:
```typescript
// 新方式（推薦）
const categoryId = await createCategoryUniversal(tournamentId, {
  name: "男子單打",
  matchType: "singles",
  sportId: "table_tennis",
  rulePresetId: "standard_bo5",
  selectedFormatId: "ko_16"
});

// 舊方式（仍支持）
const categoryId = await createCategory(tournamentId, {
  name: "男子單打",
  matchType: "singles",
  maxParticipants: 16,
  format: "KNOCKOUT_ONLY",
  pointsPerSet: 11,
  enableThirdPlaceMatch: false,
  status: "REGISTRATION_OPEN"
});
```

### 3. RegistrationService 服務

**文件**: `src/services/registrationService.ts`

**新增函數**:
- `canRegisterForCategory()`: 驗證是否可以報名指定分類

**驗證邏輯**:
```typescript
const validation = await canRegisterForCategory(tournamentId, categoryId);

if (!validation.canRegister) {
  // 顯示錯誤：validation.reason
  return;
}

// 繼續報名流程
```

### 4. RegistrationForm 組件

**文件**: `src/components/features/RegistrationForm.tsx`

**更新內容**:
- 在報名前添加配置驗證
- 檢查分類是否使用通用引擎且配置完整
- 驗證名額和狀態

## 使用通用引擎創建賽事的完整流程

### 方式 A：使用 UniversalCategoryForm 組件（推薦）

在 TournamentDashboard 中添加：

```typescript
import UniversalCategoryForm from '../../components/features/UniversalCategoryForm';

// 在分類管理區域
<UniversalCategoryForm
  tournamentId={tournamentId}
  onSuccess={(categoryId) => {
    console.log('分類創建成功:', categoryId);
    loadCategories(); // 重新載入分類列表
  }}
  onCancel={() => setShowCategoryForm(false)}
/>
```

### 方式 B：在 CreateTournament 中整合

在 Step 3（分類設定）添加切換選項：

```typescript
const [useUniversalEngine, setUseUniversalEngine] = useState(true);

// 在 UI 中
<div className={styles.engineSwitch}>
  <label>
    <input
      type="checkbox"
      checked={useUniversalEngine}
      onChange={(e) => setUseUniversalEngine(e.target.checked)}
    />
    使用通用運動引擎（推薦）
  </label>
</div>

{useUniversalEngine ? (
  <UniversalCategoryForm
    tournamentId={tournamentId}
    onSuccess={(categoryId) => {
      // 添加到分類列表
      loadCategories();
    }}
  />
) : (
  <CategoryManager
    categories={categories}
    onChange={setCategories}
    defaultPointsPerSet={selectedSport?.defaultPointsPerSet || 21}
  />
)}
```

## 報名流程（無需修改）

報名流程已自動兼容通用引擎：

1. 用戶選擇分類
2. 系統自動驗證配置（`canRegisterForCategory`）
3. 驗證通過後執行報名
4. 更新參賽人數

**無需額外修改**，現有的 `RegistrationForm` 組件已支持。

## 發布流程

### 通用引擎分類

```typescript
// 1. 主辦方點擊「發布賽程」
// 2. CategoryPublisher 自動檢測引擎類型
// 3. 驗證參賽人數是否符合 formatConfig
// 4. 呼叫 generateScheduleUniversal(tournamentId, categoryId)
// 5. 系統自動：
//    - 讀取 formatConfig
//    - 生成對應結構（循環賽/淘汰賽）
//    - 分配參賽者
//    - 處理 Bye
// 6. 發送通知給所有參賽者
```

### 傳統引擎分類（向後兼容）

```typescript
// 1. 主辦方點擊「發布賽程」
// 2. CategoryPublisher 檢測到傳統引擎
// 3. 使用舊的 generateKnockoutOnly 或 generateGroupThenKnockout
// 4. 保持原有邏輯不變
```

## 向後兼容性

### 檢測引擎類型

```typescript
const categoryDoc = await getCategory(tournamentId, categoryId);

const isUniversalEngine = 
  categoryDoc && 
  categoryDoc.formatConfig !== undefined &&
  categoryDoc.scoringConfig !== undefined;

if (isUniversalEngine) {
  // 使用通用引擎邏輯
} else {
  // 使用傳統引擎邏輯
}
```

### 混合賽事支持

一個賽事可以同時包含：
- 通用引擎分類（有 formatConfig）
- 傳統引擎分類（無 formatConfig）

系統會自動為每個分類選擇正確的處理邏輯。

## 數據結構對比

### 傳統引擎 Category

```typescript
{
  id: "cat_123",
  name: "男子單打",
  matchType: "singles",
  maxParticipants: 16,
  format: "KNOCKOUT_ONLY",
  pointsPerSet: 11,
  enableThirdPlaceMatch: false,
  status: "REGISTRATION_OPEN"
}
```

### 通用引擎 CategoryDoc

```typescript
{
  id: "cat_456",
  name: "男子單打",
  matchType: "singles",
  
  // 快照配置
  sportId: "table_tennis",
  rulePresetId: "standard_bo5",
  scoringConfig: {
    matchType: "set_based",
    pointsPerSet: 11,
    setsToWin: 3,
    maxSets: 5,
    winByTwo: true
  },
  
  selectedFormatId: "ko_16",
  formatConfig: {
    id: "ko_16",
    name: "16強淘汰賽",
    minParticipants: 12,
    maxParticipants: 16,
    stages: [...]
  },
  
  status: "REGISTRATION",
  currentParticipants: 0,
  maxParticipants: 16
}
```

## 測試建議

### 1. 創建混合賽事

```typescript
// 創建賽事
const tournamentId = await createTournament({...});

// 添加傳統分類
await createCategory(tournamentId, {
  name: "女子雙打（傳統）",
  matchType: "doubles",
  format: "KNOCKOUT_ONLY",
  ...
});

// 添加通用引擎分類
await createCategoryUniversal(tournamentId, {
  name: "男子單打（通用）",
  matchType: "singles",
  sportId: "table_tennis",
  rulePresetId: "standard_bo5",
  selectedFormatId: "ko_16"
});

// 兩個分類可以共存並正常運作
```

### 2. 測試發布流程

```typescript
// 對於傳統分類
// CategoryPublisher 自動使用 generateKnockoutOnly

// 對於通用引擎分類
// CategoryPublisher 自動使用 generateScheduleUniversal

// 無需手動選擇，系統自動檢測
```

### 3. 測試報名流程

```typescript
// 報名任何分類
await registerForTournament(tournamentId, {
  uid: currentUser.uid,
  email: currentUser.email,
  name: currentUser.displayName,
  categoryId: categoryId
});

// 系統自動驗證：
// - 分類狀態
// - 配置完整性（如果是通用引擎）
// - 名額限制
```

## 遷移路徑

### 階段 1：共存（當前）
- 傳統引擎和通用引擎共存
- 新分類推薦使用通用引擎
- 舊分類繼續使用傳統引擎

### 階段 2：逐步遷移（未來）
- 創建數據遷移腳本
- 將舊分類轉換為通用引擎格式
- 添加 `scoringConfig` 和 `formatConfig` 快照

### 階段 3：完全切換（最終）
- 移除傳統引擎代碼
- 所有分類使用通用引擎
- 簡化代碼庫

## 注意事項

1. **配置快照不可變**
   - `scoringConfig` 和 `formatConfig` 在創建時快照
   - 不應該在分類創建後修改這些配置
   - 確保賽事規則的一致性

2. **格式驗證**
   - 發布前驗證參賽人數是否符合格式要求
   - 如果不符合，提供建議格式
   - 主辦方可以重新創建分類或調整人數

3. **向後兼容**
   - 保留所有舊函數
   - 自動檢測引擎類型
   - 不影響現有賽事

4. **錯誤處理**
   - 配置不完整時給出清晰提示
   - 提供建議的解決方案
   - 不阻止傳統引擎分類的使用

## 常見問題

### Q: 如何判斷分類使用哪種引擎？

A: 檢查 `category.formatConfig` 是否存在：
```typescript
const isUniversalEngine = category.formatConfig !== undefined;
```

### Q: 舊賽事會受影響嗎？

A: 不會。舊分類沒有 `formatConfig`，系統會自動使用傳統邏輯。

### Q: 可以混合使用兩種引擎嗎？

A: 可以。一個賽事可以同時包含兩種類型的分類。

### Q: 如何遷移舊分類到通用引擎？

A: 目前需要重新創建分類。未來會提供遷移腳本。

## 下一步

1. 在 TournamentDashboard 中添加「創建通用引擎分類」按鈕
2. 測試完整的創建-報名-發布-計分流程
3. 收集用戶反饋
4. 逐步將傳統分類遷移到通用引擎

---

**版本**: v3.0  
**最後更新**: 2024-12-23

