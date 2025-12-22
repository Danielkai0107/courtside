# BYE 輪空機制未生效問題排查

## 🐛 問題現象

從截圖看到：
1. **第一輪比賽**：所有顯示「待開始」，沒有自動完成的 BYE
2. **第二輪比賽**：顯示「待定」「待定」，沒有晉級選手

## 🔍 可能原因分析

### 原因 1：BYE 處理函數沒有被調用

檢查 `generateKnockoutOnly` 是否完整執行：

```typescript
export const generateKnockoutOnly = async (...) => {
  // ... 創建比賽
  
  // 最後一步
  await autoProgressByeMatches(matches, idMap);  // ← 是否執行？
};
```

**檢查點**：
- 查看瀏覽器 Console 是否有錯誤
- 查看是否有 `✅ Player xxx auto-advanced from BYE` 日誌

### 原因 2：沒有 BYE（人數剛好）

```
如果生成 10 個測試隊伍：
  2^3 = 8 (太少)
  2^4 = 16 (需要)
  BYE 數量 = 16 - 10 = 6 個

應該有 6 個 BYE 場次自動完成
```

**檢查點**：
- 查看 Console 日誌：`📊 Players: 10, Bracket: 16, Byes: 6`

### 原因 3：權限問題導致更新失敗

```
autoProgressByeMatches 嘗試更新 match 狀態
→ 可能遇到權限錯誤
→ 靜默失敗
```

**檢查點**：
- 查看 Console 是否有 `Missing or insufficient permissions` 錯誤
- 查看 Firestore 規則是否允許系統更新 match

### 原因 4：idMap 映射問題

```
autoProgressByeMatches 使用 idMap 來找真實的 Firestore ID
如果 idMap 有問題 → 找不到文檔 → 無法更新
```

## 🔧 調試步驟

### Step 1：查看瀏覽器 Console

打開開發者工具，查找：
```
✅ 成功日誌：
  - "📊 Players: X, Bracket: Y, Byes: Z"
  - "✅ Batch wrote X matches to Firestore"
  - "✅ Player xxx auto-advanced from BYE to match xxx"
  - "✅ Knockout bracket generated successfully"

❌ 錯誤日誌：
  - "FirebaseError: Missing or insufficient permissions"
  - "⚠️ Real ID not found for xxx"
  - "⚠️ Match xxx has no players (both BYE)"
```

### Step 2：檢查 Firestore 數據

進入 Firebase Console → Firestore：
```
查看 matches 集合：
  - 是否有 status: "COMPLETED" 的 BYE 場次？
  - winnerId 是否有值？
  - 第二輪的 player1Id/player2Id 是否有值？
```

### Step 3：檢查權限規則

```javascript
// matches 集合的規則
match /matches/{matchId} {
  allow update: if isAuthenticated() && 
    (resource.data.scorerId == request.auth.uid ||
     get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.organizerId == request.auth.uid);
}
```

**問題**：`autoProgressByeMatches` 在 **發布賽程時** 執行，此時：
- 是主辦方操作 ✅
- 主辦方有權限更新 match ✅
- 應該沒有權限問題

### Step 4：檢查 categoryId

**關鍵問題**：新的 Match 結構需要 `categoryId`！

```typescript
// 舊的 createMatchNode（可能有問題）
function createMatchNode(data: Partial<Match>): Match {
  const match: any = {
    id: data.id || "",
    tournamentId: data.tournamentId || "",
    categoryId: data.categoryId || "",  // ← 如果沒傳入會是空字串！
    ...
  };
}
```

## 🔧 可能的修復方案

### 修復 1：確保 categoryId 正確傳遞

檢查 `generateKnockoutOnly` 是否正確設定 categoryId：

```typescript
const match = createMatchNode({
  id: `match-${matchIdCounter++}`,
  tournamentId,
  categoryId,  // ← 必須傳入！
  stage: "knockout",
  roundLabel,
  ...
});
```

### 修復 2：添加詳細日誌

在 `autoProgressByeMatches` 添加更多日誌：

