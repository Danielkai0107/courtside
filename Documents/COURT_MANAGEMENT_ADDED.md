# 場地管理功能添加

## 🎯 問題與解決

### 問題

- 比賽狀態顯示「等待分配場地」
- 但主辦方沒有場地管理功能
- 無法分配場地給比賽

### 解決

- 添加 CourtManager 組件
- 整合到主辦方控制台「賽程管理」Tab
- 在發布賽程區域上方顯示

## 📦 新增組件

### CourtManager.tsx

**功能**：

- 顯示所有場地列表
- 新增場地
- 刪除場地
- 顯示場地狀態（空閒/使用中）

**核心邏輯**：

```typescript
// 載入場地
const courts = await getCourts(tournamentId);

// 新增場地
await createCourt(tournamentId, {
  name: "Court 01",
  order: courts.length + 1,
});

// 刪除場地
await deleteCourt(tournamentId, courtId);
```

## 🎨 UI 設計

### 場地管理卡片

```
┌──────────────────────────────────┐
│ 場地管理            [+ 新增場地] │
├──────────────────────────────────┤
│ 場地用於分配比賽。建議在發布 │
│    賽程前先設定場地。             │
├──────────────────────────────────┤
│ ┌─ Court 01 ──────────────┐     │
│ │ 空閒              [刪除] │     │
│ └──────────────────────────┘     │
│                                  │
│ ┌─ Court 02 ──────────────┐     │
│ │ 使用中            [刪除] │     │
│ └──────────────────────────┘     │
│                                  │
│ ┌─ 中央球場 ──────────────┐     │
│ │ 空閒              [刪除] │     │
│ └──────────────────────────┘     │
├──────────────────────────────────┤
│ 共 3 個場地                      │
└──────────────────────────────────┘
```

### 新增場地 Modal

```
┌────── 新增場地 ──────┐
│                      │
│ 場地名稱:            │
│ ┌──────────────┐    │
│ │ Court 01     │    │
│ └──────────────┘    │
│                      │
│      [取消] [新增]  │
└──────────────────────┘
```

## 📍 整合位置

### 主辦方控制台 → 賽程管理 Tab

```
賽程管理 Tab
├── 場地管理（全局）⭐ 新增
│   ├── 新增場地
│   ├── 刪除場地
│   └── 查看狀態
│
└── 按分類發布賽程
    ├── [男子雙打]
    │   └── CategoryPublisher
    └── [女子單打]
        └── CategoryPublisher
```

**位置**：在 CategoryScheduleManager 上方

## 🔄 完整工作流程

### 主辦方操作流程

```
1. 創建賽事
   ↓
2. 設定分類
   ↓
3. 開放報名
   ↓
4. 審核報名
   ↓
5. 截止報名
   ↓
6. 進入「賽程管理」Tab
   ↓
7. 【新增場地】⭐
   - 新增 Court 01
   - 新增 Court 02
   - 新增 Court 03
   ↓
8. 為各分類發布賽程
   - 男子雙打：選擇方案 → 發布
   - 女子單打：發布
   ↓
9. 系統自動分配場地給第一輪比賽
   ↓
10. 紀錄員開始記分
```

## 🎯 場地分配邏輯

### 自動分配（發布賽程時）

```typescript
// bracketService.ts
function assignCourtsToMatches(matches, courts) {
  // 只分配給 PENDING_COURT 狀態的比賽
  const matchesNeedingCourts = matches.filter(
    (m) => m.status === "PENDING_COURT"
  );

  // 輪流分配場地
  matchesNeedingCourts.forEach((match, index) => {
    const court = courts[index % courts.length];
    match.courtId = court.id;
    match.status = "SCHEDULED"; // 改為已排程
  });
}
```

**效果**：

- 第一輪比賽自動分配場地
- 使用輪流分配（Round Robin）
- 狀態從 PENDING_COURT → SCHEDULED

### 場地數量建議

| 參賽數 | 第一輪比賽 | 建議場地 |
| ------ | ---------- | -------- |
| 10 組  | 5 場       | 2-3 個   |
| 16 組  | 8 場       | 3-4 個   |
| 20 組  | 10 場      | 4-5 個   |
| 32 組  | 16 場      | 5-8 個   |

**原則**：

- 最少：1 個（所有比賽排隊）
- 理想：第一輪比賽數 / 2-3
- 最多：第一輪比賽數（每場都有專屬場地）

## 📋 修改清單

### 新增文件（2 個）

- `src/components/features/CourtManager.tsx`
- `src/components/features/CourtManager.module.scss`

### 修改文件（1 個）

- `src/pages/organizer/TournamentDashboard.tsx`
- 導入 CourtManager
- 在賽程管理 Tab 添加場地管理

## 功能檢查清單

### 場地管理

- [x] 顯示場地列表
- [x] 顯示場地狀態（空閒/使用中）
- [x] 新增場地
- [x] 刪除場地
- [x] 顯示場地總數

### 場地分配

- [x] 發布賽程時自動分配
- [x] 輪流分配給第一輪比賽
- [x] 狀態更新為 SCHEDULED

### 計分頁面

- [x] 顯示場地名稱
- [x] PENDING_COURT 狀態提示
- [x] SCHEDULED 狀態可以開始

## 🎊 完成

**場地管理功能已完整添加！**

現在主辦方可以：

- 在賽程管理 Tab 管理場地
- 新增多個場地
- 發布賽程時自動分配場地
- 比賽從「等待場地」變為「已排程」
- 紀錄員可以開始記分

**完整的場地管理流程！** 🏟️🎉

---

**實施日期**: 2024 年 12 月 21 日  
**狀態**: 已完成  
**影響**: 場地分配流程完整
