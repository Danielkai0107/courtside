# 場地分配策略優化

## 🎯 需求分析

### 當前邏輯（簡單輪流）

```typescript
// 簡單的 Round Robin
matchesNeedingCourts.forEach((match, index) => {
  const court = courts[index % courts.length];
  match.courtId = court.id;
});
```

**問題**：
- 沒有考慮賽制
- 沒有考慮小組
- 沒有考慮重要性

### 應該的邏輯（按賽制）

**方案 A：按小組分配（推薦）** ⭐
```
小組賽：
  - Group A 的所有比賽 → Court 01
  - Group B 的所有比賽 → Court 02
  - Group C 的所有比賽 → Court 03
  - Group D 的所有比賽 → Court 04

優點：
  - 觀眾容易跟隨（一直看同一個小組）
  - 選手方便（知道自己的場地）
  - 轉播方便（固定機位）
```

**方案 B：按輪次分配**
```
淘汰賽：
  - 第一輪（R16）：輪流分配
  - 八強（QF）：Court 01, 02
  - 準決賽（SF）：Court 01（中央球場）
  - 決賽（FI）：Court 01（中央球場）

優點：
  - 重要比賽在主場地
  - 有儀式感
```

**方案 C：混合策略**（最理想）
```
1. 小組賽：按小組固定場地
2. 淘汰賽初輪：輪流分配
3. 淘汰賽後期：集中到主場地
```

## 🔧 具體建議

### 小組賽場地分配

```typescript
function assignGroupStageCourts(groupMatches, courts) {
  // 按 groupLabel 分組
  const groups = {};
  groupMatches.forEach(m => {
    if (!groups[m.groupLabel]) groups[m.groupLabel] = [];
    groups[m.groupLabel].push(m);
  });

  // 為每個小組分配固定場地
  const groupLabels = Object.keys(groups).sort();
  groupLabels.forEach((label, index) => {
    const court = courts[index % courts.length];
    groups[label].forEach(match => {
      match.courtId = court.id;
      match.status = "SCHEDULED";
    });
  });
}

範例（4 組 + 3 個場地）：
  Group A（10 場）→ Court 01
  Group B（10 場）→ Court 02
  Group C（10 場）→ Court 03
  Group D（10 場）→ Court 01（循環）
```

### 淘汰賽場地分配

```typescript
function assignKnockoutCourts(knockoutMatches, courts) {
  // 按 roundLabel 分類
  const byRound = {
    R32: [],
    R16: [],
    QF: [],
    SF: [],
    FI: [],
    "3RD": []
  };

  knockoutMatches.forEach(m => {
    if (byRound[m.roundLabel]) {
      byRound[m.roundLabel].push(m);
    }
  });

  // 後期比賽優先分配到前面的場地（通常是主場地）
  const priorityOrder = ["FI", "3RD", "SF", "QF", "R16", "R32"];
  
  priorityOrder.forEach(roundLabel => {
    byRound[roundLabel]?.forEach((match, index) => {
      if (roundLabel === "FI" || roundLabel === "SF") {
        // 決賽和準決賽：使用第一個場地（主場地）
        match.courtId = courts[0]?.id;
      } else {
        // 其他輪次：輪流分配
        match.courtId = courts[index % courts.length]?.id;
      }
      match.status = "SCHEDULED";
    });
  });
}

範例（3 個場地）：
  決賽（1 場）→ Court 01（主場地）
  準決賽（2 場）→ Court 01
  八強（4 場）→ Court 01, 02, 03, 01
```

## 💡 我的問題

**請確認您想要的邏輯**：

### 選項 1：按小組固定場地（推薦）⭐
```
Group A → Court 01
Group B → Court 02
...
```
適合：有多個小組的賽事

### 選項 2：按輪次分配
```
R16 → 輪流分配
QF → Court 01, 02
SF → Court 01
FI → Court 01
```
適合：純淘汰賽

### 選項 3：混合策略
```
小組賽 → 按小組
淘汰賽 → 按輪次 + 主場地
```
適合：小組賽 + 淘汰賽

### 選項 4：簡單輪流（當前）
```
所有比賽 → 輪流分配
```
最簡單，但不夠專業

---

## ✅ 已實施：混合策略（最專業）

### 實施的邏輯

**小組賽**：按小組固定場地
```
Group A 所有比賽 → Court 01
Group B 所有比賽 → Court 02
Group C 所有比賽 → Court 03
Group D 所有比賽 → Court 01（循環）
```

**淘汰賽**：按輪次 + 主場地
```
決賽（FI）→ Court 01（主場地）
季軍賽（3RD）→ Court 01
準決賽（SF）→ Court 01
八強（QF）→ Court 01, 02, 03, 01（輪流）
16 強（R16）→ 輪流分配
```

### 優點

1. **小組賽固定場地** ✅
   - 觀眾容易跟隨
   - 選手知道自己的場地
   - 轉播方便

2. **決賽在主場地** ✅
   - 儀式感
   - 集中觀眾
   - 符合國際標準

3. **充分利用場地** ✅
   - 初輪多場同時進行
   - 後期集中精彩比賽

### 效果範例

**4 組小組賽 + 8 強淘汰（3 個場地）**：
```
小組賽分配：
  Group A（10 場）→ Court 01
  Group B（10 場）→ Court 02
  Group C（10 場）→ Court 03
  Group D（10 場）→ Court 01

淘汰賽分配：
  QF（4 場）→ Court 01, 02, 03, 01
  SF（2 場）→ Court 01
  FI（1 場）→ Court 01
```

**優勢**：
- Group A 和 D 的觀眾都在 Court 01
- 決賽在 Court 01（主場地）
- 八強可以 3 場同時進行

---

**實施狀態**: ✅ 已完成  
**策略**: 混合策略（小組固定 + 淘汰主場地）  
**適用**: 所有賽制


