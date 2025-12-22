# 報名狀態顯示邏輯（正確版本）

## 🎯 正確的報名邏輯

您說得完全對！讓我重新設計：

### 狀態流程

```
1. 未報名（none）
   → 顯示：可填寫表單
   → 按鈕：「確認報名」（可點擊）

2. 報名送出（pending）
   → 顯示：⏳ 您已報名此分類，等待主辦方確認中
   → 按鈕：「確認報名」（禁用）
   → 不能重複報名

3. 批准成功（confirmed）
   → 顯示：✓ 您已成功報名此分類
   → 按鈕：「確認報名」（禁用）
   → 不能重複報名

4. 被婉拒（declined）
   → 顯示：✗ 您的報名已被婉拒，可以重新報名
   → 按鈕：「重新報名」（可點擊）
   → 可以重新報名
```

## 🎨 UI 效果

### 狀態 1：未報名
```
┌────── 報名賽事 ──────┐
│                      │
│ 選擇分類:            │
│ ┌──────────────┐    │
│ │ 男子雙打     │    │
│ └──────────────┘    │
│                      │
│ 您的姓名:            │
│ ...                  │
│                      │
│     [取消] [確認報名] │ ← 可點擊
└──────────────────────┘
```

### 狀態 2：等待確認中
```
┌────── 報名賽事 ──────┐
│                      │
│ 選擇分類:            │
│ 男子雙打             │
│                      │
│ ⏳ 您已報名此分類，   │
│    等待主辦方確認中  │ ← 黃色提示
│                      │
│     [取消] [確認報名] │ ← 禁用
└──────────────────────┘
```

### 狀態 3：已確認
```
┌────── 報名賽事 ──────┐
│                      │
│ 選擇分類:            │
│ 男子雙打             │
│                      │
│ ✓ 您已成功報名此分類 │ ← 綠色提示
│                      │
│     [取消] [確認報名] │ ← 禁用
└──────────────────────┘
```

### 狀態 4：被婉拒
```
┌────── 報名賽事 ──────┐
│                      │
│ 選擇分類:            │
│ 男子雙打             │
│                      │
│ ✗ 您的報名已被婉拒， │
│    可以重新報名      │ ← 紅色提示
│                      │
│ 您的姓名:            │
│ ...                  │
│                      │
│     [取消] [重新報名] │ ← 可點擊
└──────────────────────┘
```

## 🔧 技術實現

### 1. 檢查報名狀態

```typescript
const checkCategoryRegistration = async (category) => {
  if (category.matchType === 'singles') {
    const players = await getPlayers(tournamentId);
    const myRegistration = players.find(p => p.uid === currentUser.uid);
    setRegistrationStatus(myRegistration?.status || 'none');
  } else {
    const myTeam = await getUserTeam(tournamentId, category.id, currentUser.uid);
    setRegistrationStatus(myTeam?.status || 'none');
  }
};
```

### 2. 根據狀態顯示 UI

```typescript
{registrationStatus === 'pending' && (
  <div className={styles.statusBadge} style={{ background: 'rgba(255, 193, 7, 0.1)' }}>
    ⏳ 等待確認中
  </div>
)}

{registrationStatus === 'confirmed' && (
  <div className={styles.statusBadge} style={{ background: 'rgba(0, 230, 118, 0.1)' }}>
    ✓ 已報名成功
  </div>
)}

{registrationStatus === 'declined' && (
  <div className={styles.statusBadge} style={{ background: 'rgba(255, 82, 82, 0.1)' }}>
    ✗ 已被婉拒，可重新報名
  </div>
)}
```

### 3. 按鈕狀態控制

```typescript
<Button
  type="submit"
  disabled={
    registrationStatus === 'pending' ||
    registrationStatus === 'confirmed'
  }
>
  {registrationStatus === 'declined' ? '重新報名' : '確認報名'}
</Button>
```

### 4. 提交驗證

```typescript
if (registrationStatus === 'pending') {
  setError('您已報名此分類，等待確認中');
  return;  // 阻止提交
}

if (registrationStatus === 'confirmed') {
  setError('您已成功報名此分類');
  return;  // 阻止提交
}

// declined 或 none 才允許提交
```

## 📊 完整流程

### 用戶視角

```
1. 點擊「報名」按鈕
   ↓
2. 選擇分類：男子雙打
   ↓ 系統自動檢查狀態
3. 顯示：表單可填寫
   按鈕：「確認報名」（可點擊）
   ↓
4. 填寫資料 → 送出
   ↓
5. 報名成功 → 關閉 Modal
   ↓
6. 再次點擊「報名」按鈕
   ↓
7. 選擇分類：男子雙打
   ↓ 系統自動檢查狀態
8. 顯示：⏳ 等待確認中（黃色）
   按鈕：「確認報名」（禁用）
   ↓
9. 切換分類：女子單打
   ↓ 系統自動檢查狀態
10. 顯示：表單可填寫（未報名）
    按鈕：「確認報名」（可點擊）
```

### 主辦方批准後

```
11. 主辦方批准男子雙打報名
    ↓
12. 用戶再次點擊「報名」
    ↓
13. 選擇分類：男子雙打
    ↓ 系統自動檢查狀態
14. 顯示：✓ 已成功報名此分類（綠色）
    按鈕：「確認報名」（禁用）
```

### 主辦方婉拒後

```
11. 主辦方婉拒男子雙打報名
    ↓
12. 用戶再次點擊「報名」
    ↓
13. 選擇分類：男子雙打
    ↓ 系統自動檢查狀態
14. 顯示：✗ 已被婉拒，可重新報名（紅色）
    按鈕：「重新報名」（可點擊）
    ↓
15. 填寫資料 → 送出
16. 狀態更新為 pending
17. 主辦方可以重新審核
```

## 📋 修改清單

### 修改文件
- ✅ `RegistrationForm.tsx`
  - 添加 registrationStatus 狀態
  - 切換分類時檢查狀態
  - 根據狀態顯示不同 UI
  - pending/confirmed 時禁用按鈕
  - declined 時按鈕文字改為「重新報名」
  - 提交時驗證狀態

- ✅ `RegistrationForm.module.scss`
  - 添加狀態徽章樣式

## ✅ 修復完成

**正確的報名狀態顯示邏輯！**

- ✅ pending：顯示「等待確認中」，禁用按鈕
- ✅ confirmed：顯示「已報名成功」，禁用按鈕
- ✅ declined：顯示「可重新報名」，啟用按鈕
- ✅ none：正常顯示表單，啟用按鈕
- ✅ 按鈕文字智能變化（確認報名 / 重新報名）
- ✅ 顏色清晰標示（黃/綠/紅）

**報名邏輯完全正確！** ✅

---

**修復日期**: 2024年12月21日  
**狀態**: ✅ 已修復並部署

