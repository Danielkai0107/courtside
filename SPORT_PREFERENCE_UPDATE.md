# 運動項目偏好設定更新

## 更新日期

2024-12-23

## 更新內容

### 1. 移除" "選項

- **影響頁面**：`Home.tsx`、`Profile.tsx`
- **變更**：項目選擇器不再顯示" "選項，用戶必須選擇一個特定的運動項目
- **目的**：強制用戶選擇明確的運動項目偏好，提供更個人化的體驗

### 2. 首次登入選擇項目彈窗

- **新增組件**：`SportSelectionModal.tsx` 和 `SportSelectionModal.module.scss`
- **功能**：
  - 用戶首次登入或未設定運動項目時，自動彈出選擇彈窗
  - 從下而上的滑入動畫效果
  - 顯示所有可用的運動項目供用戶選擇
  - 用戶必須選擇一個項目才能繼續使用

### 3. 球類項目自動選擇

- **影響頁面**：`CreateTournament.tsx`、`EditTournament.tsx`
- **變更**：
  - **CreateTournament**：根據用戶的全局運動項目偏好自動選擇，顯示為只讀提示
  - **EditTournament**：顯示賽事的球類項目為只讀，無法修改
- **目的**：簡化賽事創建流程，確保主辦方創建的賽事符合其專業領域

## 修改的文件

### 新增文件

1. `/src/components/common/SportSelectionModal.tsx` - 首次選擇項目彈窗組件
2. `/src/components/common/SportSelectionModal.module.scss` - 彈窗樣式

### 修改文件

1. `/src/hooks/useSportPreference.ts`

   - 將預設值從 `'all'` 改為空字串 `''`
   - 新增 `needsFirstSelection` 狀態來判斷是否需要首次選擇
   - 移除" "相關邏輯

2. `/src/pages/Home.tsx`

   - 移除" "選項
   - 新增 `SportSelectionModal` 彈窗
   - 只在有選擇項目時顯示項目選擇器
   - 移除 `preferredSportId !== "all"` 判斷

3. `/src/pages/Profile.tsx`

   - 移除" "選項
   - 新增 `SportSelectionModal` 彈窗
   - 只在有選擇項目時顯示項目選擇器

4. `/src/pages/organizer/CreateTournament.tsx`

   - 引入 `useSportPreference` hook
   - 移除 `SelectableCard` 選擇介面
   - 根據全局偏好自動選擇球類項目
   - 顯示為只讀提示："已根據您的偏好設定自動選擇"

5. `/src/pages/organizer/EditTournament.tsx`

   - 引入 `useSportPreference` hook
   - 移除 `SelectableCard` 選擇介面
   - 顯示為只讀提示："球類項目無法修改"

6. `/src/pages/organizer/CreateTournament.module.scss`
   - 新增 `.sportDisplay`、`.sportIcon`、`.sportInfo`、`.sportName`、`.sportHint` 樣式
   - 用於顯示只讀的球類項目資訊

## 用戶體驗流程

### 首次登入用戶

1. 用戶登入後，系統檢測到尚未設定運動項目偏好
2. 自動彈出 `SportSelectionModal` 從下而上滑入
3. 用戶選擇一個運動項目並確認
4. 系統儲存偏好設定，彈窗關閉
5. 用戶可以正常使用所有功能

### 已設定偏好的用戶

1. 用戶登入後，系統載入其運動項目偏好
2. 首頁和個人資料頁顯示目前選擇的項目
3. 用戶可以隨時切換項目（但無" "選項）

### 創建賽事

1. 主辦方點擊"創建賽事"
2. 系統自動根據主辦方的全局偏好選擇球類項目
3. 球類項目顯示為只讀，提示"已根據您的偏好設定自動選擇"
4. 主辦方繼續填寫其他賽事資訊

### 編輯賽事

1. 主辦方編輯現有賽事
2. 球類項目顯示為只讀，提示"球類項目無法修改"
3. 主辦方可以修改其他資訊但無法更改球類項目

## 技術細節

### SportSelectionModal 組件

```typescript
interface SportSelectionModalProps {
  isOpen: boolean;
  onSelect: (sportId: string, sportName: string) => void;
}
```

- **isOpen**：控制彈窗顯示/隱藏
- **onSelect**：選擇項目後的回調函數

### useSportPreference Hook 更新

```typescript
return {
  preferredSportId, // 當前選擇的項目 ID（空字串表示未選擇）
  updateSportPreference, // 更新偏好設定的函數
  loading, // 載入狀態
  needsFirstSelection, // 是否需要首次選擇
};
```

## 資料遷移

### 對現有用戶的影響

- **已有偏好設定的用戶**：不受影響，繼續使用現有設定
- **偏好設定為 'all' 的用戶**：下次登入時會彈出選擇彈窗，需要選擇一個特定項目
- **沒有偏好設定的用戶**：首次登入時會彈出選擇彈窗

### 不需要資料遷移

這是一個漸進式更新，不需要批量處理現有資料：

- 現有的 `preferredSportId: 'all'` 會被視為未設定
- 用戶下次登入時會看到選擇彈窗
- 用戶選擇後會更新為特定項目 ID

## 樣式設計

### SportSelectionModal 特點

- 從下而上的滑入動畫（`slideUp`）
- 半透明黑色遮罩背景
- 圓角頂部設計（24px）
- 響應式網格佈局
- 選中狀態的視覺回饋（勾選圖標）

### CreateTournament 球類項目展示

- 卡片式設計，背景色為 `$background-secondary`
- 大尺寸圖標（48px）
- 清晰的項目名稱和提示文字
- 與整體設計風格保持一致

## 測試建議

### 測試場景

1. **新用戶首次登入**

   - 預期：看到運動項目選擇彈窗
   - 操作：選擇一個項目並確認
   - 結果：彈窗關閉，可以正常使用

2. **已設定偏好的用戶登入**

   - 預期：不顯示彈窗，直接進入首頁
   - 結果：首頁顯示對應項目的賽事

3. **切換運動項目**

   - 操作：在首頁或個人資料頁切換項目
   - 結果：頁面內容更新為新項目的賽事

4. **創建賽事**

   - 操作：點擊創建賽事
   - 結果：球類項目自動選擇為用戶偏好項目，顯示為只讀

5. **編輯賽事**
   - 操作：編輯現有賽事
   - 結果：球類項目顯示但無法修改

## 相關文件

- `/src/hooks/useSportPreference.ts` - 運動項目偏好 Hook
- `/src/components/common/SportSelectionModal.tsx` - 首次選擇彈窗
- `/src/pages/Home.tsx` - 首頁
- `/src/pages/Profile.tsx` - 個人資料頁
- `/src/pages/organizer/CreateTournament.tsx` - 創建賽事
- `/src/pages/organizer/EditTournament.tsx` - 編輯賽事
- `/BUGFIX_DUPLICATE_STAFF_NOTIFICATIONS.md` - 紀錄員通知修復（本次更新也包含此修復）
