# 首頁沒有顯示進行中比賽的問題

## 🔍 問題分析

### 首頁邏輯（當前）

```typescript
// Home.tsx
const filters = {
  status: ["ONGOING", "live"], // 只顯示進行中的賽事
};

subscribeTournaments(filters, (tournaments) => {
  // 訂閱比賽
  tournaments.forEach((tournament) => {
    subscribeMatchesByTournament(tournament.id, (matches) => {
      const liveMatchesOnly = matches.filter(
        (m) => m.status === "IN_PROGRESS" || m.status === "live"
      );
      // 顯示進行中的比賽
    });
  });
});
```

**邏輯正確**

## 🐛 可能的原因

### 原因 1：賽事狀態不是 ONGOING

```
當前狀態檢查：
  Tournament.status === "ONGOING" 或 "live"

如果賽事狀態是：
  - "REGISTRATION_OPEN" → 不會顯示 ❌
  - "REGISTRATION_CLOSED" → 不會顯示 ❌
  - "DRAFT" → 不會顯示 ❌

→ 只有主辦方手動設為 ONGOING 才會顯示
```

**解決方案**：

- 主辦方在「賽事資訊」Tab 點擊狀態轉換
- 或發布賽程時自動改為 ONGOING

### 原因 2：沒有 IN_PROGRESS 的比賽

```
首頁只顯示：
  Match.status === "IN_PROGRESS" 或 "live"

如果所有比賽都是：
  - SCHEDULED → 不會顯示 ❌
  - COMPLETED → 不會顯示 ❌

→ 只有紀錄員點擊「開始比賽」後才會顯示
```

**解決方案**：

- 紀錄員進入計分頁面
- 點擊「開始比賽」
- 比賽狀態變為 IN_PROGRESS
- 首頁立即顯示

### 原因 3：Firestore 索引還在建立

```
如果索引還沒建立完成：
  - 查詢會失敗
  - 顯示「目前沒有進行中的賽事」

→ 需要等待 5-30 分鐘
```

**檢查方式**：

- 查看 Console 是否有「索引建立中」訊息
- 訪問 Firebase Console 查看索引狀態

## 🔧 建議的改進

### 選項 A：擴大顯示範圍（推薦）⭐

```typescript
// 修改前：只顯示 ONGOING
const filters = {
  status: ["ONGOING", "live"],
};

// 修改後：顯示所有有比賽的賽事
const filters = {
  status: [
    "REGISTRATION_CLOSED", // 截止報名，可能有比賽
    "ONGOING", // 進行中
    "live", // 舊狀態
  ],
};
```

**優點**：

- 顯示更多賽事
- 不依賴主辦方手動改狀態

### 選項 B：顯示即將開始的比賽

```typescript
// 不只顯示 IN_PROGRESS
const liveMatches = matches.filter(
  (m) =>
    m.status === "IN_PROGRESS" ||
    m.status === "SCHEDULED" || // 已排程
    m.status === "live"
);
```

**優點**：

- 選手可以看到即將開始的比賽
- 知道什麼時候要到場

### 選項 C：分兩個區塊

```tsx
<h3>🔴 進行中的比賽</h3>;
{
  /* 顯示 IN_PROGRESS */
}

<h3>⏰ 即將開始的比賽</h3>;
{
  /* 顯示 SCHEDULED */
}
```

**優點**：

- 資訊更豐富
- 用戶體驗更好

## 🎯 測試步驟

### 確認問題

1. **檢查賽事狀態**

   - 進入主辦方控制台
   - 查看「賽事資訊」Tab
   - 狀態是什麼？（DRAFT / REGISTRATION_OPEN / ONGOING?）

2. **檢查比賽狀態**

   - 進入紀錄員頁面
   - 查看比賽列表
   - 狀態是什麼？（SCHEDULED / IN_PROGRESS?）

3. **檢查索引**
   - 訪問 Firebase Console
   - 查看 Firestore Indexes
   - 是否還在建立中？

### 快速測試

```
1. 創建測試賽事
2. 生成測試數據
3. 發布賽程
4. 主辦方改狀態為 ONGOING
5. 紀錄員開始一場比賽（IN_PROGRESS）
6. 查看首頁是否顯示
```

## 我的建議

**建議實施選項 A + B**：

1. 擴大賽事篩選範圍（包含 REGISTRATION_CLOSED）
2. 顯示 SCHEDULED 和 IN_PROGRESS 的比賽

**原因**：

- 更容易看到比賽
- 不依賴主辦方手動操作
- 符合用戶預期

---

**需要我修改首頁邏輯嗎？請告訴我您想要哪種方案。** 🎯
