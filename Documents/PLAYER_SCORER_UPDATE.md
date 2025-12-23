# 選手與紀錄員視角更新完成總結

## 完成時間

**Date**: 2025-12-20

---

## 已完成的更新

### 選手視角更新

#### 1. 賽事列表頁面（Events.tsx）

- 更新狀態篩選支援新狀態值
- 「開放報名中」Tab 顯示 `REGISTRATION_OPEN` 狀態的賽事
- 「即將開始」Tab 顯示 `REGISTRATION_CLOSED` 狀態的賽事
- 「進行中」Tab 顯示 `ONGOING` 狀態的賽事

#### 2. 賽事詳情頁面（EventDetail.tsx）

- 報名按鈕支援新狀態 `REGISTRATION_OPEN`
- 新增 `getStatusText()` 函數顯示正確狀態文字
- 向下相容舊狀態值

#### 3. 我的比賽頁面（MyGames.tsx）

- 更新狀態篩選
- 「即將到來」：`SCHEDULED`, `IN_PROGRESS`（新）+ `scheduled`, `live`（舊）
- 「歷史紀錄」：`COMPLETED`（新）+ `finished`（舊）
- 開放報名中賽事篩選支援 `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`

#### 4. 比賽卡片組件（MatchCard.tsx）

- 更新顯示邏輯支援新欄位：
- `player1Name`, `player2Name`（新）
- `playerA_Name`, `playerB_Name`（舊，向下相容）
- `score.player1`, `score.player2`（新）
- `score.A`, `score.B`（舊，向下相容）
- 新增更多狀態標籤：
- `PENDING_PLAYER`: 「等待選手」
- `PENDING_COURT`: 「等待場地」
- `SCHEDULED`: 「即將開始」
- `IN_PROGRESS`: 「進行中」
- `COMPLETED`: 「已結束」

---

### 紀錄員視角更新

#### 5. 紀錄員首頁（ScorerHome.tsx）

- 修改「我的賽事」卡片點擊導向
- 從 `/events/:id` 改為 `/scorer/tournaments/:id`
- 點擊後進入紀錄員專用賽事詳情頁

#### 6. 賽事場次頁面（TournamentMatches.tsx - 新增）

- 顯示賽事基本資訊
- 按輪次分組顯示所有場次
- 輪次標籤：「第一輪」、「準決賽」、「決賽」、「季軍賽」
- 每場比賽顯示：
- 狀態標籤（顏色區分）
- 場地名稱
- 選手對戰
- BYE 輪空提示
- 勝者高亮顯示
- 即時監聽比賽變化（自動更新）
- 點擊場次卡片進入計分畫面

#### 7. 計分畫面（ScoringConsole.tsx）

- 更新顯示邏輯支援新欄位名稱
- 記分函數改為 `recordScore(id, 'player1' | 'player2', 1)`
- **關鍵更新**：替換 `finishMatch()` 為 `completeMatch()`
- 結束比賽時自動判定勝負
- 勝者自動晉級下一輪
- 自動釋放場地
- 自動分配空閒場地給下一場
- 狀態判斷支援新舊狀態值
- 向下相容舊比賽資料

---

### 核心服務更新

#### 8. Match Service（matchService.ts）

- `getMatchesByPlayer()` 更新：
- 查詢欄位從 `playerA_Id`, `playerB_Id` 改為 `player1Id`, `player2Id`
- 排序方式改為按 `round` 和 `matchOrder`
- `recordScore()` 更新：
- 參數從 `team: 'A' | 'B'` 改為 `player: 'player1' | 'player2'`
- 比分更新到 `score.player1` 和 `score.player2`
- Timeline 保留舊格式（向下相容）
- `startMatch()` 更新：
- 狀態從 `live` 改為 `IN_PROGRESS`
- `getMatchesByTournament()` 增強：
- 優先使用 `round` + `matchOrder` 排序
- 降級機制：索引建立中時使用手動排序

---

### 路由配置

#### 9. App.tsx

- 新增路由：`/scorer/tournaments/:id` → `TournamentMatches`
- RoleGuard 保護（僅紀錄員可訪問）

---

## 🎯 新功能特性

### 選手功能

