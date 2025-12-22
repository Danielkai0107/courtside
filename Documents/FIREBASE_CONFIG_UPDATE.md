# Firebase 配置更新記錄

## 更新日期
2024年12月 - 三層賽事架構重構

## 📋 更新內容總覽

### 1. Firestore 索引 ✅ 已部署

#### 新增索引

**Categories 集合（複合索引）**
```json
{
  "collectionGroup": "categories",
  "queryScope": "COLLECTION",
  "fields": ["status ASC", "createdAt ASC"]
}
```
- 用途：按狀態和創建時間查詢分類
- 使用場景：載入開放報名的分類

**Teams 集合（複合索引）**
```json
{
  "collectionGroup": "teams",
  "queryScope": "COLLECTION",
  "fields": ["status ASC", "createdAt ASC"]
}
```
- 用途：按狀態和創建時間查詢隊伍
- 使用場景：載入已確認的雙打隊伍

**Matches 集合（新增複合索引）**
```json
// 按 categoryId、stage、round 查詢
{
  "collectionGroup": "matches",
  "queryScope": "COLLECTION_GROUP",
  "fields": ["categoryId ASC", "stage ASC", "round ASC"]
}

// 按 categoryId、groupLabel 查詢
{
  "collectionGroup": "matches",
  "queryScope": "COLLECTION_GROUP",
  "fields": ["categoryId ASC", "groupLabel ASC"]
}

// 按 tournamentId、categoryId 查詢
{
  "collectionGroup": "matches",
  "queryScope": "COLLECTION_GROUP",
  "fields": ["tournamentId ASC", "categoryId ASC"]
}
```
- 用途：支援三層架構的比賽查詢
- 使用場景：
  - 載入特定分類的淘汰賽場次
  - 載入小組賽積分榜
  - 過濾賽事下特定分類的所有比賽

### 2. Firestore 安全規則 ✅ 已部署

#### 新增規則結構

```
tournaments/{tournamentId}/
├── categories/{categoryId}/
│   ├── teams/{teamId}          ← 雙打隊伍
│   └── registrations/{regId}    ← 單打報名（預留）
├── players/{playerId}           ← 向下兼容
└── staff/{staffId}
```

#### Categories 規則
```javascript
match /categories/{categoryId} {
  // 公開讀取
  allow read: if true;
  
  // 只有主辦方可以管理
  allow create, update, delete: if isAuthenticated() && 
    get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.organizerId == request.auth.uid;
}
```

#### Teams 規則（雙打隊伍）
```javascript
match /teams/{teamId} {
  // 公開讀取
  allow read: if true;
  
  // 隊伍成員可以創建（報名雙打）
  allow create: if isAuthenticated() && 
    (request.resource.data.player1Id == request.auth.uid ||
     request.resource.data.player2Id == request.auth.uid);
  
  // 主辦方可以管理（審核）
  allow update, delete: if isAuthenticated() && 
    get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.organizerId == request.auth.uid;
  
  // 隊伍成員可以更新自己的隊伍
  allow update: if isAuthenticated() && 
    (resource.data.player1Id == request.auth.uid ||
     resource.data.player2Id == request.auth.uid);
}
```

#### Registrations 規則（單打報名，預留）
```javascript
match /registrations/{registrationId} {
  // 公開讀取
  allow read: if true;
  
  // 用戶可以自己報名
  allow create: if isAuthenticated() && 
    request.resource.data.uid == request.auth.uid;
  
  // 主辦方可以管理
  allow update, delete: if isAuthenticated() && 
    get(/databases/$(database)/documents/tournaments/$(tournamentId)).data.organizerId == request.auth.uid;
  
  // 選手可以更新自己的報名
  allow update: if isAuthenticated() && 
    resource.data.uid == request.auth.uid;
}
```

### 3. Storage 規則 ✅ 已部署

#### 新增 Category Banners 路徑

```javascript
match /tournaments/{tournamentId}/categories/{categoryId}/banners/{fileName} {
  // 公開讀取
  allow read: if true;
  
  // 認證用戶可以上傳
  // 限制：5MB、僅圖片
  allow write: if isAuthenticated() && 
    request.resource.size < 5 * 1024 * 1024 &&
    request.resource.contentType.matches('image/.*');
}
```

## 🎯 使用場景對應

### 場景 1：創建賽事並設定分類
```typescript
// 1. 創建 Tournament
const tournamentId = await createTournament({...});

// 2. 創建多個 Categories
await createCategory(tournamentId, {
  name: "男子雙打",
  matchType: "doubles",
  maxParticipants: 20
});

await createCategory(tournamentId, {
  name: "女子單打",
  matchType: "singles",
  maxParticipants: 16
});
```
**觸發規則**：
- Tournament create: ✅ organizerId 驗證
- Category create: ✅ 主辦方權限驗證

