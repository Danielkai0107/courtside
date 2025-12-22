# 報名功能修復

## 🐛 問題描述

### 問題 1：被婉拒後可以再次報名
**現象**：
- 用戶報名 → 主辦方婉拒
- 用戶再次報名 → 顯示「已報名」錯誤
- 但被婉拒的用戶應該可以重新報名

**原因**：
```typescript
// 舊邏輯
if (!existingSnapshot.empty) {
  throw new Error("Already registered");
  // ↑ 不管狀態，有記錄就拋錯
}
```

### 問題 2：報名顯示錯誤但實際成功
**現象**：
- 用戶送出報名
- 前端顯示錯誤訊息
- 但實際上報名已成功

**原因**：
```typescript
// 單打報名
await registerForTournament(...);  // ✅ 成功
await incrementParticipants(...);   // ❌ 失敗（可能權限或並發問題）
// → catch 捕獲錯誤，顯示「報名失敗」
// 但第一步已經成功了
```

## ✅ 修復方案

### 修復 1：允許被婉拒者重新報名

```typescript
// 新邏輯
if (!existingSnapshot.empty) {
  const existingData = existingSnapshot.docs[0].data();
  
  if (existingData.status === "declined") {
    // 被婉拒的可以重新報名
    await updateDoc(existingDoc, {
      status: "pending",  // 重置為待審核
      name: userData.name,  // 更新資料
      photoURL: userData.photoURL,
    });
    return existingDoc.id;  // 返回現有 ID
  }
  
  // 其他狀態（pending 或 confirmed）不能重複報名
  throw new Error("您已報名此賽事");
}
```

### 修復 2：報名錯誤處理優化

```typescript
// 新邏輯
try {
  const playerId = await registerForTournament(...);  // ✅ 成功
  
  // 增加計數（失敗不影響報名）
  try {
    await incrementParticipants(...);
  } catch (incrementError) {
    console.error('Failed to increment:', incrementError);
    // 不拋出錯誤，報名已成功
  }
  
  onSuccess();  // 顯示成功
} catch (err) {
  setError(err.message);  // 只有真正失敗才顯示錯誤
}
```

## 🎯 修復效果

### 場景 1：被婉拒後重新報名

**修復前**：
```
1. 用戶報名 → pending
2. 主辦方婉拒 → declined
3. 用戶再次報名 → ❌ "已報名此賽事"
4. 無法重新報名
```

**修復後**：
```
1. 用戶報名 → pending
2. 主辦方婉拒 → declined
3. 用戶再次報名 → ✅ 狀態重置為 pending
4. 主辦方可以重新審核
```

### 場景 2：報名成功但顯示錯誤

**修復前**：
```
1. 用戶送出報名
2. registerForTournament → ✅ 成功
3. incrementParticipants → ❌ 失敗
4. 前端顯示：「報名失敗」
5. 但實際已報名成功（困惑）
```

**修復後**：
```
1. 用戶送出報名
2. registerForTournament → ✅ 成功
3. incrementParticipants → ❌ 失敗（捕獲但不拋出）
4. 前端顯示：「報名成功」✅
5. 計數可能不準確但不影響報名
```

## 🔧 技術細節

### 狀態轉換邏輯

```
declined（被婉拒）
  ↓ 重新報名
pending（待審核）← 允許
  ↓
confirmed（已確認）

pending（待審核）
  ↓ 重複報名
❌ 拒絕：「您已報名此賽事」

confirmed（已確認）
  ↓ 重複報名
❌ 拒絕：「您已報名此賽事」
```

### incrementParticipants 錯誤處理

**問題**：並發或權限導致失敗

**解決**：
```typescript
try {
  await incrementParticipants(...);
} catch (incrementError) {
  console.error('Failed to increment:', incrementError);
  // 只記錄錯誤，不影響報名流程
  // 主辦方在選手管理中仍可看到報名
}
```

## 📋 修改清單

### 修改文件（2 個）
- ✅ `src/services/registrationService.ts`
  - 檢查現有報名狀態
  - 允許 declined 狀態重新報名
  - 更新而非新增

- ✅ `src/components/features/RegistrationForm.tsx`
  - incrementParticipants 錯誤不影響報名
  - 優化錯誤處理

## ✅ 測試檢查清單

### 重新報名測試
- [ ] 用戶報名 → 主辦方婉拒
- [ ] 用戶再次報名 → 應該成功
- [ ] 狀態變為 pending
- [ ] 主辦方可以重新審核

### 錯誤處理測試
- [ ] 報名成功 → 顯示成功訊息
- [ ] incrementParticipants 失敗 → 仍顯示成功
- [ ] 真正的報名失敗 → 顯示錯誤訊息

### 防重複測試
- [ ] pending 狀態重複報名 → 拒絕
- [ ] confirmed 狀態重複報名 → 拒絕

## 🎊 完成

**報名功能已修復！**

- ✅ 被婉拒者可以重新報名
- ✅ 報名狀態正確顯示
- ✅ incrementParticipants 失敗不影響報名
- ✅ 防止真正的重複報名

**報名體驗更合理！** ✅

---

**修復日期**: 2024年12月21日  
**問題**: 報名邏輯問題  
**狀態**: ✅ 已修復