1. **查看已發布的賽事**

   - 在「賽事」頁面的「開放報名中」Tab 看到 `REGISTRATION_OPEN` 狀態的賽事
   - 在「即將開始」Tab 看到 `REGISTRATION_CLOSED` 狀態的賽事

2. **報名參加比賽**

   - 點擊賽事進入詳情頁
   - 當狀態為 `REGISTRATION_OPEN` 時顯示「立即報名」按鈕
   - 報名成功後顯示「✓ 您已報名此賽事」

3. **查看自己的比賽**
   - 在「我的比賽」頁面查看所有參賽場次
   - 正確顯示選手名稱和比分
   - 狀態標籤清晰（等待場地、已排程、進行中、已完成）

### 紀錄員功能

1. **查看被邀請的賽事**

   - 在「我的賽事」Tab 看到已接受的賽事列表
   - 點擊賽事卡片進入紀錄員專用詳情頁

2. **賽事場次總覽**

   - 按輪次分組顯示所有場次（第一輪、準決賽、決賽、季軍賽）
   - 每場比賽顯示：
     - 狀態標籤（顏色）
     - 場地資訊
     - 選手對戰
     - 比分（已完成的比賽）
     - BYE 輪空提示
   - 即時更新（自動顯示晉級結果）

3. **計分與自動晉級**
   - 點擊場次進入計分畫面
   - 記錄比分（大型按鈕）
   - 復原功能
   - **結束比賽後自動觸發**：
     - 判定勝負
     - 勝者自動填入下一場
     - 釋放場地
     - 分配空閒場地給下一場等待的比賽
     - 顯示成功訊息：「比賽已結束！勝者已自動晉級下一輪」

---

## 📁 更新檔案清單

### 修改的檔案（8 個）

1. `src/pages/Events.tsx` - 狀態篩選
2. `src/pages/EventDetail.tsx` - 報名邏輯
3. `src/services/matchService.ts` - 查詢和記分函數
4. `src/pages/MyGames.tsx` - 狀態篩選
5. `src/components/features/MatchCard.tsx` - 顯示邏輯
6. `src/pages/scorer/ScorerHome.tsx` - 導航邏輯
7. `src/pages/scorer/ScoringConsole.tsx` - 計分和完成邏輯
8. `src/App.tsx` - 路由配置

### 新增的檔案（2 個）

1. `src/pages/scorer/TournamentMatches.tsx` - 紀錄員賽事詳情頁
2. `src/pages/scorer/TournamentMatches.module.scss` - 樣式檔案

---

## 🔗 完整使用流程

### 選手流程

```
1. 訪問「賽事」頁面 → 看到「開放報名中」的賽事
2. 點擊賽事卡片 → 進入賽事詳情
3. 點擊「立即報名」→ 填寫報名表單
4. 報名成功 → 等待主辦方審核
5. 主辦方批准後 → 出現在「我的比賽」中
6. 賽程發布後 → 看到自己的場次資訊
7. 查看即時比分和比賽狀態
```

### 紀錄員流程

```
1. 訪問「我的任務」頁面
2. 接受主辦方邀請
3. 在「我的賽事」Tab → 看到已接受的賽事
4. 點擊賽事卡片 → 進入賽事場次總覽
5. 查看所有場次（按輪次分組）
6. 點擊場次卡片 → 進入計分畫面
7. 點擊「開始比賽」→ 開始記錄比分
8. 記錄比分 → 即時更新
9. 點擊「結束比賽」→ 系統自動：
   - 判定勝負
   - 勝者晉級下一輪
   - 釋放場地
   - 分配空閒場地
10. 返回賽事場次頁 → 看到即時更新的晉級結果
```

---

## 🎯 測試檢查清單

### 選手視角測試

- [ ] 在「賽事」頁面看到已發布的賽事（`REGISTRATION_OPEN`）
- [ ] 可以點擊賽事進入詳情頁
- [ ] 「立即報名」按鈕顯示且可用
- [ ] 報名成功後顯示「已報名」
- [ ] 在「我的比賽」頁面看到自己的場次
- [ ] 場次卡片顯示正確的選手名稱和比分
- [ ] 狀態標籤正確顯示

### 紀錄員視角測試

