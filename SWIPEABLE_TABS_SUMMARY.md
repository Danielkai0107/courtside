# Tabs 滑動切換功能 - 實施總結

## 🎉 功能特點

**左右滑動切換** - 向左滑切換到下一個 tab，向右滑切換到上一個 tab  
 **智能方向判斷** - 自動區分橫向/縱向滑動，避免誤觸  
 **嵌套優先支持** - 多層 tabs 時內層優先響應  
 **向後兼容** - 預設不啟用，不影響現有頁面  
 **可調整靈敏度** - 通過 `swipeThreshold` 參數控制

## 📦 新增檔案

### 核心組件

1. **`src/components/common/SwipeableTabs.tsx`** (新建)

   - 獨立的可滑動 Tabs 組件
   - 完整的滑動邏輯實現

2. **`src/hooks/useSwipeableTabs.ts`** (新建)
   - 滑動邏輯 Hook
   - 可重用的滑動檢測邏輯

### 更新檔案

3. **`src/components/common/Tabs.tsx`** (更新)

   - 添加 `enableSwipe` 選項
   - 支持包裹內容區域
   - 向後兼容原有用法

4. **`src/components/common/Tabs.module.scss`** (更新)
   - 添加滑動容器樣式
   - 添加嵌套層級樣式
   - 添加滑動狀態視覺反饋

### 文檔

5. **`SWIPEABLE_TABS_USAGE.md`** - 詳細使用指南
6. **`SWIPEABLE_TABS_IMPLEMENTED.md`** - 實施狀態和待更新頁面清單
7. **`SWIPEABLE_TABS_SUMMARY.md`** - 本總結文檔

## 已啟用滑動的頁面

1. **`src/pages/organizer/TournamentDashboard.tsx`**

   - 賽事管理面板
   - 5 個 tabs：賽事資訊、選手管理、紀錄員管理、場地管理、賽程管理

2. **`src/pages/Events.tsx`**

   - 賽事列表頁
   - 2 個 tabs：開放報名、進行中/已完成

3. **`src/pages/MyGames.tsx`**
   - 我的比賽頁
   - 2 個 tabs：已報名、已確認場次

## 🔧 使用方法

### 基本用法（單層 Tabs）

```tsx
<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onChange={setActiveTab}
  enableSwipe={true} // 啟用滑動
  swipeThreshold={60} // 滑動距離閾值（可選）
>
  {/* Tab 內容必須包裹在 Tabs 內 */}
  <div>
    {activeTab === "tab1" && <div>內容 1</div>}
    {activeTab === "tab2" && <div>內容 2</div>}
  </div>
</Tabs>
```

### 嵌套用法（內層優先）

```tsx
{/* 外層 Tabs */}
<Tabs enableSwipe={true} ...>
  <div>
    {/* 內層 Tabs - 設置 nested={true} */}
    <Tabs
      enableSwipe={true}
      nested={true}        // 重要！內層優先響應
      ...
    >
      {/* 內層內容 */}
    </Tabs>
  </div>
</Tabs>
```

## 📋 API 參數

| 參數             | 類型                      | 預設值  | 說明                           |
| ---------------- | ------------------------- | ------- | ------------------------------ |
| `tabs`           | `Tab[]`                   | 必填    | Tab 選項列表                   |
| `activeTab`      | `string`                  | 必填    | 當前活動的 tab                 |
| `onChange`       | `(tabId: string) => void` | 必填    | Tab 切換回調                   |
| `enableSwipe`    | `boolean`                 | `false` | 是否啟用滑動切換               |
| `swipeThreshold` | `number`                  | `50`    | 滑動距離閾值（px）             |
| `nested`         | `boolean`                 | `false` | 是否為嵌套的內層 tabs          |
| `children`       | `ReactNode`               | -       | Tab 內容區域（啟用滑動時必填） |

## 🎯 滑動靈敏度建議

| 使用場景       | 建議值   | 說明                   |
| -------------- | -------- | ---------------------- |
| 手機（小螢幕） | `40-50`  | 更靈敏，方便快速切換   |
| 平板（中螢幕） | `60-70`  | 平衡靈敏度與誤觸       |
| 內容豐富頁面   | `70-100` | 避免滾動時誤觸         |
| 嵌套 Tabs      | `60-80`  | 確保內外層都能正常響應 |

