# CategoryDetail 顯示邏輯修復

## 🐛 問題描述

### 問題 1：小組賽不顯示

- 小組 Tab 只顯示「小組資訊尚未設定」
- 實際上小組賽比賽已生成，但沒有載入和顯示

### 問題 2：對陣圖 Tabs 邏輯錯誤

- 使用舊的 `round` 數字來生成 tabs
- 應該使用新的 `roundLabel` (QF, SF, FI)
- 導致 tabs 可能不正確或缺失

### 問題 3：對陣圖過濾不準確

- 基於 `round` 數字過濾
- 應該基於 `roundLabel` 和 `stage`

## 修復方案

### 修復 1：小組賽顯示

**新邏輯**：

```typescript
// 1. 過濾小組賽比賽
const groupMatches = matches.filter((m: any) => m.stage === "group");

// 2. 按 groupLabel 分組
const groups: Record<string, any[]> = {};
groupMatches.forEach((match: any) => {
  const label = match.groupLabel || "A";
  if (!groups[label]) groups[label] = [];
  groups[label].push(match);
});

// 3. 顯示每個小組
Object.keys(groups)
  .sort()
  .map((groupLabel) => (
    <Card>
      <h3>Group {groupLabel}</h3>
      {groups[groupLabel].map((match) => (
        <div>
          {match.player1Name} vs {match.player2Name}
        </div>
      ))}
    </Card>
  ));
```

**UI 效果**：

```
小組 Tab：

┌────── Group A ──────┐
│ Alice vs Bob        │
│ 0 - 0  待開始       │
│                     │
│ Alice vs Carol      │
│ 2 - 1  已完成       │
│                     │
│ Bob vs Carol        │
│ 進行中              │
└─────────────────────┘

┌────── Group B ──────┐
│ Dave vs Eve         │
│ ...                 │
└─────────────────────┘
```

### 修復 2：對陣圖 Tabs 生成

**新邏輯**：

```typescript
// 使用 roundLabel 而非 round 數字
const knockoutMatches = matches.filter((m: any) => m.stage === "knockout");

const roundLabels = Array.from(
  new Set(knockoutMatches.map((m: any) => m.roundLabel).filter(Boolean))
);

const labelOrder = ["R32", "R16", "QF", "SF", "3RD", "FI"];
const tabs = labelOrder
  .filter((label) => roundLabels.includes(label))
  .map((label) => ({ id: label.toLowerCase(), label: label }));
```

**效果**：

```
對陣圖 Tabs：
[QF] [SF] [3RD] [FI]
  ↑ 根據實際生成的輪次動態顯示
```

### 修復 3：對陣圖過濾

**新邏輯**：

```typescript
const getFilteredMatches = () => {
  const knockoutMatches = matches.filter((m: any) => m.stage === "knockout");
  const selectedRoundLabel = bracketTab.toUpperCase();

  return knockoutMatches.filter(
    (m: any) => m.roundLabel === selectedRoundLabel
  );
};
```

**效果**：

- 點擊 QF → 只顯示 roundLabel === "QF" 的比賽
- 點擊 SF → 只顯示 roundLabel === "SF" 的比賽
- 點擊 FI → 只顯示 roundLabel === "FI" 的比賽

## 🎨 修復後的完整 UI

### 小組 Tab

```
┌───────────────────────────────┐
│ === Group A ===               │
│                               │
│ 測試選手 A vs 測試選手 B      │
│ 狀態：已完成  比分：21-19     │
│                               │
│ 測試選手 A vs 測試選手 C      │
│ 狀態：待開始  比分：0-0       │
│                               │
│ 測試選手 B vs 測試選手 C      │
│ 狀態：進行中                  │
├───────────────────────────────┤
│ === Group B ===               │
│                               │
│ 測試選手 D vs 測試選手 E      │
│ ...                           │
└───────────────────────────────┘
```

### 對陣圖 Tab - 正確的輪次顯示

```
┌───────────────────────────────┐
│ Tabs: [QF] [SF] [3RD] [FI]   │
│        ↑ 選中                 │
├───────────────────────────────┤
│ === QF (8強) ===              │
│                               │
│ ┌─ Match 1 ─────────────┐    │
│ │ 待分配場地      待開始  │    │
│ │ Group A #1        0    │    │
│ │ Group B #2        0    │    │
│ └────────────────────────┘    │
│                               │
│ ┌─ Match 2 ─────────────┐    │
│ │ 待分配場地      待開始  │    │
│ │ Group C #1        0    │    │
│ │ Group D #2        0    │    │
│ └────────────────────────┘    │
└───────────────────────────────┘
```

## 📊 支援的賽制

### 純淘汰賽

```
對陣圖 Tabs：[QF] [SF] [FI]
小組 Tab：顯示「此分類使用純淘汰賽，無小組賽階段」
球員 Tab：顯示所有參賽者
```

### 小組賽 + 淘汰賽

```
對陣圖 Tabs：[QF] [SF] [FI]
小組 Tab：顯示 Group A, B, C...的比賽
球員 Tab：顯示所有參賽者
```

## 🔧 技術實現

### Match 數據結構（新）

```typescript
{
  stage: "group",          // ← 用於區分小組賽/淘汰賽
  groupLabel: "A",         // ← 用於小組賽分組
  roundLabel: "QF",        // ← 用於淘汰賽輪次
  player1Name: "...",
  player2Name: "...",
  status: "COMPLETED",
}
```

