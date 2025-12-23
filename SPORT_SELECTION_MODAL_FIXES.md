# 運動項目選擇彈窗修復與優化

## 修復日期
2024-12-23

## 修復的問題

### 1. ❌ 每次登入都要選擇項目
**原因**：
- `syncUserProfile` 創建新用戶時沒有初始化 `preferredSportId` 字段
- 導致 `useSportPreference` 讀到 `undefined`，判斷為需要首次選擇

**修復**：
- 在 `userService.ts` 的 `syncUserProfile` 中，新用戶創建時設置 `preferredSportId: ''`
- 添加 TypeScript 類型定義 `UserProfile.preferredSportId?: string`
- 添加詳細的調試日誌追蹤保存流程

### 2. ❌ 彈窗被 BottomNav 擋住
**原因**：
- `SportSelectionModal` 的 `z-index: 1000`
- `BottomNav` 的 `z-index: 1000`
- 兩者在同一層級，導致 BottomNav 可能蓋住 Modal

**修復**：
- 將 `SportSelectionModal` 的 `z-index` 提高到 `1100`
- 確保 Modal 始終在最上層

### 3. 🔄 下拉選單改為彈窗按鈕
**需求**：
- 將 `Home.tsx` 和 `Profile.tsx` 的下拉選單改為彈窗按鈕
- 點擊後彈出相同的運動項目選擇彈窗

**實現**：
- 移除 `Select` 組件
- 添加 `sportButton` 按鈕樣式
- 使用相同的 `SportSelectionModal` 組件
- 區分首次選擇和切換選擇的標題

## 修改的文件

### 1. `/src/services/userService.ts`
```typescript
// 新用戶創建時初始化 preferredSportId
const newProfile: UserProfile = {
  // ...
  preferredSportId: '', // 新用戶預設為空，觸發首次選擇彈窗
};
```

### 2. `/src/types/index.ts`
```typescript
export interface UserProfile {
  // ...
  preferredSportId?: string; // 用戶偏好的運動項目
}
```

### 3. `/src/hooks/useSportPreference.ts`
- 添加詳細的調試日誌
- 在 `updateSportPreference` 中記錄保存過程

### 4. `/src/components/common/SportSelectionModal.tsx`
**新增 Props**：
```typescript
interface SportSelectionModalProps {
  isOpen: boolean;
  onSelect: (sportId: string, sportName: string) => void;
  currentSportId?: string; // 當前選擇的項目
  title?: string;          // 自訂標題
}
```

**功能增強**：
- 支援重複開啟（保留上次選擇）
- 可自訂標題（首次選擇 vs 切換項目）
- 自動預選當前項目

### 5. `/src/components/common/SportSelectionModal.module.scss`
```scss
.overlay {
  z-index: 1100; // 從 1000 提高到 1100
}
```

### 6. `/src/pages/Home.tsx`
**移除**：
- `Select` 組件引入
- `sportOptions` 配置
- 下拉選單 DOM

**新增**：
- `showSportModal` 狀態
- `sportButton` 按鈕
- 兩個獨立的 `SportSelectionModal`（首次選擇 + 切換項目）
- `getCurrentSportDisplay()` 函數

**按鈕樣式**：
```tsx
<button
  className={styles.sportButton}
  onClick={() => setShowSportModal(true)}
>
  {getCurrentSportDisplay()}
</button>
```

### 7. `/src/pages/Profile.tsx`
與 `Home.tsx` 相同的修改

### 8. `/src/pages/Home.module.scss` 和 `/src/pages/Profile.module.scss`
**新增 `.sportButton` 樣式**：
```scss
.sportButton {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #475467;
  font-weight: 500;
  font-size: 16px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  &:active {
    transform: scale(0.98);
  }
}
```

## 用戶體驗流程

### 首次登入（新用戶）
1. ✅ 用戶登入 → 系統檢測到 `preferredSportId === ''`
2. ✅ 自動彈出「選擇你的運動項目」彈窗
3. ✅ 用戶選擇項目並確認 → 保存到 Firestore
4. ✅ 彈窗關閉，顯示項目按鈕