```typescript
async function autoProgressByeMatches(...) {
  const byeMatches = matches.filter(
    (m) => m.player1Id === null || m.player2Id === null
  );
  
  console.log(`🔍 Found ${byeMatches.length} BYE matches to process`);
  
  for (const match of byeMatches) {
    console.log(`Processing BYE match: ${match.id}`);
    
    const winnerId = match.player1Id || match.player2Id;
    console.log(`Winner: ${winnerId}`);
    
    // ... 更新邏輯
    
    console.log(`✅ BYE match ${match.id} completed`);
  }
}
```

### 修復 3：檢查 Firestore 規則

確保主辦方可以批量更新 matches：

```javascript
match /matches/{matchId} {
  // 主辦方可以創建和更新
  allow create, update: if isAuthenticated() && 
    get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.organizerId == request.auth.uid;
}
```

## 🧪 測試建議

### 測試 1：簡單案例（3 人）

```
1. 創建測試賽事
2. 生成 3 個測試選手
3. 發布純淘汰賽程
4. 查看 Console 日誌
5. 查看 Firestore 數據
```

預期結果：
```
Console:
  📊 Players: 3, Bracket: 4, Byes: 1
  🔍 Found 1 BYE matches to process
  ✅ Player xxx auto-advanced from BYE
  
Firestore:
  - 3 個 matches
  - 1 個 status: "COMPLETED" (BYE)
  - 2 個 status: "SCHEDULED" (真實比賽)
  - 第二輪 player1Id 或 player2Id 有值
```

### 測試 2：檢查權限

```
1. 打開 Firebase Console
2. 進入 Firestore → Rules
3. 使用規則模擬器測試：
   - 操作：update match
   - 用戶：主辦方 uid
   - 路徑：matches/{matchId}
   - 數據：{ status: "COMPLETED", winnerId: "xxx" }
```

## 📋 需要檢查的代碼位置

1. **CategoryPublisher.tsx** (line 63, 76)
   - 調用 `generateKnockoutOnly` 時是否傳入正確參數

2. **bracketService.ts** (line 607-736)
   - `generateKnockoutOnly` 函數
   - 是否正確調用 `autoProgressByeMatches`

3. **bracketService.ts** (line 230-295)
   - `autoProgressByeMatches` 函數
   - 是否有錯誤處理遺漏

4. **firestore.rules** (matches 規則)
   - 主辦方是否有 update 權限

## 🚨 緊急修復建議

如果問題持續，建議添加詳細日誌：

```typescript
export const generateKnockoutOnly = async (...) => {
  console.log("🚀 Starting generateKnockoutOnly");
  console.log(`📊 Teams: ${teams.length}`);
  console.log(`📊 CategoryId: ${categoryId}`);
  
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const byeCount = bracketSize - n;
  console.log(`📊 Bracket: ${bracketSize}, Byes: ${byeCount}`);
  
  // ... 創建比賽
  
  console.log(`📝 Created ${matches.length} matches`);
  
  const idMap = await batchWriteMatches(matches);
  console.log(`✅ Batch write complete, idMap size: ${idMap.size}`);
  
  console.log(`🔄 Starting autoProgressByeMatches`);
  await autoProgressByeMatches(matches, idMap);
  console.log(`✅ autoProgressByeMatches complete`);
};
```

## 💡 臨時解決方案

如果 BYE 自動處理有問題，可以：

1. **手動完成 BYE 場次**
   - 主辦方進入比賽詳情
   - 手動標記為完成
   - 手動選擇勝者

2. **使用純淘汰賽配置**
   - 編輯賽事
   - 將分類改為「純淘汰賽」
   - 重新發布

3. **增加參賽者到 2 的次方**
   - 生成測試數據湊到 8, 16, 32 人
   - 避免 BYE 產生

---

## 🔍 下一步行動

**請提供以下資訊以進一步診斷**：

1. **瀏覽器 Console 日誌**
   - 發布賽程時的所有日誌
   - 特別是包含 "BYE", "auto-advanced" 的訊息

2. **Firestore 數據截圖**
   - matches 集合中的幾筆資料
   - 查看 status, player1Id, player2Id, winnerId

3. **操作步驟**
   - 生成了幾個測試選手/隊伍？
   - 使用什麼賽制發布？
   - 有沒有看到任何錯誤訊息？

有了這些資訊，我可以精確定位問題並修復！

---

**狀態**: 🔍 待診斷  
**優先級**: 高（影響核心功能）

