# 選手管理功能改進

## 🎯 問題與解決方案

### 問題 1：沒有檢查名額上限 ❌
**舊邏輯**：
- 無論名額是否已滿，都可以繼續新增選手
- 可能導致超額報名

**新邏輯**：✅
```typescript
// 檢查是否超過名額
if (currentCategoryData.currentParticipants >= currentCategoryData.maxParticipants) {
  alert(`已達名額上限（${currentCategoryData.maxParticipants} 人/組）`);
  return;
}
```

### 問題 2：沒有顯示統計資訊 ❌
**舊介面**：
- 只顯示選手列表
- 不知道總數、已確認數、剩餘名額

**新介面**：✅
```
┌──── 統計卡片 ────┐
│ 總報名  已確認  待審核  名額上限  剩餘名額 │
│   18      15      3       20       2    │
└──────────────────┘
```

## 🎨 新增統計卡片

### UI 設計

```
┌─────────────────────────────────────────┐
│ [男子雙打 (18/20)] [女子單打 (12/16)] │
├─────────────────────────────────────────┤
│ === 男子雙打 ===                        │
│                                         │
│ ┌──── 報名統計 ────────────────────┐   │
│ │                                   │   │
│ │ 總報名  已確認  待審核  上限  剩餘│   │
│ │   18     15      3      20    2  │   │
│ │                           (警告)  │   │
│ └───────────────────────────────────┘   │
│                                         │
│ [+ 手動新增隊伍] [🧪 測試數據]         │
│                                         │
│ 報名隊伍列表                            │
│ ...                                     │
└─────────────────────────────────────────┘
```

### 統計項目

1. **總報名**
   - 單打：所有非拒絕的選手數量
   - 雙打：所有非拒絕的隊伍數量

2. **已確認**
   - 單打：status === "confirmed" 的選手
   - 雙打：status === "confirmed" 的隊伍

3. **待審核**
   - 單打：status === "pending" 的選手
   - 雙打：status === "pending" 的隊伍

4. **名額上限**
   - 顯示 `category.maxParticipants`

5. **剩餘名額** 🎨 顏色標示
   - 綠色：剩餘 > 3
   - 黃色：剩餘 1-3（即將滿額）
   - 紅色：剩餘 0（已滿額）

## 🔒 名額限制邏輯

### 手動新增限制

```typescript
// 在 handleAdd 中檢查
if (currentCategoryData.currentParticipants >= currentCategoryData.maxParticipants) {
  alert(`已達名額上限（${currentCategoryData.maxParticipants} 人/組）`);
  return; // 阻止新增
}
```

### 測試數據生成限制

```typescript
// 計算剩餘名額
const remainingSlots = maxParticipants - currentParticipants;

// 檢查是否足夠
if (count > remainingSlots) {
  alert(`剩餘名額不足！
    目前：18/20
    剩餘：2 組
    您想新增：10 組`);
  return; // 阻止生成
}
```

### 批准時的自動更新

```typescript
// 批准後自動重新載入 category 數據
const categoryData = await getCategoryById(tournamentId, activeCategory);
setCurrentCategoryData(categoryData); // 更新統計

// 通知父組件更新
if (onCategoriesUpdate) {
  onCategoriesUpdate(); // TournamentDashboard 重新載入 categories
}
```

## 🎨 顏色系統

### 剩餘名額顏色

```scss
.statValue {
  &.statSuccess {
    color: $success-color; // 綠色 - 充足
  }
  
  &.statWarning {
    color: $warning-color; // 黃色 - 即將滿額
  }
  
  &.statDanger {
    color: $error-color; // 紅色 - 已滿額
  }
}
```

### 判斷邏輯

```typescript
remaining > 3  → 綠色（充足）
remaining 1-3  → 黃色（即將滿額）
remaining === 0 → 紅色（已滿額）
```

## 📊 使用場景

### 場景 1：監控報名進度

主辦方進入選手管理，立即看到：
```
總報名: 18    ← 有多少人/隊報名了
已確認: 15    ← 有多少已經批准
待審核: 3     ← 還有多少需要審核
名額上限: 20  ← 總共可以收多少
剩餘名額: 2   ← 還可以收多少（黃色警告）
```

### 場景 2：手動新增時的保護

```
目前：19/20
剩餘：1 組（黃色）

主辦方點擊「手動新增隊伍」
  → 成功新增 1 組
  → 現在：20/20
  → 剩餘：0（紅色）

主辦方再次點擊「手動新增隊伍」
  → ❌ 彈出警告：「已達名額上限（20 組）」
  → 無法新增
```

### 場景 3：測試數據保護

