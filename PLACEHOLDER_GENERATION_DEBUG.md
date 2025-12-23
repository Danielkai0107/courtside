# 佔位符 Match 生成診斷指南

## 正確的流程與日誌

### 建立賽事時應該看到的 Console 訊息

```javascript
// Step 1: 選擇球類後
" Loaded X sports"

// Step 3: 新增分類時
// （應該自動選擇第一個模板和規則）

// 點擊「建立賽事」後
"📦 [CreateTournament] 準備創建分類: {
  name: '男子雙打',
  hasSelectedFormat: true,
  selectedFormatId: 'ko_16',
  hasRuleConfig: true,
  ruleConfig: {
    matchType: 'set_based',
    maxSets: 3,
    pointsPerSet: 21,
    setsToWin: 2,
    winByTwo: true,
    cap: 30
  }
}"

" [CreateTournament] 分類已創建: xxxxx"

"🎯 [CreateTournament] 開始生成佔位符 Match: {
  tournamentId: 'yyy',
  categoryId: 'xxx',
  formatId: 'ko_16',
  formatName: '16強淘汰賽'
}"

"Generated 15 placeholder matches"

" [CreateTournament] Generated placeholder matches for category: 男子雙打"
```

---

## 診斷檢查清單

### 檢查 1: 是否成功載入模板？

**打開瀏覽器 Console，看是否有：**

**成功：** 沒有錯誤訊息

```
（沒有 "Failed to load formats" 訊息）
```

**失敗：** 看到權限錯誤

```
Failed to load formats: FirebaseError: Missing or insufficient permissions.
```

**解決方案：** 部署 Firestore 規則

```bash
firebase deploy --only firestore:rules
```

---

### 檢查 2: 新增分類時是否自動選擇了模板？

**在 Step 3 點擊「新增分類」後：**

**正確：** 應該看到

- 6 個模板選項（ko_4, ko_8, ko_16 等）
- 第一個模板已被選中（橘色框）
- 顯示「📋 賽制預覽」卡片
- 顯示比賽規則選項
- 第一個規則已被選中
- 顯示「規則說明」卡片

**錯誤：** 如果看不到模板選項

- 檢查 Console 是否有權限錯誤
- 確認已部署 Firestore 規則
- 確認 Firebase Console 中 formats 集合有資料

---

### 檢查 3: 送出前的資料驗證

**點擊「建立賽事」前，檢查：**

在分類卡片上應該顯示：

```
男子雙打
[單打] 16人
賽制: 16強淘汰賽  ← 應該顯示模板名稱
規則: 3戰2勝      ← 應該顯示規則摘要
```

如果看到：

```
賽制: 純淘汰賽     ← 不是模板名稱
規則: （沒有顯示）  ← 規則沒有選擇
```

代表模板或規則沒有正確選擇。

---

### 檢查 4: 送出後的 Console 訊息

**點擊「建立賽事」後，Console 應該顯示：**

```javascript
// 1. 準備創建分類
"📦 [CreateTournament] 準備創建分類: { ... }"

// 檢查這個物件：
{
  hasSelectedFormat: true,     //  必須是 true
  selectedFormatId: "ko_16",   //  必須有值
  hasRuleConfig: true,         //  必須是 true
  ruleConfig: { ... }          //  必須有完整物件
}

// 2. 分類創建成功
" [CreateTournament] 分類已創建: xxxxx"

// 3. 開始生成佔位符
"🎯 [CreateTournament] 開始生成佔位符 Match: { ... }"

// 4. 生成成功
"Generated 15 placeholder matches"
" [CreateTournament] Generated placeholder matches for category: 男子雙打"
```

---

## 常見問題與解決方案

### 問題 A: hasSelectedFormat: false

**原因：** 模板沒有被選擇

**檢查：**

1. 打開 CategoryManager Modal
2. 確認看到模板選項
3. 點擊一個模板
4. 確認看到「賽制預覽」卡片

**如果模板選項是空的：**

- 部署 Firestore 規則
- 檢查 formats 集合有資料

### 問題 B: hasRuleConfig: false

**原因：** 規則沒有被選擇

**檢查：**

