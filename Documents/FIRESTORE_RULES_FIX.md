# Firestore 規則修復 - Teams 創建權限

## 🐛 問題根源

### 錯誤訊息

```
FirebaseError: Missing or insufficient permissions.
Failed to create team 0, 1, 2...
```

### 原有規則（有問題）

```javascript
// teams/{teamId}
allow create: if isAuthenticated() &&
  (request.resource.data.player1Id == request.auth.uid ||
   request.resource.data.player2Id == request.auth.uid);
```

**問題**：

- 只允許隊伍成員創建 team
- 主辦方無法手動新增（player1/2 是影子 ID）
- 測試數據無法生成（全是影子 ID）

### 使用場景衝突

#### 場景 1：選手自己報名（正常）

```
Alice 登入 → 報名男子雙打 → 選擇隊友 Bob
→ 創建 team:
   player1Id: alice_uid ✓ (是當前用戶)
   player2Id: bob_uid
→ 規則通過：player1Id == request.auth.uid
```

#### 場景 2：主辦方手動新增（失敗）

```
主辦方登入 → 選手管理 → 手動新增隊伍
→ 創建 team:
   player1Id: shadow-123-1 (不是主辦方 uid)
   player2Id: shadow-123-2 (不是主辦方 uid)
→ 規則檢查：player1Id != request.auth.uid ❌
→ 規則檢查：player2Id != request.auth.uid ❌
→ 權限拒絕！
```

#### 場景 3：測試數據生成（失敗）

```
主辦方 → 測試數據 → 生成 10 組
→ 全部使用影子 ID
→ 全部被規則拒絕 ❌
```

## 解決方案

### 新規則（已修復）

```javascript
// teams/{teamId}
allow create: if isAuthenticated() &&
  (request.resource.data.player1Id == request.auth.uid ||
   request.resource.data.player2Id == request.auth.uid ||
   get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.organizerId == request.auth.uid);
   // ↑ 新增：主辦方也可以創建
```

**改進**：

- 隊伍成員可以創建（自己報名）
- **主辦方可以創建**（手動新增）⭐
- **測試數據可以生成** ⭐

## 🔒 權限矩陣

| 操作          | 隊伍成員 | 主辦方 | 其他用戶 |
| ------------- | -------- | ------ | -------- |
| **創建 Team** |          | ⭐     |          |
| **讀取 Team** |          |        |          |
| **更新 Team** |          |        |          |
| **刪除 Team** |          |        |          |

### 創建權限詳細說明

```javascript
allow create: if isAuthenticated() &&
  (
    // 條件 1：我是選手 1
    request.resource.data.player1Id == request.auth.uid ||

    // 條件 2：我是選手 2
    request.resource.data.player2Id == request.auth.uid ||

    // 條件 3：我是賽事主辦方（新增）⭐
    get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.organizerId == request.auth.uid
  );
```

## 🎯 使用場景驗證

### 場景 1：選手報名

```typescript
// Alice 報名男子雙打
await createTeam(tournamentId, categoryId, {
  player1Id: "alice_uid",  // ← 當前用戶
  player2Id: "bob_uid",
  ...
});

// 規則檢查
player1Id ("alice_uid") == request.auth.uid ("alice_uid") ✓
→ 允許創建
```

### 場景 2：主辦方手動新增

```typescript
// 主辦方（Organizer）手動新增測試隊伍
await addDoc(teamsRef, {
  player1Id: "shadow-123-1",  // 影子 ID
  player2Id: "shadow-123-2",  // 影子 ID
  ...
});

// 規則檢查
player1Id != request.auth.uid ✗
player2Id != request.auth.uid ✗
organizerId == request.auth.uid ✓  ← 新增的條件
→ 允許創建
```

### 場景 3：測試數據生成

```typescript
// 批量生成 20 組測試隊伍
for (let i = 0; i < 20; i++) {
  await addDoc(teamsRef, {
    player1Id: `shadow-${timestamp}-${i}-1`,
    player2Id: `shadow-${timestamp}-${i}-2`,
    ...
  });
}

// 每個都會檢查
organizerId == request.auth.uid ✓
→ 全部允許創建
```

### 場景 4：惡意用戶嘗試 ❌

```typescript
// 惡意用戶 Charlie 嘗試為其他人創建隊伍
await addDoc(teamsRef, {
  player1Id: "alice_uid",  // 不是 Charlie
  player2Id: "bob_uid",    // 也不是 Charlie
  ...
});

// 規則檢查
player1Id ("alice_uid") != request.auth.uid ("charlie_uid") ✗
player2Id ("bob_uid") != request.auth.uid ("charlie_uid") ✗
organizerId != request.auth.uid ✗  ← Charlie 不是主辦方
→ 拒絕創建  ← 安全！
```

## 📊 部署結果

```bash
firebase deploy --only firestore:rules

✔ cloud.firestore: rules file compiled successfully
✔ firestore: released rules to cloud.firestore
✔ Deploy complete!
```

**狀態**: 已生效（立即生效，無需等待）

## 🧪 測試驗證

### 測試 1：主辦方手動新增雙打隊伍

```
操作：選手管理 → 男子雙打 → 手動新增隊伍
      輸入影子帳號資料
結果： 成功創建
```

### 測試 2：生成測試數據

```
操作：選手管理 → 男子雙打 → 測試數據 → 10 組
結果： 成功生成 10 個測試隊伍
```

### 測試 3：選手自己報名

```
操作：選手登入 → 報名雙打 → 選擇隊友
結果： 成功報名（原有功能不受影響）
```

### 測試 4：惡意用戶

```
操作：用戶 C 嘗試為用戶 A 和 B 創建隊伍
結果：權限拒絕（安全性保持）
```

## 🔐 安全性檢查

### 保留的安全機制

1. **必須登入** - `isAuthenticated()`
2. **三個條件之一**：
   - 我是選手 1
   - 我是選手 2
   - **我是主辦方** 新增
3. **惡意用戶無法創建**

### 新增的能力

- 主辦方可以為任何人創建隊伍（手動新增）
- 主辦方可以創建測試數據（影子帳號）
- 不影響選手自己報名的流程

## 📋 相關規則

### Players 規則（已正確）

```javascript
match /players/{playerId} {
  // Tournament organizer can manage players
  allow create, update, delete: if isAuthenticated() &&
    get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.organizerId == request.auth.uid;
}
```

主辦方可以創建 players（手動新增單打選手）

### Teams 規則（已修復）

```javascript
match /teams/{teamId} {
  // Users OR organizer can create teams
  allow create: if isAuthenticated() &&
    (player1Id == uid OR player2Id == uid OR isOrganizer);
}
```

主辦方可以創建 teams（手動新增雙打隊伍）

## 🎉 修復完成

**權限問題已完全解決！**

現在可以：

- 主辦方手動新增單打選手
- **主辦方手動新增雙打隊伍** ⭐ 修復
- **生成測試數據（單打/雙打）** ⭐ 修復
- 選手自己報名（原有功能）
- 安全性維持（惡意用戶無法操作）

**測試功能現在完全可用！** 🎉

---

## 📝 部署記錄

**部署時間**: 2024 年 12 月 21 日  
**修改檔案**: `firestore.rules`  
**部署命令**: `firebase deploy --only firestore:rules`  
**生效時間**: 立即生效  
**影響範圍**: Teams 創建權限  
**向下兼容**: 完全兼容  
**安全性**: 保持

---

**問題**: Teams 創建權限不足  
**原因**: 規則未包含主辦方權限  
**解決**: 添加 organizerId 檢查  
**狀態**: 已修復並部署