```
目前：15/20
剩餘：5 組

主辦方點擊「🧪 測試數據」
  → 輸入數量：10
  → ❌ 彈出警告：
     「剩餘名額不足！
      目前：15/20
      剩餘：5 組
      您想新增：10 組」
  → 無法生成

主辦方修改為：5
  → ✅ 成功生成 5 組測試隊伍
  → 現在：20/20（已滿額）
```

### 場景 4：批准審核時的更新

```
總報名: 18
已確認: 15
待審核: 3  ← 有 3 個待審核

主辦方批准 1 個
  → ✅ 統計自動更新：
     已確認: 16 ↑
     待審核: 2 ↓
```

## 🔄 數據同步機制

### 組件內部狀態
```typescript
const [currentCategoryData, setCurrentCategoryData] = useState<Category | null>(null);
```

### 載入時更新
```typescript
useEffect(() => {
  const loadParticipants = async () => {
    // 1. 載入最新的 category 數據
    const categoryData = await getCategoryById(tournamentId, activeCategory);
    setCurrentCategoryData(categoryData);
    
    // 2. 載入選手/隊伍
    if (categoryData.matchType === "singles") {
      const playersData = await getPlayers(tournamentId);
      setPlayers(playersData);
    } else {
      const teamsData = await getTeamsByCategory(tournamentId, activeCategory);
      setTeams(teamsData);
    }
  };
}, [activeCategory]);
```

### 操作後更新
```typescript
// 新增、批准、婉拒後都會重新載入
const categoryData = await getCategoryById(tournamentId, activeCategory);
setCurrentCategoryData(categoryData);

// 通知父組件（TournamentDashboard）更新
if (onCategoriesUpdate) {
  onCategoriesUpdate();
}
```

## 📋 修改清單

### 修改文件
- ✅ `CategoryPlayersManager.tsx`
  - 添加統計卡片
  - 添加名額檢查（手動新增）
  - 添加名額檢查（測試數據）
  - 添加 onCategoriesUpdate 回調
  - 使用 currentCategoryData 狀態

- ✅ `CategoryPlayersManager.module.scss`
  - 添加統計卡片樣式
  - 添加顏色狀態樣式

- ✅ `TournamentDashboard.tsx`
  - 添加 loadCategoriesData 函數
  - 傳遞 onCategoriesUpdate 回調

## ✅ 測試檢查清單

### 統計顯示
- [x] 總報名數正確
- [x] 已確認數正確
- [x] 待審核數正確
- [x] 名額上限正確
- [x] 剩餘名額正確
- [x] 剩餘名額顏色正確
  - [x] 綠色（充足）
  - [x] 黃色（即將滿額）
  - [x] 紅色（已滿額）

### 名額限制
- [x] 手動新增檢查名額
- [x] 測試數據檢查名額
- [x] 批准時不超過名額
- [x] 顯示清晰的錯誤訊息

### 數據同步
- [x] 切換分類時更新統計
- [x] 新增後更新統計
- [x] 批准後更新統計
- [x] 婉拒後更新統計

## 🎨 UI 預覽

### 名額充足（綠色）
```
┌──────────────────────────────────┐
│ 總報名  已確認  待審核  上限  剩餘│
│   12     10      2      20    8  │
│                           ✅ 綠色│
└──────────────────────────────────┘
```

### 即將滿額（黃色）
```
┌──────────────────────────────────┐
│ 總報名  已確認  待審核  上限  剩餘│
│   18     15      3      20    2  │
│                           ⚠️ 黃色│
└──────────────────────────────────┘
```

### 已滿額（紅色）
```
┌──────────────────────────────────┐
│ 總報名  已確認  待審核  上限  剩餘│
│   20     18      2      20    0  │
│                           🔴 紅色│
└──────────────────────────────────┘
```

## 🚀 優勢

1. **即時監控** - 一眼看出報名狀態
2. **防止超額** - 自動阻止超過名額的操作
3. **清晰提示** - 顏色標示剩餘名額狀況
4. **數據準確** - 所有操作後自動更新統計
5. **用戶友好** - 清晰的錯誤訊息

## 📝 錯誤訊息範例

### 手動新增超額
```
❌ 已達名額上限（20 組）
```

### 測試數據超額
```
❌ 剩餘名額不足！
   目前：18/20
   剩餘：2 組
   您想新增：10 組
```

---

## 🎉 完成

**選手管理功能已全面改進！**

現在具備：
- ✅ 完整的統計資訊顯示
- ✅ 名額上限檢查
- ✅ 智能顏色標示
- ✅ 自動數據同步
- ✅ 清晰的錯誤提示

**主辦方可以精確掌控每個分類的報名狀況！** 📊

---

**更新日期**: 2024年12月21日  
**狀態**: ✅ 已實施  
**影響**: 選手管理更安全、更直觀

