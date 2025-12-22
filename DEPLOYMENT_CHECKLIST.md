# 🚀 通用運動引擎 - 部署檢查清單

## ✅ 已完成的步驟

### 1. 核心實施 ✅
- [x] 類型系統定義
- [x] 後端服務重構
- [x] 前端組件開發
- [x] 種子數據腳本
- [x] 完整文檔

### 2. 數據填充 ✅
- [x] 安裝必要依賴（dotenv, tsx）
- [x] 修復 Firebase 配置問題
- [x] 更新 Firestore 規則
- [x] 成功執行種子腳本

**填充結果**：
```
✅ 3 種運動：桌球、羽毛球、匹克球
✅ 9 個規則預設
✅ 6 種賽制格式（2-20人）
```

### 3. Git 版本控制 ✅
- [x] 分支創建：`feature/universal-sports-engine`
- [x] 9 個主要提交
- [x] 完整的提交歷史

---

## ⚠️ 安全提醒

### Firestore 規則（重要！）

當前規則為**開發模式**，允許未認證寫入 `/sports` 和 `/formats`：

```javascript
// TEMPORARY: 當前設定
match /sports/{sportId} {
  allow read: if true;
  allow write: if true;  // ⚠️ 開放寫入
}

match /formats/{formatId} {
  allow read: if true;
  allow write: if true;  // ⚠️ 開放寫入
}
```

### 🔒 生產環境前必須執行

1. **鎖定規則**：編輯 `firestore.rules`

```javascript
// PRODUCTION: 修改為
match /sports/{sportId} {
  allow read: if true;
  allow write: if isAuthenticated();  // ✅ 需要認證
}

match /formats/{formatId} {
  allow read: if true;
  allow write: if isAuthenticated();  // ✅ 需要認證
}
```

2. **部署規則**：
```bash
firebase deploy --only firestore:rules
```

---

## 🧪 測試檢查清單

### 端到端測試

#### 1. 驗證種子數據 ✅
- [x] 登入 Firebase Console
- [x] 檢查 `/sports` 集合（應該有 3 個文檔）
- [x] 檢查 `/formats` 集合（應該有 6 個文檔）

#### 2. 創建測試賽事 ⏳
- [ ] 使用 `UniversalCategoryForm` 創建分類
- [ ] 驗證配置快照是否正確保存
- [ ] 檢查 Firestore 中的 `CategoryDoc`

#### 3. 註冊參賽者 ⏳
- [ ] 註冊至少 8 位選手
- [ ] 確認選手狀態為 "confirmed"

#### 4. 生成賽程 ⏳
- [ ] 呼叫 `generateScheduleUniversal()`
- [ ] 驗證 Match 文檔已創建
- [ ] 檢查 Linked List 結構（nextMatchId, nextMatchSlot）
- [ ] 確認 Bye 自動晉級

#### 5. 計分測試 ⏳
- [ ] 使用 `UniversalScoreboard` 進行計分
- [ ] 驗證 Deuce 規則
- [ ] 驗證分數上限（如果有）
- [ ] 確認自動晉級功能

#### 6. 完成賽事 ⏳
- [ ] 完成所有比賽
- [ ] 驗證勝者記錄
- [ ] 檢查賽事統計

---

## 🔄 整合到現有 UI

### 優先級 P1

#### 1. 整合 UniversalCategoryForm
**位置**: `src/pages/organizer/TournamentDashboard.tsx`

```typescript
// 選項 A: 替換現有的分類創建邏輯
import UniversalCategoryForm from '../../components/features/UniversalCategoryForm';

// 選項 B: 提供"使用通用引擎"切換
<Switch>
  <label>使用通用運動引擎</label>
  <input type="checkbox" checked={useUniversalEngine} />
</Switch>

{useUniversalEngine ? (
  <UniversalCategoryForm tournamentId={tournamentId} />
) : (
  <CategoryManager tournamentId={tournamentId} />
)}
```

#### 2. 整合 UniversalScoreboard
**位置**: `src/pages/scorer/ScoringConsole.tsx`

```typescript
// 根據分類類型動態選擇計分板
const category = await getCategory(match.tournamentId, match.categoryId);

if (category && category.scoringConfig) {
  // 使用通用計分板
  return <UniversalScoreboard match={match} />;
} else {
  // 使用舊計分板（向後兼容）
  return <LegacyScoreboard match={match} />;
}
```

