# 場地刪除權限修復

## 🐛 問題

**場地無法刪除** - 權限錯誤

## 🔍 問題原因

### Firestore 規則問題

```javascript
// 舊規則（有問題）
allow delete: if isAuthenticated() &&
  get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.organizerId == request.auth.uid;
  // ↑ 刪除時 resource.data 無法訪問（文檔已刪除）
```

**問題**：

- 刪除操作時，`resource.data` 指向被刪除的文檔
- 但刪除後無法讀取其 `tournamentId`
- 導致權限檢查失敗

## 修復方案

### 1. 在 Court 文檔中添加 organizerId

```typescript
// courtService.ts
export const createCourt = async (...) => {
  // 獲取 tournament 的 organizerId
  const tournament = await getTournament(tournamentId);

  await addDoc(collection(db, "courts"), {
    tournamentId,
    organizerId: tournament.organizerId,  // ← 新增
    name: courtData.name,
    ...
  });
};
```

### 2. 簡化 Firestore 規則

```javascript
// 新規則（已修復）
match /courts/{courtId} {
  allow create: if isAuthenticated() &&
    request.resource.data.organizerId == request.auth.uid;

  allow update: if isAuthenticated() &&
    resource.data.organizerId == request.auth.uid;

  allow delete: if isAuthenticated() &&
    resource.data.organizerId == request.auth.uid;
    // ↑ 直接檢查 organizerId，不需要查詢 tournament
}
```

## 🎯 修復效果

### 刪除流程

```
1. 主辦方點擊「刪除」
2. 確認對話框
3. 執行 deleteCourt(tournamentId, courtId)
4. Firestore 檢查：
   - resource.data.organizerId == request.auth.uid ✓
5. 刪除成功
```

## 📋 修改清單

### 修改文件（2 個）

- `src/services/courtService.ts`

- createCourt 添加 organizerId 參數
- 自動獲取 tournament.organizerId
- 存儲到 court 文檔

- `firestore.rules`
- 簡化 courts 規則
- 直接使用 organizerId
- 不需要查詢 tournament

### 部署狀態

- Firestore Rules 已部署
- Hosting 已部署

## 🎊 完成

**場地刪除功能已修復！**

- 權限規則簡化
- organizerId 直接存儲
- 刪除功能正常

**現在可以正常刪除場地了！**

---

## 關於「場地分類型層級」

我理解您可能想要：

- 場地按分類管理（就像選手管理一樣）
- 每個分類有專屬場地
- 或者場地可以標記用於哪個分類

**請確認您想要的設計方式，我可以立即實施！**

---

**修復日期**: 2024 年 12 月 21 日  
**問題**: 場地無法刪除  
**原因**: Firestore 規則權限檢查錯誤  
**解決**: 添加 organizerId + 簡化規則  
**狀態**: 已修復並部署
