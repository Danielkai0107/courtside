# 三層賽事架構重構實施總結

## 概述

成功將 SportFlow 從單層 Tournament 架構升級為三層架構（Tournament → Category → Stage），支援單打/雙打、小組賽+淘汰賽混合賽制，並提供智能分組推薦功能。

## 架構圖

```
Tournament (賽事/錦標賽)
├── Category 1 (男子雙打)
│   ├── Stage 1: 小組賽
│   │   ├── Group A
│   │   ├── Group B
│   │   └── Group C
│   └── Stage 2: 淘汰賽
│       ├── Quarter Finals (8強)
│       ├── Semi Finals (準決賽)
│       └── Final (決賽)
├── Category 2 (女子單打)
└── Category 3 (混合雙打)
```

## 已完成的實施項目

### 1. 數據結構重構

**文件**: `src/types/index.ts`

新增類型：

- `Category`: 分組/項目（男子雙打、女子單打等）
- `Team`: 雙打隊伍
- `GroupStanding`: 小組賽積分榜

修改類型：

- `Tournament`: 簡化為容器角色，移除 format、config、maxPlayers
- `Match`: 新增 categoryId、stage、groupLabel、roundLabel

### 2. Category Service

**文件**: `src/services/categoryService.ts`

實現功能：

- `createCategory()`: 創建分類
- `getCategories()`: 獲取賽事的所有分類
- `getCategoryById()`: 獲取單一分類
- `updateCategory()`: 更新分類資料
- `incrementParticipants()`: 增加參賽者計數
- `decrementParticipants()`: 減少參賽者計數
- `isCategoryFull()`: 檢查是否已滿額
- `subscribeCategories()`: 即時監聽分類變化

### 3. 智能分組推薦算法

**文件**: `src/services/groupingService.ts`

核心功能：

- `suggestGroupConfigs()`: 根據參賽者數量推薦 2-3 個最佳分組方案
- `validateGroupConfig()`: 驗證自訂分組配置
- `calculateTotalMatches()`: 計算總比賽場次

**算法邏輯**：

1. 計算目標淘汰賽規模（最接近的 2^n: 8, 16, 32...）
2. 反推分組方案（優先每組 4-6 隊的平衡分組）
3. 計算晉級規則（優先整數晉級，必要時加最佳第 N 名）

**範例輸出**（20 隊）：

```typescript
[
  {
    totalGroups: 4,
    teamsPerGroup: [5, 5, 5, 5],
    advancePerGroup: 2,
    knockoutSize: 8,
    description: "4 組循環賽（每組 5 隊），各取前 2 名晉級 8 強",
  },
];
```

### 4. Team Service（雙打隊伍管理）

**文件**: `src/services/teamService.ts`

實現功能：

- `createTeam()`: 創建雙打隊伍
- `getTeamsByCategory()`: 獲取分類的所有隊伍
- `updateTeamStatus()`: 更新隊伍狀態
- `approveTeam()`: 批准隊伍
- `rejectTeam()`: 拒絕隊伍
- `isUserInTeam()`: 檢查用戶是否已在隊伍中
- `getUserTeam()`: 獲取用戶所在的隊伍

### 5. 小組賽和混合賽制生成器

**文件**: `src/services/bracketService.ts`

新增函數：

- `generateGroupStage()`: 生成小組循環賽
- `generateKnockoutStage()`: 生成淘汰賽樹狀圖（帶 TBC 佔位符）
- `generateGroupThenKnockout()`: 生成混合賽制（小組賽 + 淘汰賽）
- `generateKnockoutOnly()`: 純淘汰賽生成（Category 版本）

**關鍵邏輯**：

- 交叉賽制種子位設定（A1 vs B2, C1 vs D2...）
- TBC 機制（Match 初始 player1Id: null，顯示為「Group A #1」）
- 自動輪次標籤（QF, SF, FI, 3RD）

### 6. 創建賽事流程改造

**文件**:

- `src/pages/organizer/CreateTournament.tsx`
- `src/components/features/CategoryManager.tsx`

改動：

- Step 3 改為「分類設定」
- 可新增多個 Category
- 每個設定：名稱、單打/雙打、名額、賽制、分組配置
- 創建賽事時自動創建所有 Category

### 7. 報名表單重構

**文件**: `src/components/features/RegistrationForm.tsx`

新功能：

- 選擇 Category（下拉選單）
- 單打：直接報名
- 雙打：
  - 搜尋隊友（輸入 Email）
  - 手動輸入隊友姓名（影子帳號）
  - 顯示找到的用戶資訊

### 8. UI 適配層