#### 3. 更新 BracketView
**位置**: `src/components/features/BracketView.tsx`

```typescript
// 支持新的 formatConfig.stages 結構
const category = await getCategory(tournamentId, categoryId);

if (category.formatConfig) {
  // 根據 stages 動態渲染
  return <UniversalBracketView formatConfig={category.formatConfig} />;
} else {
  // 舊版顯示
  return <LegacyBracketView />;
}
```

---

## 📋 部署步驟

### 開發環境測試

1. **本地測試**
```bash
npm run dev
```

2. **測試流程**
- 創建測試賽事
- 創建分類（使用通用引擎）
- 註冊參賽者
- 生成賽程
- 進行計分
- 完成賽事

### 預生產環境

1. **構建**
```bash
npm run build
```

2. **預覽**
```bash
npm run preview
```

3. **測試構建版本**
- 執行完整測試流程
- 驗證所有功能正常

### 生產環境部署

1. **鎖定 Firestore 規則** ⚠️
```bash
# 編輯 firestore.rules（如上所述）
firebase deploy --only firestore:rules
```

2. **部署應用**
```bash
firebase deploy --only hosting
```

3. **部署 Cloud Functions**（如果有）
```bash
firebase deploy --only functions
```

4. **驗證部署**
- 訪問生產環境 URL
- 執行煙霧測試
- 檢查 Firebase Console 日誌

---

## 🐛 故障排除

### 問題 1: 種子腳本失敗
**症狀**: `PERMISSION_DENIED` 錯誤

**解決方案**:
1. 檢查 Firestore 規則是否允許寫入
2. 確認 Firebase 配置正確
3. 驗證 `.env` 文件存在且完整

### 問題 2: 找不到適合的格式
**症狀**: 創建分類時提示"找不到適合的格式"

**解決方案**:
1. 檢查參賽人數範圍
2. 驗證 `/formats` 集合中的數據
3. 如需支持更多人數，添加新格式到 `seed-db.ts`

### 問題 3: 計分時出錯
**症狀**: `recordScoreUniversal()` 失敗

**解決方案**:
1. 確認 `category.scoringConfig` 存在
2. 檢查 `match.sets` 陣列已初始化
3. 驗證 Firestore 規則允許更新

### 問題 4: 自動晉級不工作
**症狀**: 勝者沒有自動填入下一場

**解決方案**:
1. 檢查 `match.nextMatchId` 和 `nextMatchSlot` 是否設置
2. 驗證下一場比賽文檔存在
3. 檢查 Firestore 日誌

---

## 📊 監控指標

### 關鍵指標

1. **數據完整性**
- Sports 集合: 3 個文檔
- Formats 集合: 6 個文檔
- 所有配置欄位完整

2. **性能指標**
- Bracket 生成時間 < 5 秒
- 計分響應時間 < 1 秒
- 自動晉級延遲 < 2 秒

3. **用戶體驗**
- 零硬編碼錯誤
- 所有運動正常運作
- UI 流暢無卡頓

---

## 🎯 成功標準

部署被認為成功，當：

- [ ] 所有種子數據已填充
- [ ] Firestore 規則已鎖定（生產環境）
- [ ] 端到端測試通過
- [ ] 3 種運動都能正常使用
- [ ] 計分和晉級功能正常
- [ ] 沒有控制台錯誤
- [ ] 用戶反饋積極

---

## 📚 相關文檔

- [實施總結](./UNIVERSAL_ENGINE_SUMMARY.md)
- [快速開始指南](./Documents/UNIVERSAL_ENGINE_QUICKSTART.md)
- [實施狀態報告](./Documents/UNIVERSAL_ENGINE_STATUS.md)

---

## 🎉 當前狀態

```
✅ 核心實施：100% 完成
✅ 數據填充：100% 完成
⏳ UI 整合：0% 完成
⏳ 測試驗證：0% 完成
⏳ 生產部署：0% 完成

總體進度：40% → 60%（數據填充後）
```

---

**下一步**: 開始 UI 整合和端到端測試

**預計完成時間**: 4-6 小時

**分支**: `feature/universal-sports-engine`
**最後更新**: 2024-12-23

