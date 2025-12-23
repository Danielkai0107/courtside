# 導航結構重構完成

## 修改日期
2024-12-23

## 修改概述
將原本的 MyGames 頁面的三個頁籤拆分成三個獨立的頁面，並統一所有頁面的 header 高度為 50px。

## 主要變更

### 1. 新增三個獨立頁面

#### 我的比賽 (MyGamesPlayer)
- 路徑：`/my-games`
- 文件：
  - `src/pages/MyGamesPlayer.tsx`
  - `src/pages/MyGamesPlayer.module.scss`
- 功能：顯示用戶參加的賽事
- Header：包含標題和運動項目切換按鈕

#### 我的主辦 (MyGamesOrganizer)
- 路徑：`/my-organizer`
- 文件：
  - `src/pages/MyGamesOrganizer.tsx`
  - `src/pages/MyGamesOrganizer.module.scss`
- 功能：顯示用戶主辦的賽事
- Header：包含標題和運動項目切換按鈕
- 特色：包含浮動的建立賽事按鈕

#### 計分任務 (MyGamesScorer)
- 路徑：`/my-scorer`
- 文件：
  - `src/pages/MyGamesScorer.tsx`
  - `src/pages/MyGamesScorer.module.scss`
- 功能：顯示用戶的計分任務
- Header：包含標題和運動項目切換按鈕

### 2. 統一 Header 設計

所有頁面的 header 統一為：
- 高度：50px（固定）
- 背景：主題色 ($primary-color)
- 文字顏色：白色
- 位置：sticky，始終在頂部
- 內容：左側標題 + 右側功能按鈕

受影響的頁面：
- `Home.tsx` - 添加運動項目切換按鈕
- `MyGamesPlayer.tsx` - 運動項目切換按鈕
- `MyGamesOrganizer.tsx` - 運動項目切換按鈕
- `MyGamesScorer.tsx` - 運動項目切換按鈕
- `Notifications.tsx` - 純標題 header
- `Profile.tsx` - 添加通知 icon

### 3. Profile 頁面更新

#### 移除功能
- 移除運動項目切換按鈕

#### 新增功能
- 在 header 右側添加通知 icon
- 顯示未讀通知數量徽章
- 點擊導航到通知頁面

#### 樣式更新
- Header 高度統一為 50px
- 通知按鈕樣式：圓形背景，hover 效果
- 徽章樣式：紅色背景，顯示未讀數量

### 4. 底部導航更新

#### BottomNav 變更
- 移除通知頁籤（通知改為從 Profile 進入）
- 新增三個獨立頁籤：
  1. 首頁 - `home` icon
  2. 我的比賽 - `sports_tennis` icon
  3. 我的主辦 - `emoji_events` icon
  4. 計分任務 - `scoreboard` icon
  5. 個人 - `person` icon

#### 移除功能
- 移除未讀通知數量監聽
- 移除徽章顯示邏輯
- 簡化導航項目結構

### 5. 路由配置更新

#### App.tsx 變更
```typescript
// 新增路由
<Route path="/my-games" element={<MyGamesPlayer />} />
<Route path="/my-organizer" element={<MyGamesOrganizer />} />
<Route path="/my-scorer" element={<MyGamesScorer />} />

// 通知頁面添加 AuthGuard
<Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
```

### 6. 樣式統一

#### Header 樣式規範
```scss
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: $primary-color;
  border-bottom: 1px solid $border-color;
  padding: 0 $spacing-lg;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 50px;
  min-height: 50px;
  max-height: 50px;
}

.headerTitle {
  font-size: $font-size-xl;
  font-weight: 700;
  color: #fff;
  margin: 0;
}
```

#### 運動項目切換按鈕樣式
```scss
.sportButton {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  color: #fff;
  font-size: $font-size-sm;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
```

## 用戶體驗改進

### 導航更清晰
- 三個功能獨立成頁面，不再需要在頁籤間切換
- 底部導航直接顯示所有主要功能
- 減少點擊層級

### 視覺統一
- 所有頁面 header 高度一致
- 統一的主題色背景
- 一致的交互反饋

### 功能整合
- 通知功能整合到 Profile 頁面
- 更符合用戶習慣的信息架構

## 技術細節

### 狀態管理
- 每個頁面獨立管理自己的狀態
- 共用 `useSportPreference` hook
- 共用 `useAuth` context

### 性能優化
- 每個頁面只在激活時載入數據
- 使用 React.memo 優化組件渲染
- 適當的 useEffect 依賴管理

### 響應式設計
- 所有頁面適配移動設備
- 固定 header 高度確保一致性
- 底部導航適配不同屏幕尺寸

## 測試建議

### 功能測試
1. 測試三個新頁面的數據載入
2. 測試運動項目切換功能
3. 測試通知功能和徽章顯示
4. 測試底部導航的路由跳轉

### 視覺測試
1. 檢查所有頁面 header 高度一致性
2. 檢查主題色應用是否正確
3. 檢查按鈕 hover 和 active 狀態
4. 檢查不同設備上的顯示效果

### 用戶流程測試
1. 從首頁到各個功能頁面的導航
2. 通知查看流程
3. 賽事管理流程
4. 計分任務流程

## 後續優化建議

1. **性能監控**
   - 監控頁面載入時間
   - 優化大數據列表渲染

2. **用戶反饋**
   - 收集用戶對新導航結構的反饋
   - 根據使用數據調整功能優先級

3. **功能增強**
   - 考慮添加頁面切換動畫
   - 優化載入狀態顯示
   - 添加下拉刷新功能

## 相關文件

### 新增文件
- `src/pages/MyGamesPlayer.tsx`
- `src/pages/MyGamesPlayer.module.scss`
- `src/pages/MyGamesOrganizer.tsx`
- `src/pages/MyGamesOrganizer.module.scss`
- `src/pages/MyGamesScorer.tsx`
- `src/pages/MyGamesScorer.module.scss`

### 修改文件
- `src/App.tsx`
- `src/pages/Home.tsx`
- `src/pages/Home.module.scss`
- `src/pages/Profile.tsx`
- `src/pages/Profile.module.scss`
- `src/pages/Notifications.tsx`
- `src/pages/Notifications.module.scss`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/BottomNav.module.scss`

### 可移除文件（保留作為參考）
- `src/pages/MyGames.tsx`
- `src/pages/MyGames.module.scss`

## 版本信息
- 修改前版本：使用 MyGames 頁面的三頁籤設計
- 修改後版本：獨立頁面 + 統一 header 設計