- [ ] 在「我的賽事」Tab 看到已接受的賽事
- [ ] 點擊賽事後進入場次總覽頁
- [ ] 看到所有場次按輪次分組
- [ ] 狀態標籤顏色正確
- [ ] 場地名稱顯示
- [ ] BYE 輪空場次有特殊標記
- [ ] 點擊場次進入計分畫面
- [ ] 可以記錄比分
- [ ] 點擊「結束比賽」後：
  - [ ] 顯示成功訊息
  - [ ] 返回紀錄員首頁
  - [ ] 在場次總覽頁看到即時更新
  - [ ] 勝者已自動填入下一場
  - [ ] 下一場狀態從「等待選手」變為「等待場地」或「已排程」

---

## 🚀 自動晉級驗證

**測試場景**：3 人單淘汰賽（含 1 個 BYE）

1. **第一輪**

   - 比賽 1：選手 A vs BYE → 自動完成，A 晉級
   - 比賽 2：選手 B vs 選手 C → 紀錄員計分

2. **紀錄員完成比賽 2**

   - 點擊「結束比賽」
   - 系統判定：選手 B 獲勝
   - **自動發生**：
     - 選手 B 自動填入決賽的 `player2Id`
     - 決賽狀態從 `PENDING_PLAYER` 變為 `PENDING_COURT`
     - 場地自動分配給決賽
     - 決賽狀態變為 `SCHEDULED`

3. **在場次總覽頁驗證**
   - 決賽顯示：選手 A vs 選手 B
   - 決賽狀態：「已排程」
   - 決賽有場地資訊

---

## 📊 向下相容性

所有更新都包含對舊資料的支援：

| 欄位        | 新名稱          | 舊名稱         | 處理方式       |
| ----------- | --------------- | -------------- | -------------- |
| 選手 1 ID   | `player1Id`     | `playerA_Id`   | 優先新，回退舊 |
| 選手 2 ID   | `player2Id`     | `playerB_Id`   | 優先新，回退舊 |
| 選手 1 名稱 | `player1Name`   | `playerA_Name` | 優先新，回退舊 |
| 選手 2 名稱 | `player2Name`   | `playerB_Name` | 優先新，回退舊 |
| 比分 1      | `score.player1` | `score.A`      | 優先新，回退舊 |
| 比分 2      | `score.player2` | `score.B`      | 優先新，回退舊 |
| 狀態        | `SCHEDULED` 等  | `scheduled` 等 | 同時支援       |

---

## 🎉 功能亮點

### 選手體驗提升

- 可以看到主辦方發布的賽事
- 報名流程順暢
- 清楚看到自己的比賽場次和狀態
- 即時比分更新

### 紀錄員體驗提升

- 賽事場次總覽（按輪次分組）
- 清楚的視覺化呈現
- 點擊即可進入計分
- **自動晉級系統**：
- 不需要手動設定下一輪對戰
- 系統自動推進賽程
- 場地自動調度
- 即時看到晉級結果

### 系統穩定性

- Transaction 確保資料一致性
- 即時訂閱提供最新資訊
- 向下相容避免舊資料錯誤
- 錯誤處理友善

---

## 🔧 技術實現

### Firestore Transaction

```typescript
completeMatch() 使用 Transaction 確保：
1. 更新當前比賽狀態 → COMPLETED
2. 釋放場地 → status: IDLE
3. 推進勝者 → 填入 nextMatch.player1Id 或 player2Id
4. 檢查下一場是否齊人 → 改為 PENDING_COURT
5. 觸發場地調度 → 分配空閒場地
```

所有操作原子性完成，防止競態條件。

### 即時更新

```typescript
subscribeMatchesByTournament() 監聽：
- 紀錄員在場次總覽頁
- 當其他紀錄員完成比賽
- 頁面自動更新顯示晉級結果
```

---

## 📝 後續建議

### 可選增強功能

1. **選手通知**

   - 當比賽即將開始時發送通知
   - 當比賽完成時發送結果

2. **場次時間顯示**

   - 在場次卡片上顯示預計開始時間
   - 倒數計時功能

3. **統計資訊**
   - 紀錄員完成的比賽數量
   - 選手勝率統計

---

**所有功能已完成並可開始測試！** 🎉
