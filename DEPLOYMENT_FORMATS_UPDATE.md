# Formats 系統部署指南

## 更新內容

已完成「賽制模板與規則系統」的完整實作，需要部署 Firestore 規則更新。

---

## 部署步驟

### 1. 部署 Firestore 規則

```bash
firebase deploy --only firestore:rules
```

**說明：**
- 新增了 `formats` 集合的讀取權限
- 允許所有人讀取（類似 sports 集合）
- 只有認證用戶可以寫入（管理員用）

### 2. 驗證規則部署

部署後，在瀏覽器 Console 應該不再看到權限錯誤：
```
✅ 成功：formats 集合正常載入
❌ 失敗：Failed to load formats: Missing or insufficient permissions
```

---

## 新增的 Firestore 規則

```javascript
// Formats collection (system configuration)
match /formats/{formatId} {
  // Everyone can read format templates (needed for tournament creation)
  allow read: if true;
  
  // Only authenticated users can create formats (for admin initialization)
  allow create: if isAuthenticated();
  
  // Only authenticated users can update/delete formats (for future admin management)
  allow update, delete: if isAuthenticated();
}
```

---

## 功能驗證清單

部署後請測試：

### 測試 1: 載入模板
- [ ] 進入「建立賽事」
- [ ] 到達 Step 3「分類設定」
- [ ] 點擊「新增分類」
- [ ] 確認模板正確載入（應該看到 6 個模板）
- [ ] Console 無權限錯誤

### 測試 2: 選擇模板
- [ ] 選擇「16強淘汰賽」模板
- [ ] 看到模板預覽（報名上限：16人）
- [ ] 選擇規則「BWF標準」
- [ ] 看到規則預覽（3戰2勝、每局21分）

### 測試 3: 生成佔位符
- [ ] 送出賽事
- [ ] 進入 CategoryDetail
- [ ] 看到空的對戰結構（Match 顯示「待定 vs 待定」）
- [ ] Match 顯示「預覽」標籤

### 測試 4: 賽程管理
- [ ] 報名截止後
- [ ] 進入「賽程管理」Tab
- [ ] 如果人數符合，看到「✅ 人數符合原定模板」
- [ ] 點擊「發布賽程」
- [ ] 選手正確分配

### 測試 5: 局數制記分
- [ ] 紀錄員進入計分板
- [ ] 看到局數制 UI（第1局、第2局、第3局）
- [ ] 記分時局數正確更新
- [ ] 贏下本局後自動進入下一局
- [ ] 贏得比賽後自動晉級

---

## 已知問題

### BloomFilter Error

Console 中可能會看到：
```
@firebase/firestore: BloomFilter error
```

**說明：** 這是 Firestore SDK 的已知問題，不影響功能。可以忽略。

---

## 技術支援

如果遇到問題：

1. **權限錯誤持續**
   - 檢查規則是否正確部署：`firebase firestore:rules:get`
   - 清除瀏覽器快取並重新整理

2. **模板不顯示**
   - 確認 formats 集合有資料
   - 檢查 Console 錯誤訊息

3. **佔位符未生成**
   - 檢查 Console 是否有錯誤
   - 確認選擇的模板有 stages 欄位

---

## 部署完成後

系統現已支援：
- ✅ 賽制模板選擇
- ✅ 規則系統整合
- ✅ 佔位符預覽
- ✅ 局數制記分
- ✅ 智能推薦

**立即體驗「專業賽事的骨架，傻瓜模式的操作」！** 🚀