## 📱 滑動行為

### 滑動方向判斷

1. 用戶開始觸摸時記錄起始位置
2. 滑動超過 10px 時判斷方向（橫向/縱向）
3. **橫向滑動** → 觸發 tab 切換
4. **縱向滑動** → 允許頁面滾動

### Tab 切換邏輯

- **向左滑** ≥ 閾值 → 切換到下一個 tab（如果存在）
- **向右滑** ≥ 閾值 → 切換到上一個 tab（如果存在）
- **首個 tab** → 無法向右滑
- **最後 tab** → 無法向左滑

### 嵌套優先級

- 設置 `nested={true}` 的 tabs 有更高的 `z-index`
- 內層 tabs 優先捕獲觸摸事件
- 外層 tabs 在內層不響應時才響應

## 🔍 實現原理

```typescript
// 1. 檢測觸摸開始
onTouchStart → 記錄起始座標 (x, y)

// 2. 檢測滑動方向
onTouchMove →
  計算 deltaX 和 deltaY →
  判斷主要方向（橫/縱）→
  橫向滑動時阻止預設行為

// 3. 檢測觸摸結束
onTouchEnd →
  計算滑動距離 →
  超過閾值 → 切換 tab →
  未超過閾值 → 不切換
```

## 注意事項

1. **必須包裹內容**

   ```tsx
   // 錯誤：內容在 Tabs 外面
   <Tabs enableSwipe={true} ... />
   <div>{content}</div>

   //  正確：內容在 Tabs 裡面
   <Tabs enableSwipe={true} ...>
     <div>{content}</div>
   </Tabs>
   ```

2. **嵌套時設置 nested**

   ```tsx
   // 錯誤：內層未設置 nested
   <Tabs enableSwipe={true}>
     <Tabs enableSwipe={true}> ... </Tabs>
   </Tabs>

   //  正確：內層設置 nested={true}
   <Tabs enableSwipe={true}>
     <Tabs enableSwipe={true} nested={true}> ... </Tabs>
   </Tabs>
   ```

3. **向後兼容**
   ```tsx
   // 不啟用滑動時，用法完全不變
   <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
   ```

## 📝 待更新頁面

以下頁面可考慮啟用滑動功能：

### 高優先級（常用手機瀏覽）

- [ ] `EventDetail.tsx` - 賽事詳情
- [ ] `CategoryDetail.tsx` - 分類詳情
- [ ] `Notifications.tsx` - 通知頁
- [ ] `ScorerHome.tsx` - 紀錄員首頁

### 中優先級

- [ ] `OrganizerHome.tsx` - 主辦方首頁
- [ ] `ScorerCategoryDetail.tsx` - 紀錄員分類詳情

### 嵌套 Tabs（需設置 nested）

- [ ] `CategoryScheduleManager.tsx`
- [ ] `CategoryPlayersManager.tsx`
- [ ] `CategoryStaffManager.tsx`

## 🧪 測試檢查清單

- [x] 向左滑動切換到下一個 tab
- [x] 向右滑動切換到上一個 tab
- [x] 首個 tab 無法向右滑
- [x] 最後 tab 無法向左滑
- [x] 縱向滑動不觸發切換
- [x] 點擊 tab 按鈕仍正常
- [x] 未啟用時完全向後兼容

建議在以下設備測試：

- [ ] iOS Safari
- [ ] Android Chrome
- [ ] iPad
- [ ] 桌面瀏覽器

## 技術亮點

1. **智能方向判斷** - 區分橫向/縱向滑動
2. **嵌套支持** - z-index 層級管理
3. **性能優化** - 使用 useCallback 避免重複創建函數
4. **靈活配置** - 可調整靈敏度和行為
5. **向後兼容** - 不影響現有代碼

## 📚 相關資源

- [詳細使用指南](./SWIPEABLE_TABS_USAGE.md)
- [實施狀態](./SWIPEABLE_TABS_IMPLEMENTED.md)
- [Tabs 組件源碼](./src/components/common/Tabs.tsx)
- [useSwipeableTabs Hook](./src/hooks/useSwipeableTabs.ts)

---

**實施完成時間**: 2024-12  
**版本**: 1.0.0  
**狀態**: 已完成並測試
