# 賽事資訊編輯功能修復

## 🔧 問題描述

三層架構重構後，`Tournament` 類型移除了以下欄位：

- `maxPlayers` → 移至 `Category.maxParticipants`
- `format` → 移至 `Category.format`
- `config` → 移至 `Category` 各欄位

但舊的編輯功能和顯示邏輯仍在使用這些欄位，導致：

- 編輯表單無法正常保存
- 顯示資訊不正確
- TypeScript 類型錯誤

## 已修復的文件

### 1. TournamentDashboard.tsx

**問題**：編輯表單包含 `maxPlayers` 欄位

**修復**：

- 移除 `maxPlayers` 的初始化
- 移除編輯表單中的「參賽人數上限」輸入欄位
- 改為顯示「賽事分類」數量

```typescript
// 修改前
setEditedTournament({
  name: data.name,
  location: data.location,
  maxPlayers: data.maxPlayers, // 已移除
});

// 修改後
setEditedTournament({
  name: data.name,
  location: data.location,
  // maxPlayers 已移到 Category 層級
});
```

### 2. TournamentService.ts

**問題**：`publishTournament` 函數使用 `tournament.format` 和 `tournament.config`

**修復**：

- 標記函數為 `@deprecated`
- 添加新架構檢測
- 提示使用者按 Category 發布
- 保留舊架構向下兼容

```typescript
// 新增檢查
if (tournament.stats?.totalCategories && tournament.stats.totalCategories > 0) {
  throw new Error("此賽事使用新的三層架構，請到各個分類中分別發布賽程。");
}
```

### 3. EventDetail.tsx

**修復**：

- 改為顯示 `categories.length` 而非 `maxPlayers`

### 4. TournamentCard.tsx

**修復**：

- 改為顯示 `stats.totalCategories` 而非 `maxPlayers`

### 5. InvitationDetail.tsx

**修復**：

- 改為顯示 `stats.totalCategories` 而非 `maxPlayers`

### 6. CreateTournament.tsx

**修復**：

- 添加 `Tournament` 類型導入

## 📊 編輯功能現在包含的欄位

### 可編輯欄位

- 賽事名稱 (name)
- 賽事地點 (location)
- 運動類型 (sportType)
- 賽事說明 (description)

### 已移至 Category 層級（不在 Tournament 編輯）

- 參賽人數上限 → 每個 Category 獨立設定
- 賽制設定 → 每個 Category 獨立設定
- 每局得分 → 每個 Category 獨立設定

### 不可編輯欄位

- 🔒 比賽日期 (date)
- 🔒 報名截止日期 (registrationDeadline)
- 🔒 球類項目 (sportId)
- 🔒 主辦方 (organizerId)

## 🎯 新架構下的編輯流程

### Tournament 層級編輯

```typescript
// 可編輯的大賽資訊
const editableFields = {
  name: "2025 台北春季公開賽",
  location: "台北市立體育館",
  sportType: "pickleball",
  description: "歡迎參加...",
};
```

### Category 層級編輯（未來功能）

```typescript
// 每個分類獨立設定
const categorySettings = {
  name: "男子雙打",
  matchType: "doubles",
  maxParticipants: 20,
  format: "GROUP_THEN_KNOCKOUT",
  pointsPerSet: 21,
  enableThirdPlaceMatch: false,
  groupConfig: {...}
};
```

## 🔄 向下兼容策略

### 舊賽事（無 stats.totalCategories）

- 可以正常編輯
- 可以使用舊的 `publishTournament` 函數
- 保留 format 和 config 欄位

### 新賽事（有 stats.totalCategories）

- 可以編輯 Tournament 基本資訊
- 不能使用舊的 `publishTournament` 函數
- 必須按 Category 分別發布賽程

## 📝 使用說明

### 編輯賽事資訊

1. 進入「賽事控制台」
2. 切換到「賽事資訊」Tab
3. 點擊「編輯」按鈕
4. 修改以下內容：
   - 賽事名稱
   - 賽事地點
   - 運動類型（籃球/羽球/排球/匹克球）
   - 賽事說明
5. 點擊「儲存」

### 編輯分類設定（新賽事）

**注意**：分類設定在創建賽事時設定，**目前不支援事後修改**。

**原因**：

- 分類一旦創建並開放報名，修改會影響已報名的選手
- 建議在創建時就規劃好所有分類

**未來計劃**：

- [ ] 在報名開始前允許編輯分類
- [ ] 報名開始後鎖定分類設定

## 驗證結果

- 編輯表單正常顯示
- 保存功能正常運作
- 無 TypeScript 錯誤
- 向下兼容舊賽事
- 新賽事正確顯示分類數量

## 🚨 重要提醒

### 對於新建的賽事

**不要使用主辦方控制台的「賽程設定」Tab（舊流程）**

應該使用：

1. 創建賽事時設定好所有 Category
2. 報名結束後，到每個 Category 分別發布賽程
3. 使用 `CategoryPublisher` 組件（帶智能推薦）

### 對於舊賽事

- 可以繼續使用舊的「賽程設定」流程
- 保持原有功能不變

---

**修復日期**: 2024 年 12 月 21 日  
**影響範圍**: Tournament 層級編輯功能  
**向下兼容**: 完全兼容