1. 打開 CategoryManager Modal
2. 確認看到比賽規則選項
3. 點擊一個規則
4. 確認看到「規則說明」卡片

**如果規則選項是空的：**

- 檢查 Sport 是否有 rulePresets 欄位
- 檢查 Sport.defaultPresetId 是否正確

### 問題 C: 看到警告訊息

```
[CreateTournament] 未生成佔位符 Match（缺少模板或規則）
```

**原因：** selectedFormat 或 ruleConfig 是 undefined

**解決方案：**

1. 刪除該分類
2. 重新新增
3. 確保選擇了模板和規則
4. 檢查分類卡片顯示完整資訊
5. 再次送出

### 問題 D: 看到錯誤訊息

```
[CreateTournament] Failed to generate placeholder matches: ...
```

**可能的錯誤：**

1. **Firestore 權限錯誤**

   ```
   Missing or insufficient permissions
   ```

   → 部署規則：`firebase deploy --only firestore:rules`

2. **模板資料格式錯誤**

   ```
   Cannot read property 'stages' of undefined
   ```

   → 檢查 formats 集合的資料格式

3. **批次寫入失敗**
   ```
   Batch write failed
   ```
   → 檢查 Firestore 配額
   → 檢查 Match 資料是否有 undefined 值

---

## 手動驗證步驟

### 步驟 1: 檢查 Category 是否正確儲存

1. 進入 Firebase Console
2. 找到 `tournaments/{id}/categories/{categoryId}`
3. 檢查欄位：

```javascript
{
  name: "男子雙打",
  selectedFormatId: "ko_16",      //  必須有值
  ruleConfig: {                   //  必須有完整物件
    matchType: "set_based",
    maxSets: 3,
    pointsPerSet: 21,
    setsToWin: 2,
    winByTwo: true,
    cap: 30
  }
}
```

### 步驟 2: 檢查 Match 是否生成

1. 在 Firebase Console 中
2. 找到 `matches` 集合
3. 篩選條件：

   - `categoryId == {你的categoryId}`
   - `isPlaceholder == true`

4. 應該看到多個 Match 文檔

**檢查 Match 結構：**

```javascript
{
  isPlaceholder: true,            //  必須是 true
  player1Id: null,                //  應該是 null
  player2Id: null,                //  應該是 null
  player1Name: "待定",
  player2Name: "待定",
  categoryId: "xxx",
  tournamentId: "yyy",
  stage: "knockout",
  round: 1,
  nextMatchId: "...",             //  Linked List 連結
  ruleConfig: {                   //  規則快照
    matchType: "set_based",
    maxSets: 3,
    pointsPerSet: 21,
    setsToWin: 2,
    winByTwo: true,
    cap: 30
  },
  sets: {                         //  局數制結構
    player1: [0],
    player2: [0]
  },
  currentSet: 0
}
```

---

## 測試用的完整流程

### 測試案例：創建 16 強淘汰賽

```
1. 進入「建立賽事」

2. Step 1: 基本資訊
   - 賽事名稱：測試賽事
   - 選擇球類：羽毛球

3. Step 2: 時間地點
   - 比賽日期：2025-01-10
   - 報名截止：2025-01-05
   - 地點：測試場地

4. Step 3: 分類設定
   - 點擊「新增分類」

   Modal 應該顯示：
    分類名稱：（輸入）男子雙打
    比賽類型：已選擇「單打」
    賽制模板：已自動選擇第一個（例如 ko_4）
      - 看到 6 個模板選項
      - 第一個有橘色框
    看到「📋 賽制預覽」卡片
    比賽規則：已自動選擇「BWF標準」
      - 看到規則選項
      - 第一個有橘色框
    看到「規則說明」卡片

   - 點擊「16強淘汰賽」模板
   - 點擊「新增」

   回到主畫面應該看到：
    男子雙打卡片
    顯示：16人
    顯示：16強淘汰賽
    顯示：規則: 3戰2勝

5. Step 4: 文宣說明
   - （可選）

6. 點擊「建立賽事」

7. 檢查 Console
   應該看到：
    "📦 [CreateTournament] 準備創建分類"
    "hasSelectedFormat: true"
    "hasRuleConfig: true"
    " [CreateTournament] 分類已創建"
    "🎯 [CreateTournament] 開始生成佔位符 Match"
    "Generated X placeholder matches"
    " [CreateTournament] Generated placeholder matches"

8. 進入賽事的 CategoryDetail
   - 切換到「對陣圖」Tab
   - 應該看到比賽列表
   - 每場顯示「待定 vs 待定」
   - 每場有「預覽」標籤
```