### 切換項目
1. ✅ 用戶點擊頁面頂部的項目按鈕
2. ✅ 彈出「切換運動項目」彈窗
3. ✅ 預選當前項目（可以看到當前選擇）
4. ✅ 用戶選擇新項目並確認 → 保存到 Firestore
5. ✅ 彈窗關閉，頁面更新

### 重複登入（已有偏好設定）
1. ✅ 用戶登入 → 系統讀取 `preferredSportId`
2. ✅ 不顯示首次選擇彈窗
3. ✅ 直接進入首頁，顯示項目按鈕

## Z-Index 層級管理

| 組件 | Z-Index | 用途 |
|------|---------|------|
| Page Header | 10 | 頁面標題欄 |
| BottomNav | 1000 | 底部導航欄 |
| **SportSelectionModal** | **1100** | **運動項目選擇彈窗** |
| Loading Overlay | 9999 | 全螢幕載入遮罩 |

## 調試日誌

### useSportPreference
- `🏀 [useSportPreference] 載入用戶偏好` - 顯示載入的 sportId
- `🏀 [useSportPreference] 準備更新偏好` - 顯示要保存的 sportId
- `✅ [useSportPreference] 偏好已保存到 Firestore` - 確認保存成功
- `❌ [useSportPreference] 保存失敗` - 顯示錯誤訊息

### SportSelectionModal
- `🎯 [SportSelectionModal] isOpen changed` - 彈窗開啟/關閉
- `🎯 [SportSelectionModal] 載入了 X 個運動項目` - 項目載入完成
- `🎯 [SportSelectionModal] 用戶選擇了` - 顯示用戶選擇

### syncUserProfile
- `✅ [syncUserProfile] 新用戶資料已創建` - 新用戶創建確認

## 測試建議

### 測試場景 1：新用戶首次登入
1. 清除瀏覽器資料或使用無痕模式
2. 登入系統
3. **預期**：自動彈出「選擇你的運動項目」彈窗
4. 選擇一個項目並確認
5. **預期**：彈窗關閉，顯示項目按鈕，不被 BottomNav 擋住

### 測試場景 2：切換運動項目
1. 已登入且有偏好設定的用戶
2. 點擊頁面頂部的項目按鈕
3. **預期**：彈出「切換運動項目」彈窗
4. **預期**：當前項目已預選（有勾選標記）
5. 選擇其他項目並確認
6. **預期**：按鈕文字更新，頁面內容更新

### 測試場景 3：重複登入
1. 已有偏好設定的用戶登出後重新登入
2. **預期**：不顯示首次選擇彈窗
3. **預期**：直接顯示上次選擇的項目
4. 查看控制台日誌確認偏好設定已載入

### 測試場景 4：彈窗層級
1. 開啟運動項目選擇彈窗
2. **預期**：彈窗完全顯示，不被 BottomNav 遮擋
3. **預期**：可以完整看到「確認」按鈕並點擊

## 已解決的 Bug

✅ 每次登入都要重新選擇項目（已修復）  
✅ 彈窗被 BottomNav 擋住（已修復）  
✅ 下拉選單體驗不佳（改為彈窗按鈕）  
✅ 紀錄員通知重複發送（之前已修復）

## 相關文件

- `/src/services/userService.ts` - 用戶資料同步
- `/src/hooks/useSportPreference.ts` - 運動項目偏好 Hook
- `/src/components/common/SportSelectionModal.tsx` - 選擇彈窗組件
- `/src/pages/Home.tsx` - 首頁
- `/src/pages/Profile.tsx` - 個人資料頁
- `/BUGFIX_DUPLICATE_STAFF_NOTIFICATIONS.md` - 紀錄員通知修復
- `/SPORT_PREFERENCE_UPDATE.md` - 運動項目偏好更新

