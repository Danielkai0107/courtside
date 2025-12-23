# 紀錄員視角 UI 一致性改進

## 🎯 設計理念

**紀錄員應該看到與選手相同的賽事結構**，但點擊比賽時導航到計分頁面。

## 🔄 改進對比

### 修復前：舊的單層列表

```
TournamentMatches（紀錄員視角）
├── 所有場次
├── 第 1 輪
│   ├── Match 1
│   ├── Match 2
│   └── ...
├── 第 2 輪
│   ├── Match 3
│   └── ...
└── 決賽
```

**問題**：

- 沒有分類（混在一起）
- 沒有小組賽積分榜
- 不符合標準賽事 UI

### 修復後：與 CategoryDetail 一致

```
TournamentMatches（紀錄員視角）
├── Category Tabs: [男子雙打] [女子單打]
└── Main Tabs: [小組] [對陣圖] [球員]
    │
    ├── 小組 Tab
    │   ├── Group A（積分榜）
    │   │   └── [查看比賽] → 展開比賽列表
    │   └── Group B（積分榜）
    │
    ├── 對陣圖 Tab
    │   ├── Sub-tabs: [QF] [SF] [FI]
    │   └── 比賽列表（點擊 → 計分頁面）
    │
    └── 球員 Tab
        └── 參賽者列表
```

**改進**：

- 按分類組織（與選手視角一致）
- 小組積分榜（與選手視角一致）
- 對陣圖分輪次（與選手視角一致）
- 點擊比賽 → 計分頁面（紀錄員專屬）

## 🎨 UI 效果

### Category Tabs

```
┌─────────────────────────────────┐
│ [男子雙打] [女子單打]          │
│    ↑ 選中                       │
└─────────────────────────────────┘
```

### 小組 Tab（默認顯示積分榜）

```
┌──────────────────────────────────┐
│ Group A               [查看比賽 →]│
├──────────────────────────────────┤
│ 球員/隊伍          PTS  W  L  PD │
│ 1. Alice / Bob      6   3  0  +15│ ← 綠線
│ 2. Carol / Dave     4   2  1   +8│ ← 綠線
│ 3. Eve / Frank      2   1  2   -5│
└──────────────────────────────────┘
```

### 點擊「查看比賽」（展開）

```
┌──────────────────────────────────┐
│ Group A               [收起 →]   │
├──────────────────────────────────┤
│ ┌─ Match 1 ─────────────────┐   │
│ │ Alice/Bob vs Carol/Dave   │   │
│ │ 21 - 19  已完成           │   │
│ └───────────────────────────┘   │
│ ← 點擊進入計分頁面              │
│                                  │
│ ┌─ Match 2 ─────────────────┐   │
│ │ Alice/Bob vs Eve/Frank    │   │
│ │ 待開始                    │   │
│ └───────────────────────────┘   │
│ ← 點擊進入計分頁面              │
└──────────────────────────────────┘
```

### 對陣圖 Tab

```
┌──────────────────────────────────┐
│ [QF] [SF] [FI]                   │
│  ↑ 選中                          │
├──────────────────────────────────┤
│ ┌─ QF Match 1 ───────────────┐  │
│ │ 待分配場地        待開始    │  │
│ │ Group A #1          0       │  │
│ │ Group B #2          0       │  │
│ └─────────────────────────────┘  │
│ ← 點擊進入計分頁面              │
└──────────────────────────────────┘
```

## 🔗 導航邏輯

### 選手視角（EventDetail → CategoryDetail）

```
點擊比賽 → 查看比賽詳情（只讀）
```

### 紀錄員視角（TournamentMatches）

```
點擊比賽 → 進入計分頁面（可操作）
navigate(`/scorer/matches/${match.id}`)
```

## 📦 實現細節

### 共用的邏輯

**小組積分榜計算**：

```typescript
import { calculateGroupStandings } from "../../services/standingsService";

const standings = calculateGroupStandings(groupMatches, groupParticipants);
```

**對陣圖 Tabs 生成**：

