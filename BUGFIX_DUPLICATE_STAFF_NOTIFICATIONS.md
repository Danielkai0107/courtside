# 修復：紀錄員通知重複問題

## 問題描述

當主辦方邀請已註冊的紀錄員時，紀錄員會收到多個相同的通知。

## 問題原因

系統中有**兩個地方**會創建紀錄員邀請通知：

### 1. `staffService.ts` - `inviteStaff` 函數

當邀請已註冊用戶時（有 `uid`），會立即創建通知：

```typescript
// 第 78-97 行
if (staffData.uid) {
  // ... 創建 STAFF_INVITATION 通知
}
```

### 2. `userService.ts` - `linkShadowAccounts` 函數

當用戶登錄或刷新頁面時，`onAuthStateChanged` 會觸發此函數，檢查所有 `status === 'invited'` 的記錄並創建通知：

```typescript
// 第 73-136 行
const staffQuery = query(
  collectionGroup(db, "staff"),
  where("email", "==", user.email),
  where("status", "==", "invited")
);
// ... 為每個邀請創建通知
```

## 問題流程

1. **邀請時刻**：主辦方邀請已註冊紀錄員 → `inviteStaff` 創建 staff 記錄 + 創建通知（第 1 個通知）
2. **用戶刷新**：紀錄員刷新頁面 → `onAuthStateChanged` 觸發 → `linkShadowAccounts` 檢查到 `status === 'invited'` → **再次創建通知（第 2 個通知）**
3. **持續重複**：每次登錄或刷新都會重複步驟 2

## 解決方案

引入 `notified` 標記字段，防止重複通知：

### 修改 1：`staffService.ts` - 創建時添加標記

```typescript
const staffDoc: any = {
  email: staffData.email,
  name: staffData.name,
  role: staffData.role,
  status: "invited",
  invitedAt: serverTimestamp(),
  notified: false, // 新增：標記是否已發送通知
};

// 為已註冊用戶創建通知後，標記為已通知
if (staffData.uid) {
  await createNotification({ ... });

  // 標記為已通知，防止重複創建
  await updateDoc(doc(db, "tournaments", tournamentId, "staff", docRef.id), {
    notified: true,
  });
}
```

### 修改 2：`userService.ts` - 檢查標記避免重複

```typescript
for (const docSnap of staffSnapshot.docs) {
  const staffData = docSnap.data();

  // 檢查是否已經通知過，避免重複通知
  const alreadyNotified = staffData.notified === true;

  if (!alreadyNotified) {
    // 創建通知
    await createNotification({ ... });

    // 標記為已通知
    batch.update(docSnap.ref, {
      notified: true,
    });
  } else {
    console.log(`⏭️ [linkShadowAccounts] 跳過已通知的邀請`);
  }
}
```

## 數據遷移注意事項

### 對現有數據的影響

- 新創建的 staff 記錄會自動包含 `notified` 字段
- **現有的 staff 記錄沒有 `notified` 字段**，首次檢查時 `notified === true` 為 `false`，會正常創建通知

### 是否需要遷移？

**不需要**。因為：

1. 現有的 invited staff 記錄在用戶下次登錄時會創建通知並標記 `notified: true`
2. 之後就不會再重複創建通知了
3. 這是一個漸進式的修復，不會影響已有功能

## 測試驗證

### 測試場景 1：邀請已註冊用戶

1. 主辦方邀請已註冊的紀錄員
2. 紀錄員應該立即收到 1 個通知
3. 紀錄員刷新頁面，不應該再收到新的通知

### 測試場景 2：邀請未註冊用戶

1. 主辦方邀請未註冊的紀錄員（創建影子帳號）
2. 用戶註冊並登錄
3. 應該收到 1 個通知
4. 刷新頁面，不應該再收到新的通知

### 測試場景 3：多次刷新

1. 紀錄員有待處理的邀請
2. 多次刷新頁面或在多個標籤頁登錄
3. 只應該收到 1 個通知

## 相關文件

- `/src/services/staffService.ts` - 工作人員邀請服務
- `/src/services/userService.ts` - 用戶資料同步和影子帳號連結
- `/src/contexts/AuthContext.tsx` - 認證上下文（觸發 linkShadowAccounts）
- `/functions/src/index.ts` - Cloud Function（發送郵件，不影響應用內通知）

## 修復日期

2024-12-23
