# 故障排除指南

## 問題 1: 找不到佔位符 Match

**錯誤訊息：**
```
找不到佔位符 Match，請確認是否已生成賽程結構
```

### 原因

這個錯誤發生在 `assignPlayersToExistingMatches()` 函數中，當系統找不到佔位符 Match 時會拋出。可能的原因：

1. **未選擇模板或規則**：在創建分類時沒有選擇賽制模板或比賽規則
2. **Firestore 規則未部署**：formats 集合無法讀取，導致模板清單為空
3. **佔位符生成失敗**：在創建賽事時生成佔位符時發生錯誤

### 解決方案

#### 方案 A：確保選擇模板和規則

**已修復：** CategoryManager 現在會：
- ✅ 自動選擇第一個模板
- ✅ 自動選擇預設規則
- ✅ 提交前驗證是否已選擇

#### 方案 B：部署 Firestore 規則（必要）⭐

```bash
firebase deploy --only firestore:rules
```

**為什麼需要：**
- 新增了 `formats` 集合的讀取權限
- 沒有這個權限，formats 無法載入
- 模板清單會是空的

**驗證部署成功：**
```bash
# 檢查規則
firebase firestore:rules:get

# 應該看到 formats 的規則
```

#### 方案 C：檢查 formats 集合資料

在 Firebase Console 中確認：
```
Database → Firestore Database → formats
```

應該有以下文檔：
- `ko_4`
- `ko_8`
- `ko_16`
- `group_to_qf_13_20`
- `group_to_semi_6_11`
- `rr_small_2_5`

如果沒有，需要運行 seed script：
```bash
# 檢查是否有 seed script
ls src/scripts/

# 如果有，執行它
npm run seed  # 或者 node src/scripts/seed-db.js
```

---

## 問題 2: 權限錯誤

**錯誤訊息：**
```
Failed to load formats: FirebaseError: Missing or insufficient permissions.
```

### 解決方案

這是因為 Firestore 規則未部署。執行：

```bash
firebase deploy --only firestore:rules
```

部署後重新整理瀏覽器。

---

## 問題 3: toLowerCase 錯誤

**錯誤訊息：**
```
Cannot read properties of undefined (reading 'toLowerCase')
```

### 解決方案

**已修復：** 在以下檔案中修改：
- `CategoryDetail.tsx`
- `ScorerCategoryDetail.tsx`

從：
```typescript
styles[match.status?.toLowerCase() || ""]
```

改為：
```typescript
styles[(match.status || "").toLowerCase()]
```

---

## 問題 4: 模板不顯示

**症狀：** 在 Step 3 新增分類時，看不到任何模板選項

### 檢查清單

1. **檢查 Console 錯誤**
   - 打開瀏覽器 Console (F12)
   - 查看是否有權限錯誤或其他錯誤

2. **檢查 Firestore 規則**
   ```bash
   firebase firestore:rules:get
   ```
   應該包含：
   ```javascript
   match /formats/{formatId} {
     allow read: if true;
   }
   ```

3. **檢查 formats 集合資料**
   - 進入 Firebase Console
   - 確認 formats 集合有 6 筆資料

4. **檢查網路連線**
   - 確認可以連接到 Firebase

---

## 問題 5: 佔位符未生成

**症狀：** 創建賽事後，進入 CategoryDetail 看不到對戰結構

### 檢查步驟

1. **檢查 Console 日誌**
   ```
   應該看到：
   "Generated placeholder matches for category: 男子雙打"
   
   如果看到錯誤：
   "Failed to generate placeholder matches: ..."
   ```

2. **檢查是否選擇了模板和規則**
   - 在 Step 3 確認有選擇賽制模板
   - 確認有選擇比賽規則
   - 確認看到「賽制預覽」和「規則說明」卡片

3. **檢查 Firestore 中的 matches 集合**
   - 進入 Firebase Console
   - 查看 matches 集合
   - 篩選 `isPlaceholder == true` 和對應的 `categoryId`

### 解決方案

如果佔位符確實沒有生成，可以：

#### 方案 A：重新創建賽事
1. 確保已部署 Firestore 規則
2. 重新創建一個測試賽事
3. 確保選擇了模板和規則

#### 方案 B：手動生成（後補）
1. 進入「賽程管理」Tab
2. 系統會使用智能算法生成
3. 效果相同，只是沒有提前預覽

---

## 問題 6: 局數制不顯示

**症狀：** 記分時看不到局數表格，只顯示單一分數

### 原因

Match 沒有 `ruleConfig` 或 `ruleConfig.matchType` 不是 `"set_based"`

### 檢查

在 Firestore Console 中檢查 Match 文檔：

```javascript
{
  ruleConfig: {
    matchType: "set_based",  // 必須是這個值
    maxSets: 3,
    pointsPerSet: 21,
    setsToWin: 2,
    winByTwo: true
  },
  sets: {
    player1: [0],
    player2: [0]
  },
  currentSet: 0
}
```

如果缺少這些欄位，代表：
- Category 沒有正確儲存 ruleConfig
- 佔位符生成時沒有傳遞 ruleConfig

### 解決方案

重新創建賽事，確保：
1. ✅ 選擇了比賽規則（BWF標準、單局制等）
2. ✅ 看到「規則說明」預覽卡片
3. ✅ 送出後檢查 Console 無錯誤

---

## 完整檢查清單

### 部署前

- [ ] 確認 formats 集合有 6 筆資料
- [ ] 確認 sports 集合有 rulePresets 欄位
- [ ] 執行 `firebase deploy --only firestore:rules`
- [ ] 重新整理瀏覽器

### 創建賽事

- [ ] Step 1: 選擇球類項目（羽球、桌球等）
- [ ] Step 3: 點擊「新增分類」
- [ ] 確認看到 6 個賽制模板選項
- [ ] 選擇模板（例如：16強淘汰賽）
- [ ] 確認看到「賽制預覽」卡片
- [ ] 確認看到比賽規則選項（例如：BWF標準）
- [ ] 選擇規則
- [ ] 確認看到「規則說明」卡片
- [ ] 點擊「新增」
- [ ] 確認分類卡片顯示完整資訊（包含規則）
- [ ] 點擊「建立賽事」
- [ ] 檢查 Console 應該看到：
   ```
   Generated placeholder matches for category: xxx
   ```

### 驗證佔位符

- [ ] 進入賽事的 CategoryDetail
- [ ] 切換到「對陣圖」Tab
- [ ] 應該看到比賽（顯示「待定 vs 待定」和「預覽」標籤）

### 發布賽程

- [ ] 報名截止後進入「賽程管理」
- [ ] 如果人數符合，應該看到「✅ 人數符合原定模板」
- [ ] 點擊「發布賽程」
- [ ] 佔位符應該變為真實 Match

### 記分測試

- [ ] 紀錄員進入計分板
- [ ] 應該看到局數制 UI（如果是 set_based）
- [ ] 記分時每局分數正確更新
- [ ] 贏下本局後自動進入下一局
- [ ] 贏得比賽後自動晉級

---

## 快速修復命令

```bash
# 1. 部署規則
firebase deploy --only firestore:rules

# 2. 檢查部署狀態
firebase firestore:rules:get

# 3. 重新整理應用
# 在瀏覽器中按 Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)
```

---

## 聯絡支援

如果問題仍然存在：

1. 查看瀏覽器 Console 完整錯誤訊息
2. 查看 Firebase Console 中的資料結構
3. 提供錯誤截圖和 Console 日誌

**最常見的問題：忘記部署 Firestore 規則** ⭐