```typescript
const roundLabels = Array.from(
  new Set(knockoutMatches.map((m) => m.roundLabel).filter(Boolean))
);

const labelOrder = ["R32", "R16", "QF", "SF", "3RD", "FI"];
const tabs = labelOrder
  .filter((label) => roundLabels.includes(label))
  .map((label) => ({ id: label.toLowerCase(), label }));
```

### 紀錄員專屬的邏輯

**點擊導航**：

```typescript
<div
  className={styles.matchCard}
  onClick={() => navigate(`/scorer/matches/${match.id}`)}
>
  {/* 比賽內容 */}
</div>
```

**即時監聽**：

```typescript
const unsubscribe = subscribeMatchesByTournament(id, (updatedMatches) => {
  setMatches(updatedMatches); // 即時更新比賽狀態
});
```

## 🎯 使用場景

### 紀錄員查看小組賽

```
1. 紀錄員登入
2. 進入「我的賽事」
3. 點擊賽事卡片
4. 看到 Category Tabs：[男子雙打] [女子單打]
5. 選擇「男子雙打」
6. 默認顯示「小組」Tab
7. 看到 Group A, B, C 的積分榜
8. 點擊「查看比賽」
9. 展開該組的所有比賽
10. 點擊某場比賽
11. → 進入計分頁面
12. 記錄比分
```

### 紀錄員查看對陣圖

```
1. 進入賽事頁面
2. 選擇分類
3. 點擊「對陣圖」Tab
4. 看到 Sub-tabs：[QF] [SF] [FI]
5. 點擊 QF
6. 看到 8 強的 4 場比賽
7. 點擊某場比賽
8. → 進入計分頁面
```

## 📊 一致性對照

| 功能            | 選手視角（CategoryDetail） | 紀錄員視角（TournamentMatches） |
| --------------- | -------------------------- | ------------------------------- |
| Category Tabs   |                            |                                 |
| Main Tabs       |                            |                                 |
| 小組積分榜      |                            |                                 |
| 查看比賽按鈕    |                            |                                 |
| 對陣圖 Sub-tabs |                            |                                 |
| 比賽狀態顯示    |                            |                                 |
| 比分顯示        |                            |                                 |
| 點擊比賽        | 查看詳情                   | **進入計分** ⭐                 |
| 即時更新        | -                          |                                 |

## 📋 修改清單

### 修改文件

- `src/pages/scorer/TournamentMatches.tsx`
- 導入 Categories, Tabs, Standings
- 添加 Category Tabs
- 添加 Main Tabs（小組/對陣圖/球員）
- 實現小組積分榜
- 實現對陣圖分輪次
- 保持點擊導航到計分頁面

- `src/pages/scorer/TournamentMatches.module.scss`
- 添加小組賽樣式（與 CategoryDetail 一致）
- 添加積分榜樣式
- 添加對陣圖樣式
- 添加球員列表樣式

### 共用的 Service

- `standingsService.ts` - 積分榜計算（兩個頁面共用）

## 功能檢查清單

### UI 一致性

- [x] Category Tabs 顯示
- [x] Main Tabs 顯示
- [x] 小組積分榜（與選手視角一致）
- [x] 對陣圖輪次（與選手視角一致）
- [x] 樣式風格一致

### 紀錄員功能

- [x] 點擊比賽進入計分
- [x] 即時監聽比賽更新
- [x] 顯示比賽狀態
- [x] 顯示比分
- [x] 顯示場地

### 賽制支援

- [x] 純淘汰賽
- [x] 小組賽 + 淘汰賽
- [x] 單打
- [x] 雙打

## 🎊 完成

**紀錄員視角現在與選手視角完全一致！**

- 相同的 UI 結構
- 相同的積分榜顯示
- 相同的對陣圖組織
- 點擊進入計分（紀錄員專屬）
- 即時更新（紀錄員專屬）

**專業、一致、易用！** 🏆

---

**實施日期**: 2024 年 12 月 21 日  
**狀態**: 已完成  
**影響**: 紀錄員體驗大幅提升