### 過濾邏輯

**小組賽**：

```typescript
matches.filter(m => m.stage === "group")
  → 按 groupLabel 分組
  → 顯示各組比賽
```

**淘汰賽**：

```typescript
matches.filter(m => m.stage === "knockout")
  → 收集所有 roundLabel
  → 生成 Tabs
  → 按 roundLabel 過濾顯示
```

## 🎯 使用場景

### 場景 1：查看小組賽進度

```
1. 進入分類詳情頁
2. 點擊「小組」Tab
3. 看到：
   - Group A 的 3 場比賽
   - Group B 的 3 場比賽
   - Group C 的 3 場比賽
   - Group D 的 3 場比賽
4. 每場顯示狀態和比分
```

### 場景 2：查看淘汰賽

```
1. 進入分類詳情頁
2. 點擊「對陣圖」Tab
3. 看到子 Tabs：[QF] [SF] [FI]
4. 點擊 QF
5. 看到：
   - 4 場 8 強比賽
   - 顯示選手名稱（或 TBC）
   - 顯示狀態和比分
```

### 場景 3：小組賽結束後查看淘汰賽

```
1. 小組賽全部完成
2. 點擊「對陣圖」Tab → QF
3. 看到：
   - Group A #1 vs Group B #2
   - 選手名稱已填入（小組第一、第二名）
   - 狀態：待開始
```

## 📋 修改清單

### 修改文件

- `CategoryDetail.tsx`
- 重寫 bracket tabs 生成邏輯（使用 roundLabel）
- 重寫過濾邏輯（使用 stage 和 roundLabel）
- 實現小組賽顯示邏輯
- 添加小組賽分組和顯示

- `CategoryDetail.module.scss`
- 添加小組賽卡片樣式
- 添加小組標題樣式
- 添加小組比賽行樣式

### 新增樣式

- `.groupCard` - 小組卡片
- `.groupTitle` - 小組標題
- `.groupMatches` - 小組比賽列表
- `.groupMatchRow` - 單場比賽行
- `.groupMatchPlayers` - 比賽選手
- `.groupMatchStatus` - 比賽狀態/比分

## 測試檢查清單

### 小組賽顯示

- [x] 小組 Tab 顯示所有小組
- [x] 每個小組顯示標題（Group A, B, C...）
- [x] 每個小組顯示所有比賽
- [x] 顯示比賽狀態（待開始/進行中/已完成）
- [x] 顯示比分（已完成的比賽）
- [x] 純淘汰賽顯示提示訊息

### 對陣圖顯示

- [x] 對陣圖 Tabs 正確生成
- [x] 顯示實際存在的輪次（R16, QF, SF, FI）
- [x] 點擊 Tab 正確過濾比賽
- [x] 顯示選手名稱或 TBC
- [x] 顯示比賽狀態
- [x] 顯示比分

### 球員 Tab

- [x] 單打顯示選手列表
- [x] 雙打顯示隊伍列表
- [x] 顯示頭像

## 🔍 Debug 信息

### 檢查要點

1. **檢查 matches 數據**

   ```javascript
   console.log("All matches:", matches);
   console.log(
     "Group matches:",
     matches.filter((m) => m.stage === "group")
   );
   console.log(
     "Knockout matches:",
     matches.filter((m) => m.stage === "knockout")
   );
   ```

2. **檢查 groupLabel**

   ```javascript
   const groupLabels = matches
     .filter((m) => m.stage === "group")
     .map((m) => m.groupLabel);
   console.log("Group labels:", groupLabels);
   ```

3. **檢查 roundLabel**
   ```javascript
   const roundLabels = matches
     .filter((m) => m.stage === "knockout")
     .map((m) => m.roundLabel);
   console.log("Round labels:", roundLabels);
   ```

## 📝 預期結果

### 小組賽 + 淘汰賽（20 人，4 組 → 8 強）

**小組 Tab**：

```
Group A: 10 場比賽（5 選手循環）
Group B: 10 場比賽
Group C: 10 場比賽
Group D: 10 場比賽
總共：40 場小組賽
```

**對陣圖 Tabs**：

```
[QF] [SF] [FI]

QF: 4 場（8 強）
SF: 2 場（準決賽）
FI: 1 場（決賽）
總共：7 場淘汰賽
```

### 純淘汰賽（10 人 → 16 強）

**小組 Tab**：

```
「此分類使用純淘汰賽，無小組賽階段」
```

**對陣圖 Tabs**：

```
[R16] [QF] [SF] [FI]

R16: 8 場（16 強，其中 6 個 BYE）
QF: 4 場（8 強）
SF: 2 場（準決賽）
FI: 1 場（決賽）
總共：15 場
```

## 🎊 修復完成

**CategoryDetail 頁面現在可以正確顯示**：

- 小組賽按 groupLabel 分組顯示
- 對陣圖按 roundLabel 分 Tabs
- 過濾邏輯基於新的數據結構
- 支援純淘汰和混合賽制
- 顯示比賽狀態和比分

**請重新查看賽程，應該可以正確顯示了！** 🚀

---

**修復日期**: 2024 年 12 月 21 日  
**問題**: 小組賽和對陣圖顯示不正確  
**原因**: 使用舊的 round 邏輯，未適配新的 stage/roundLabel  
**解決**: 重寫顯示邏輯，基於新數據結構  
**狀態**: 已修復
