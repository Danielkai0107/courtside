# Bug 修復：誤判「賽程已發布」狀態

## 問題描述

**症狀：** 截止報名後，進入「賽程管理」Tab 直接顯示「✓ 賽程已發布」，但實際上還沒有發布賽程。

**用戶體驗：** 主辦方誤以為賽程已經發布，無法進行實際的發布操作。

---

## 根本原因

在 `CategoryScheduleManager.tsx` 第 185 行的判斷邏輯有誤：

```typescript
// ❌ 錯誤的邏輯
const hasPublishedMatches = matches.length > 0;
```

**問題：**
- 佔位符 Match 也被計入 `matches.length`
- 建立賽事時就生成了佔位符 Match
- 所以 `matches.length > 0` 永遠為 true
- 導致誤判為「已發布」

---

## 解決方案

修改判斷邏輯，只有**非佔位符的 Match** 才算「已發布」：

```typescript
// ✅ 正確的邏輯
const hasPublishedMatches = matches.some((m: any) => !m.isPlaceholder);
```

**邏輯說明：**
- `isPlaceholder: true` → 佔位符 Match（預覽用）
- `isPlaceholder: false` → 真實 Match（已分配選手）
- 只有當存在 `isPlaceholder: false` 的 Match 時，才算「已發布」

---

## 修改的檔案

- `src/components/features/CategoryScheduleManager.tsx` - 第 185 行

---

## 行為對比

### 修復前 ❌

```
1. 建立賽事
   └─ 生成 15 個佔位符 Match (isPlaceholder: true)

2. 截止報名
   └─ 狀態：REGISTRATION_CLOSED

3. 進入「賽程管理」Tab
   └─ 載入 Match
   └─ matches.length = 15 > 0
   └─ ❌ 顯示「✓ 賽程已發布」（錯誤）
   └─ ❌ 無法進行發布操作
```

### 修復後 ✅

```
1. 建立賽事
   └─ 生成 15 個佔位符 Match (isPlaceholder: true)

2. 截止報名
   └─ 狀態：REGISTRATION_CLOSED

3. 進入「賽程管理」Tab
   └─ 載入 Match
   └─ matches.some(m => !m.isPlaceholder) = false
   └─ ✅ 顯示 CategoryPublisher（可以發布）
   └─ ✅ 可以點擊「發布賽程」

4. 點擊「發布賽程」
   └─ 分配選手到 Match
   └─ isPlaceholder: false

5. 再次進入「賽程管理」Tab
   └─ matches.some(m => !m.isPlaceholder) = true
   └─ ✅ 顯示「✓ 賽程已發布」（正確）
```

---

## 驗證步驟

### 測試案例：有佔位符的新賽事

```
1. 建立一個新賽事
   - 選擇模板和規則
   - 送出後生成佔位符

2. 開放報名 → 審核 → 截止報名

3. 進入「賽程管理」Tab
   ✅ 應該看到 CategoryPublisher（發布按鈕）
   ❌ 不應該看到「賽程已發布」

4. 點擊「發布賽程」

5. 再次進入「賽程管理」Tab
   ✅ 現在應該看到「賽程已發布」
```

### 測試案例：沒有佔位符的舊賽事

```
1. 進入舊賽事（沒有佔位符）

2. 截止報名

3. 進入「賽程管理」Tab
   ✅ 應該看到 CategoryPublisher（智能推薦）
   ❌ 不應該看到「賽程已發布」

4. 發布賽程（使用智能算法）

5. 再次進入
   ✅ 應該看到「賽程已發布」
```

---

## 相關問題修復

### 同時修復的其他 Bug

1. **assignPlayersToExistingMatches 排序錯誤**
   ```typescript
   // ❌ 錯誤
   if (m.stage !== b.stage)  // m 未定義
   
   // ✅ 修復
   if (a.stage !== b.stage)
   ```

2. **toLowerCase 錯誤**
   ```typescript
   // ❌ 錯誤
   styles[match.status?.toLowerCase() || ""]
   
   // ✅ 修復
   styles[(match.status || "").toLowerCase()]
   ```

---

## 診斷日誌

### 在 Console 檢查狀態判斷

可以在 CategoryScheduleManager 載入後，手動檢查：

```javascript
// 在瀏覽器 Console 輸入
console.log("Matches:", matches);
console.log("Has placeholder:", matches.some(m => m.isPlaceholder));
console.log("Has real:", matches.some(m => !m.isPlaceholder));
console.log("Should show publisher:", !matches.some(m => !m.isPlaceholder));
```

**預期結果（截止報名後，尚未發布）：**
```javascript
Matches: [15 個 Match]  // 都是佔位符
Has placeholder: true
Has real: false
Should show publisher: true  ✅
```

**預期結果（已發布後）：**
```javascript
Matches: [15 個 Match]  // 都不是佔位符
Has placeholder: false
Has real: true
Should show publisher: false  ✅
```

---

## 總結

### 修復內容

- ✅ 修改判斷邏輯：區分佔位符和真實 Match
- ✅ 截止報名不會誤判為「已發布」
- ✅ 只有真正發布後才顯示「賽程已發布」

### 影響範圍

- 所有使用佔位符 Match 的賽事
- 確保主辦方可以正確進入發布流程

### 向下相容

- ✅ 舊賽事（沒有佔位符）：不受影響
- ✅ 新賽事（有佔位符）：正確判斷

---

**修復日期：** 2024年12月23日  
**狀態：** ✅ 已完成