---

## 如果仍然看不到佔位符

### 執行這些命令來診斷

```bash
# 1. 確認當前分支
git status

# 2. 確認所有檔案都已儲存
git diff

# 3. 重新整理瀏覽器（清除快取）
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + R

# 4. 檢查 Firebase 專案
firebase use

# 5. 檢查 Firestore 規則
firebase firestore:rules:get | grep -A 5 "formats"
```

### 最終檢查

如果以上都沒問題，檢查 Console 的完整錯誤堆疊：

```javascript
// 如果看到這個錯誤
"[CreateTournament] Failed to generate placeholder matches: ...";

// 點擊錯誤展開完整堆疊
// 複製完整錯誤訊息
// 檢查是哪一行出錯
```

---

## 預期的資料庫狀態

### 創建成功後，Firebase Console 應該有：

```
tournaments/{tournamentId}
├─ name: "測試賽事"
├─ status: "DRAFT"
└─ stats: { totalCategories: 1, totalMatches: 0 }

tournaments/{tournamentId}/categories/{categoryId}
├─ name: "男子雙打"
├─ selectedFormatId: "ko_16"      ← 必須有
├─ ruleConfig: { ... }            ← 必須有
└─ maxParticipants: 16

matches/ (collection)
├─ {match1}
│  ├─ tournamentId: "..."
│  ├─ categoryId: "..."
│  ├─ isPlaceholder: true         ← 必須是 true
│  ├─ player1Name: "待定"
│  ├─ player2Name: "待定"
│  ├─ ruleConfig: { ... }         ← 必須有
│  └─ sets: { player1: [0], player2: [0] }
│
├─ {match2}
│  └─ ...
│
└─ ... (共 15 個 matches，如果是 ko_16)
```

---

## 快速修復

如果問題持續，嘗試以下步驟：

### 方法 1: 重新部署規則

```bash
firebase deploy --only firestore:rules
```

然後：

1. 清除瀏覽器快取（Cmd/Ctrl + Shift + R）
2. 重新進入「建立賽事」
3. 重新創建一個測試賽事

### 方法 2: 檢查舊賽事

如果是舊賽事（在實作此功能前創建的）：

- 沒有 selectedFormatId
- 沒有 ruleConfig
- 沒有佔位符 Match

**解決：** 創建新的測試賽事

### 方法 3: 手動補救（如果佔位符沒生成）

進入「賽程管理」Tab：

1. 系統會檢測到沒有佔位符
2. 會顯示智能推薦方案
3. 選擇一個方案
4. 點擊「發布賽程」
5. 系統會生成真實 Match（不是佔位符，但功能相同）

---

## 成功的標誌

### 在前端

1. **Step 3 分類卡片：**

   ```
   男子雙打
   [單打] 16人
   賽制: 16強淘汰賽  ← 顯示模板名稱
   規則: 3戰2勝      ← 顯示規則
   ```

2. **Console 訊息：**

   ```
    [CreateTournament] Generated placeholder matches for category: 男子雙打
   ```

3. **CategoryDetail 頁面：**
   - 對陣圖 Tab 有比賽
   - 顯示「待定 vs 待定」
   - 有「預覽」標籤

### 在 Firebase Console

1. **Category 文檔有：**

   - `selectedFormatId`
   - `ruleConfig`

2. **matches 集合有：**
   - 多個 `isPlaceholder: true` 的文檔
   - 每個都有 `ruleConfig` 和 `sets`

---

## 聯繫我時請提供

如果需要協助，請提供：

1. **Console 截圖**（完整的日誌輸出）
2. **Firebase Console 截圖**：
   - categories/{categoryId} 文檔內容
   - matches 集合篩選結果
3. **描述操作步驟**（你做了什麼）
4. **期望 vs 實際**（你期望看到什麼 vs 實際看到什麼）

這樣我可以快速定位問題！
