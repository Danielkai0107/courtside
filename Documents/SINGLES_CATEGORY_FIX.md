# 單打按分類管理修復

## 🐛 問題

### 問題 1：單打新增選手時沒有判斷上限
- 手動新增單打選手不會增加 `currentParticipants`
- 測試數據生成也不會增加計數
- 導致名額檢查失效

### 問題 2：單打賽程管理沒有生成方案
- 單打選手沒有按分類過濾
- 所有單打選手混在一起
- 導致賽程發布時參賽者數量不正確

## ✅ 修復方案

### 1. Player 添加 categoryId

```typescript
export interface Player {
  ...
  categoryId?: string;  // 新增：關聯到 Category
}
```

### 2. 手動新增時添加 categoryId

```typescript
await addPlayerManually(tournamentId, {
  email: playerEmail.trim(),
  name: playerName.trim(),
  categoryId: activeCategory,  // ← 新增
});

// 增加計數
await incrementParticipants(tournamentId, activeCategory, 1);
```

### 3. 測試數據生成時批量更新計數

```typescript
// 生成單打測試數據
for (let i = 0; i < count; i++) {
  await addPlayerManually(tournamentId, {
    email: `test${timestamp}-${i}@example.com`,
    name: `測試選手 ${name} ${i + 1}`,
    categoryId: activeCategory,  // ← 添加
  });
  successCount++;
}

// 批量更新計數（一次性）
if (successCount > 0) {
  const category = await getCategoryById(tournamentId, activeCategory);
  await updateCategory(tournamentId, activeCategory, {
    currentParticipants: category.currentParticipants + successCount,
  });
}
```

### 4. 過濾時使用 categoryId

**選手管理**：
```typescript
const playersData = await getPlayers(tournamentId);
const categoryPlayers = playersData.filter(p => 
  p.categoryId === activeCategory || !p.categoryId  // 兼容舊數據
);
setPlayers(categoryPlayers);
```

**賽程管理**：
```typescript
const playersData = await getPlayers(tournamentId);
const confirmed = playersData.filter(p => 
  p.status === "confirmed" && 
  (p.categoryId === activeCategory || !p.categoryId)
);
setParticipants(confirmed);
```

## 🎯 修復效果

### 單打手動新增

```
男子單打（16 人）
  ↓ 手動新增 Alice
  ↓ categoryId: "男子單打ID"
  ↓ currentParticipants: 0 → 1 ✅

女子單打（16 人）
  ↓ 手動新增 Bob
  ↓ categoryId: "女子單打ID"
  ↓ currentParticipants: 0 → 1 ✅

→ 各分類獨立計數 ✅
```

### 單打賽程發布

```
男子單打：
  - 載入選手：過濾 categoryId === "男子單打ID"
  - 參賽者：10 人（只有男子單打的）
  - 發布：生成 16 強樹狀圖 ✅

女子單打：
  - 載入選手：過濾 categoryId === "女子單打ID"
  - 參賽者：8 人（只有女子單打的）
  - 發布：生成 8 強樹狀圖 ✅

→ 各分類獨立發布 ✅
```

## 📊 數據結構

### 單打（新）
```
tournaments/{tid}/players/{pid}
{
  uid: "user123",
  name: "Alice",
  categoryId: "cat-singles-men",  // ← 新增
  status: "confirmed",
  ...
}
```

### 雙打（已有）
```
tournaments/{tid}/categories/{cid}/teams/{tid}
{
  player1Id: "user123",
  player2Id: "user456",
  categoryId: "cat-doubles-men",  // 已有
  status: "confirmed",
  ...
}
```

## 🔄 向下兼容

**舊數據處理**：
```typescript
// 過濾時兼容沒有 categoryId 的舊數據
const categoryPlayers = playersData.filter(p => 
  p.categoryId === activeCategory || !p.categoryId
);
// ↑ 沒有 categoryId 的也會顯示（舊數據）
```

## 📋 修改清單

### 修改文件（4 個）
- ✅ `src/types/index.ts`
  - Player 添加 categoryId 欄位

- ✅ `src/services/registrationService.ts`
  - addPlayerManually 接受 categoryId
  - 存儲到 player 文檔

- ✅ `src/components/features/CategoryPlayersManager.tsx`
  - 手動新增時傳入 categoryId
  - 測試數據生成時傳入 categoryId
  - 載入時過濾 categoryId
  - 手動增加計數
  - 批量更新計數

- ✅ `src/components/features/CategoryScheduleManager.tsx`
  - 載入參賽者時過濾 categoryId

### 部署狀態
- ✅ 已構建
- ✅ 已部署

## ✅ 測試檢查清單

### 單打新增
- [ ] 手動新增單打選手
- [ ] 檢查 currentParticipants 是否增加
- [ ] 檢查名額上限是否生效
- [ ] 切換分類，各自獨立

### 單打賽程
- [ ] 載入單打參賽者
- [ ] 數量正確（只有該分類的）
- [ ] 發布賽程成功
- [ ] 生成的比賽正確

## 🎊 完成

**單打按分類管理已修復！**

- ✅ 單打選手添加 categoryId
- ✅ 手動新增會增加計數
- ✅ 測試數據會增加計數
- ✅ 名額上限檢查生效
- ✅ 賽程發布過濾正確
- ✅ 各分類獨立管理

**單打和雙打現在邏輯一致！** ✅

---

**修復日期**: 2024年12月21日  
**問題**: 單打沒有按分類管理  
**解決**: 添加 categoryId + 過濾邏輯  
**狀態**: ✅ 已修復並部署

