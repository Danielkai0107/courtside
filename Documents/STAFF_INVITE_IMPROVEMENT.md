# 紀錄員邀請功能改進

## 🎯 問題與解決方案

### 問題
原本的紀錄員邀請功能**沒有檢查用戶是否已註冊**，導致：
- ❌ 無法區分註冊用戶 vs 未註冊用戶
- ❌ 註冊用戶無法立即收到通知
- ❌ 需要手動輸入姓名（即使用戶已註冊）

### 解決方案
添加**用戶搜尋功能**，類似選手管理的搜尋邏輯：
- ✅ 輸入 Email → 點擊「搜尋」
- ✅ 找到用戶 → 自動填入姓名和頭像
- ✅ 沒找到 → 手動輸入姓名（影子帳號）

## 🔄 改進對比

### 舊版流程
```
1. 輸入 Email
2. 輸入姓名
3. 點擊「發送邀請」
   → 不知道是否為註冊用戶
   → 註冊用戶可能無法收到通知
```

### 新版流程
```
1. 輸入 Email
2. 點擊「搜尋」
   ✓ 找到：顯示用戶資料，自動填入姓名
   ✗ 沒找到：提示手動輸入姓名
3. 確認姓名
4. 點擊「發送邀請」
   → 註冊用戶：立即收到通知 ✅
   → 未註冊：建立影子帳號，註冊後可接受 ✅
```

## 📱 UI 改進

### 邀請 Modal（新版）

```
┌────────── 邀請紀錄員 ──────────┐
│                                │
│ Email:                         │
│ ┌─────────────────┐ [搜尋]    │
│ │ john@email.com  │           │
│ └─────────────────┘           │
│                                │
│ ✓ 找到已註冊用戶：John Doe    │
│                                │
│ 姓名:                          │
│ ┌─────────────────┐           │
│ │ John Doe        │ (自動填入)│
│ └─────────────────┘           │
│                                │
│ 💡 此用戶已註冊，將立即收到    │
│    邀請通知。                  │
│                                │
│          [取消]  [發送邀請]   │
└────────────────────────────────┘
```

### 未找到用戶

```
┌────────── 邀請紀錄員 ──────────┐
│                                │
│ Email:                         │
│ ┌─────────────────┐ [搜尋]    │
│ │ new@email.com   │           │
│ └─────────────────┘           │
│                                │
│ 姓名:                          │
│ ┌─────────────────┐           │
│ │ (請手動輸入)     │           │
│ └─────────────────┘           │
│                                │
│ 💡 如果此 Email 尚未註冊，系統 │
│    會建立影子帳號，用戶註冊後  │
│    可接受邀請。                │
│                                │
│          [取消]  [發送邀請]   │
└────────────────────────────────┘
```

## 🔧 技術實現

### 搜尋邏輯

```typescript
const handleSearchUser = async () => {
  const user = await searchUserByEmail(staffEmail.trim());
  
  if (user) {
    // 找到註冊用戶
    setFoundUser({
      uid: user.uid,
      name: user.displayName || "",
      photoURL: user.photoURL || undefined,
    });
    setStaffName(user.displayName || ""); // 自動填入
  } else {
    // 沒找到
    setFoundUser(null);
    alert("找不到此用戶，請確認 Email 或手動輸入姓名");
  }
};
```

### 邀請邏輯

```typescript
const handleInvite = async () => {
  await inviteStaff(tournamentId, {
    email: staffEmail.trim(),
    name: staffName.trim(),
    role: "scorer",
    uid: foundUser?.uid,        // ← 如果找到用戶，傳入 uid
    photoURL: foundUser?.photoURL, // ← 傳入頭像
  });
};
```

### staffService 處理

```typescript
// staffService.ts
export const inviteStaff = async (staffData) => {
  const staffDoc: any = {
    email: staffData.email,
    name: staffData.name,
    role: staffData.role,
    status: "invited",
    invitedAt: serverTimestamp(),
  };

  // 如果是已註冊用戶
  if (staffData.uid) {
    staffDoc.uid = staffData.uid;
    staffDoc.photoURL = staffData.photoURL;
    
    // 立即發送通知 ✅
    await createNotification({
      userId: staffData.uid,
      type: "STAFF_INVITATION",
      title: "紀錄員邀請",
      message: `您被邀請擔任【${tournament.name}】的紀錄員`,
      actions: [...]
    });
  } else {
    // 影子帳號
    staffDoc.uid = null;
  }
  
  await addDoc(staffRef, staffDoc);
};
```