**EventDetail** (`src/pages/EventDetail.tsx`):

- 從 Firestore 載入 categories 集合
- 顯示所有 Category 卡片
- 顯示報名進度（12/16 人已報名）

**CategoryDetail** (`src/pages/CategoryDetail.tsx`):

- 載入 Category 資料
- 支援單打和雙打顯示
- 雙打顯示隊伍（兩個頭像重疊）
- 過濾該分類的比賽

### 9. 主辦方控制台組件

**文件**: `src/components/features/CategoryPublisher.tsx`

功能：

- 顯示參賽者、場地、賽制統計
- 小組賽方案推薦（方案 A、B、C）
- 自訂分組設定
- 一鍵發布賽程

## 數據庫結構

### Firestore 路徑

```
tournaments/{tournamentId}
├── categories/{categoryId}
│   ├── teams/{teamId}              (雙打隊伍)
│   └── registrations/{regId}       (單打報名，未實現)
└── matches/{matchId}
    ├── categoryId: string
    ├── stage: "group" | "knockout"
    ├── groupLabel: "A" | "B" | "C"
    └── roundLabel: "QF" | "SF" | "FI"
```

### Tournament 簡化結構

```typescript
{
  name: "2025 台北春季公開賽",
  sportId: "...",
  date: Timestamp,
  location: "...",
  status: "DRAFT" | "REGISTRATION_OPEN" | ...,
  stats: {
    totalCategories: 3,
    totalMatches: 0
  }
}
```

### Category 結構

```typescript
{
  name: "男子雙打",
  matchType: "doubles",
  maxParticipants: 20,
  currentParticipants: 13,
  format: "GROUP_THEN_KNOCKOUT",
  groupConfig: {
    totalGroups: 4,
    advancePerGroup: 2,
    bestThirdPlaces: 0
  },
  pointsPerSet: 21,
  enableThirdPlaceMatch: false,
  status: "REGISTRATION_OPEN"
}
```

## 測試場景

### 1. 單打純淘汰

- 16 人 → 直接 16 強樹狀圖
- 自動處理 BYE（輪空）

### 2. 雙打小組+淘汰

- 20 組 → 4 組循環賽 → 8 強淘汰
- 智能推薦分組方案
- 交叉賽制種子位

### 3. 不規則人數

- 13 人 → 智能推薦 3 或 4 組方案
- 自動平衡分組

### 4. 雙打隊友邀請

- 玩家 A 搜尋玩家 B 的 Email
- 系統顯示 B 的資料
- 創建隊伍

## 關鍵技術決策

1. **向後兼容**: 不處理舊數據，全新架構
2. **小組積分計算**: 勝 3 分、平 1 分、負 0 分，次要排序：淨勝分
3. **TBC 機制**: Match 初始 player1Id: null，顯示為「Group A #1」
4. **UI 保留**: EventDetail 和 CategoryDetail 的樣式和結構不變，僅數據來源調整

## 未來擴展

### 短期（可選）

- [ ] 小組賽積分榜顯示
- [ ] 小組賽結算功能（計算排名，填入淘汰賽）
- [ ] 主辦方控制台完整重構（按 Category 管理）

### 中期

- [ ] 最佳第 N 名晉級邏輯
- [ ] 雙敗淘汰賽制
- [ ] 賽程時間排程

### 長期

- [ ] 多階段賽制（小組 →16 強 →8 強 →4 強 → 決賽）
- [ ] DUPR 積分整合
- [ ] 自動種子位排序

## 檔案清單

### 新增檔案

- `src/services/categoryService.ts`
- `src/services/groupingService.ts`
- `src/services/teamService.ts`
- `src/components/features/CategoryManager.tsx`
- `src/components/features/CategoryManager.module.scss`
- `src/components/features/CategoryPublisher.tsx`
- `src/components/features/CategoryPublisher.module.scss`

### 修改檔案

- `src/types/index.ts`
- `src/services/bracketService.ts`
- `src/pages/organizer/CreateTournament.tsx`
- `src/components/features/RegistrationForm.tsx`
- `src/components/features/RegistrationForm.module.scss`
- `src/pages/EventDetail.tsx`
- `src/pages/EventDetail.module.scss`
- `src/pages/CategoryDetail.tsx`
- `src/pages/CategoryDetail.module.scss`

## 總結

成功實施三層賽事架構重構，系統現在支援：
單打/雙打分類
小組賽+淘汰賽混合賽制
智能分組推薦
雙打隊友配對
Category 獨立管理
完整的 UI 適配

系統具備**「專業賽事的骨架，但有傻瓜模式的操作」**，非常適合 MVP 策略。