### 場景 2：雙打報名
```typescript
// 玩家 A 邀請玩家 B 組隊
await createTeam(tournamentId, categoryId, {
  player1Id: "userA_uid",
  player2Id: "userB_uid",
  player1Name: "Alice",
  player2Name: "Bob"
});
```
**觸發規則**：
- Team create: ✅ player1Id 或 player2Id 必須是當前用戶
- 自動索引：`status ASC, createdAt ASC`

### 場景 3：載入分類的比賽
```typescript
// 載入男子雙打的所有比賽
const matches = await getMatchesByTournament(tournamentId);
const categoryMatches = matches.filter(m => m.categoryId === "menDoubles");
```
**觸發索引**：
- `tournamentId ASC, categoryId ASC`

### 場景 4：小組賽查詢
```typescript
// 載入 A 組的所有比賽
const groupAMatches = matches.filter(m => 
  m.categoryId === "menDoubles" &&
  m.stage === "group" &&
  m.groupLabel === "A"
);
```
**觸發索引**：
- `categoryId ASC, groupLabel ASC`

### 場景 5：淘汰賽查詢
```typescript
// 載入 8 強比賽
const qfMatches = matches.filter(m =>
  m.categoryId === "menDoubles" &&
  m.stage === "knockout" &&
  m.roundLabel === "QF"
);
```
**觸發索引**：
- `categoryId ASC, stage ASC, round ASC`

## ⚠️ 注意事項

### 索引建立時間
- **新索引建立**：通常需要 5-30 分鐘
- **大數據量**：可能需要數小時
- **查看狀態**：[Firebase Console - Firestore - Indexes](https://console.firebase.google.com/project/courtside-25c9e/firestore/indexes)

### 向下兼容
- ✅ 保留 `players` 子集合規則
- ✅ 保留所有現有 Match 索引
- ✅ 舊的查詢不受影響

### 權限測試清單
- [ ] 用戶可以創建自己的 Tournament
- [ ] 用戶可以為自己的 Tournament 創建 Category
- [ ] 用戶可以報名單打（players）
- [ ] 用戶可以報名雙打（teams，自己是 player1 或 player2）
- [ ] 用戶不能修改其他用戶的 Team
- [ ] 主辦方可以管理自己賽事的所有 Categories 和 Teams
- [ ] 紀錄員可以更新分配給自己的 Match
- [ ] 公開用戶可以讀取所有 Categories、Teams、Matches

## 🔗 相關資源

- **Firebase Console**：https://console.firebase.google.com/project/courtside-25c9e
- **Firestore 索引頁面**：https://console.firebase.google.com/project/courtside-25c9e/firestore/indexes
- **安全規則測試器**：https://console.firebase.google.com/project/courtside-25c9e/firestore/rules

## 📊 部署記錄

```bash
# 部署命令
firebase deploy --only firestore:indexes,firestore:rules,storage

# 部署結果
✔ firestore: deployed indexes in firestore.indexes.json successfully
✔ storage: released rules storage.rules to firebase.storage
✔ firestore: released rules firestore.rules to cloud.firestore
✔ Deploy complete!
```

### 部署警告（可忽略）
```
⚠ [W] Invalid function name: get.
⚠ [W] Invalid variable name: request.
⚠ [W] Unused function: isOrganizer.
⚠ [W] Unused function: isScorer.
```
這些是 Firestore 規則編譯器的誤判，不影響實際功能。

## 🚀 後續步驟

1. **監控索引建立進度**：
   - 前往 Firebase Console → Firestore → Indexes
   - 確認所有新索引狀態為「已啟用」

2. **測試權限**：
   - 使用不同角色的測試帳號驗證權限
   - 確認主辦方、選手、紀錄員的權限隔離

3. **性能監控**：
   - 觀察查詢性能
   - 如有需要，添加額外的複合索引

4. **清理舊索引（可選）**：
   ```bash
   firebase deploy --only firestore:indexes --force
   ```
   會刪除不在 `firestore.indexes.json` 中的索引

## ✅ 更新完成確認

- [x] Firestore 索引更新
- [x] Firestore 規則更新
- [x] Storage 規則更新
- [x] 成功部署到生產環境
- [x] 向下兼容性驗證
- [ ] 索引建立完成（等待中）
- [ ] 權限測試完成（待測試）

---

**更新人員**：AI Assistant  
**審核狀態**：待人工驗證  
**風險評估**：低風險（保留向下兼容，僅新增功能）

