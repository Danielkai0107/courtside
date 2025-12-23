# 賽事日期範圍更新

## 更新日期
2024-12-24

## 更新內容

### 1. 資料結構變更

#### Tournament 類型更新 (`src/types/index.ts`)
- **新增欄位**：
  - `startDate: Timestamp` - 賽事開始日期時間
  - `endDate: Timestamp` - 賽事結束日期時間
  
- **向下相容**：
  - `date?: Timestamp` - 保留舊欄位，標記為可選
  - `registrationDeadline?: Timestamp` - 保留舊欄位，標記為可選

### 2. 建立與編輯賽事流程更新

#### CreateTournament.tsx 與 EditTournament.tsx 更新
**第二步驟變更**：
- ❌ 移除：報名截止日期
- ✅ 新增（分開的輸入框）：
  - 開始日期 (`startDate`)
  - 開始時間 (`startTime`)
  - 結束日期 (`endDate`)
  - 結束時間 (`endTime`)
  
**UI 設計**：
- 日期和時間使用獨立的輸入框
- 每一行顯示一組日期和時間（並排顯示）
- 第一行：開始日期 + 開始時間
- 第二行：結束日期 + 結束時間

**自動填充功能**：
- 當輸入開始日期後，會自動將相同值帶入結束日期
- 當輸入開始時間後，會自動將相同值帶入結束時間
- 用戶可以手動修改結束日期和時間

**驗證規則**：
- 所有四個欄位都為必填
- 結束時間必須晚於開始時間（組合日期和時間進行比較）

**編輯賽事特殊處理**：
- 自動載入現有的 `startDate` 和 `endDate`
- 向下相容：如果是舊資料只有 `date`，會使用 `date` 作為開始時間和結束時間
- 分別轉換為日期和時間欄位顯示

### 3. 日期顯示更新

#### TournamentBanner.tsx
顯示格式範例：
- 同一天：`12/27 10:00 - 17:00`
- 跨天：`12/27 10:00 - 12/28 17:00`

#### EventDetail.tsx
顯示格式範例：
- 同一天：`12月27日 星期五 10:00 - 17:00`
- 跨天：`12月27日 10:00 - 12月28日 17:00`

#### TournamentCard.tsx
顯示格式範例：
- 同一天：`12/27`
- 跨天：`12/27 - 12/28`

### 4. 其他更新的組件

所有以下組件都已更新以支持新的日期範圍格式：

1. **src/pages/Home.tsx**
   - 按日期分組功能
   - 賽事過期檢查

2. **src/components/features/DateTimeline.tsx**
   - 時間軸顯示

3. **src/pages/MyTournamentMatches.tsx**
   - 我的賽事場次頁面

4. **src/components/features/TournamentMatchesCard.tsx**
   - 賽事場次卡片

5. **src/pages/scorer/TournamentMatches.tsx**
   - 記分員賽事頁面

6. **src/pages/organizer/TournamentDashboard.tsx**
   - 主辦方控制台
   - 顯示開始日期和結束日期

7. **src/services/tournamentService.ts**
   - 更新狀態計算邏輯以支持向下相容

### 5. 向下相容策略

所有日期相關的代碼都使用以下模式確保向下相容：

```typescript
// 優先使用新欄位，回退到舊欄位
const tournamentDate = tournament.startDate || tournament.date;
const tournamentEndDate = tournament.endDate;
```

這確保了：
- 新建立的賽事使用 `startDate` 和 `endDate`
- 舊有的賽事仍然可以正常顯示（使用 `date` 欄位）
- 不需要資料遷移

## 測試建議

1. **新建賽事**：
   - 測試建立新賽事時的日期輸入
   - 驗證自動填充功能
   - 確認日期範圍驗證

2. **日期顯示**：
   - 測試同一天的賽事顯示
   - 測試跨天賽事的顯示
   - 檢查各個頁面的日期格式

3. **向下相容**：
   - 確認舊有賽事仍能正常顯示
   - 測試混合新舊賽事的列表顯示

## 影響範圍

- ✅ 建立賽事流程 (CreateTournament.tsx)
- ✅ 編輯賽事流程 (EditTournament.tsx)
- ✅ 賽事列表顯示
- ✅ 賽事詳情頁面
- ✅ 主辦方控制台
- ✅ 記分員頁面
- ✅ 選手頁面
- ✅ 所有日期相關的 UI 組件

## 備註

- 所有更改都已通過 TypeScript 類型檢查
- 沒有 linter 錯誤
- 保持了完整的向下相容性