## 🎯 用戶體驗改進

### 已註冊用戶
1. 主辦方輸入 john@email.com → 搜尋
2. ✅ 系統顯示：「✓ 找到已註冊用戶：John Doe」
3. 姓名自動填入
4. 發送邀請
5. **John 立即收到通知**（手機 App 推播）
6. John 點擊通知 → 查看詳情 → 接受邀請

### 未註冊用戶
1. 主辦方輸入 new@email.com → 搜尋
2. ⚠️ 系統提示：「找不到此用戶」
3. 主辦方手動輸入姓名：「New User」
4. 發送邀請
5. 系統建立影子帳號
6. **等用戶註冊後**，可以在 App 中看到邀請
7. 用戶接受邀請 → 影子帳號自動連結

## 📊 對比表

| 特性 | 舊版 | 新版 |
|------|------|------|
| Email 輸入 | ✅ | ✅ |
| 姓名輸入 | ✅ 手動 | ✅ 自動/手動 |
| 用戶搜尋 | ❌ | ✅⭐ |
| 區分註冊狀態 | ❌ | ✅⭐ |
| 即時通知（已註冊） | ❌ | ✅⭐ |
| 影子帳號（未註冊） | ✅ | ✅ |
| 自動填入姓名 | ❌ | ✅⭐ |
| 顯示用戶頭像 | ❌ | ✅⭐ |

## 🔗 相關功能

### 類似的搜尋實現
1. **CategoryPlayersManager** - 手動新增選手時的搜尋
2. **RegistrationForm** - 雙打報名時的隊友搜尋
3. **CategoryStaffManager** - 邀請紀錄員時的搜尋 ⭐ 新增

**一致性**：所有搜尋功能都使用相同的 UI 和邏輯

## ✅ 測試檢查清單

### 搜尋功能
- [x] 輸入 Email 可以搜尋
- [x] 找到用戶顯示綠色提示
- [x] 沒找到顯示警告提示
- [x] 找到用戶自動填入姓名
- [x] Loading 狀態正確

### 邀請功能
- [x] 已註冊用戶：傳入 uid 和 photoURL
- [x] 未註冊用戶：建立影子帳號
- [x] 邀請成功後刷新列表
- [x] 錯誤處理正確

### 通知發送
- [x] 已註冊用戶立即收到通知
- [x] 通知內容正確
- [x] 通知包含快速操作按鈕

## 💡 使用建議

### 最佳實踐

1. **優先搜尋用戶**
   ```
   先輸入 Email → 搜尋 → 確認用戶
   這樣可以確保用戶立即收到通知
   ```

2. **確認 Email 正確**
   ```
   搜尋前仔細檢查 Email 拼寫
   避免邀請錯誤的用戶
   ```

3. **記錄影子帳號**
   ```
   如果創建影子帳號，記下 Email
   通知用戶註冊後可以接受邀請
   ```

## 🚀 後續改進建議

### 短期
- [ ] 顯示用戶頭像在搜尋結果中
- [ ] 支援批量邀請（上傳 Email 列表）
- [ ] 邀請歷史記錄

### 中期
- [ ] 紀錄員等級/經驗顯示
- [ ] 自動推薦合適的紀錄員
- [ ] 紀錄員可用時間設定

### 長期
- [ ] 紀錄員評分系統
- [ ] 工作量自動平衡分配
- [ ] 紀錄員認證系統

---

## 🎉 完成

**紀錄員邀請功能已改進！**

現在可以：
- ✅ 搜尋已註冊用戶
- ✅ 自動填入用戶資料
- ✅ 立即發送通知給註冊用戶
- ✅ 支援影子帳號（未註冊）
- ✅ 提供清晰的用戶回饋

**與選手管理的搜尋功能保持一致** ✨

---

**更新日期**: 2024年12月21日  
**狀態**: ✅ 已實施  
**影響**: 紀錄員邀請體驗大幅提升

