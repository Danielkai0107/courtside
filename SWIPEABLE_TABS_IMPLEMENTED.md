# 滑動切換 Tabs 實施狀態

## 已完成

### 核心組件

- `src/components/common/Tabs.tsx` - 已更新支持滑動功能
- `src/components/common/SwipeableTabs.tsx` - 新建獨立滑動組件
- `src/hooks/useSwipeableTabs.ts` - 新建滑動邏輯 Hook
- `src/components/common/Tabs.module.scss` - 已添加滑動樣式

### 已啟用滑動的頁面

- `src/pages/organizer/TournamentDashboard.tsx` - 賽事管理面板（示範實作）

## 📋 待更新頁面清單

以下頁面使用了 Tabs 組件，可以根據需要啟用滑動功能：

### 主要頁面

1. **Events.tsx** - 賽事列表頁

   - 用途：篩選不同狀態的賽事
   - 建議： 啟用滑動（用戶常在手機上瀏覽）

2. **EventDetail.tsx** - 賽事詳情頁

   - 用途：查看賽事資訊、報名狀況等
   - 建議： 啟用滑動

3. **CategoryDetail.tsx** - 分類詳情頁

   - 用途：查看對戰表、小組積分等
   - 建議： 啟用滑動（內容較多）

4. **MyGames.tsx** - 我的比賽頁

   - 用途：切換不同狀態的比賽
   - 建議： 啟用滑動

5. **Notifications.tsx** - 通知頁
   - 用途：切換不同類型的通知
   - 建議： 啟用滑動

### 主辦方頁面

6. **OrganizerHome.tsx** - 主辦方首頁
   - 用途：切換不同狀態的賽事
   - 建議： 啟用滑動

### 紀錄員頁面

7. **ScorerHome.tsx** - 紀錄員首頁

   - 用途：切換邀請和待記錄比賽
   - 建議： 啟用滑動

8. **ScorerCategoryDetail.tsx** - 紀錄員分類詳情
   - 用途：查看對戰表
   - 建議： 啟用滑動

### 組件（嵌套 Tabs）

9. **CategoryScheduleManager.tsx** - 分類賽程管理

   - 用途：管理小組賽和淘汰賽
   - 建議： 啟用滑動，設置 `nested={true}`

10. **CategoryPlayersManager.tsx** - 分類選手管理

    - 用途：管理不同分類的選手
    - 建議： 啟用滑動，設置 `nested={true}`

11. **CategoryStaffManager.tsx** - 分類紀錄員管理
    - 用途：管理不同分類的紀錄員
    - 建議： 啟用滑動，設置 `nested={true}`

## 🚀 快速更新指南

### 標準頁面（單層 Tabs）

**更新前：**

```tsx
<Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />;

{
  activeTab === "tab1" && <div>內容 1</div>;
}
{
  activeTab === "tab2" && <div>內容 2</div>;
}
```

**更新後：**

```tsx
<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onChange={setActiveTab}
  enableSwipe={true}
  swipeThreshold={60}
>
  {activeTab === "tab1" && <div>內容 1</div>}
  {activeTab === "tab2" && <div>內容 2</div>}
</Tabs>
```

### 嵌套 Tabs（內層優先）

**更新前：**

```tsx
{
  /* 外層 */
}
<Tabs tabs={outerTabs} activeTab={outerTab} onChange={setOuterTab} />;
{
  outerTab === "tab1" && (
    <div>
      {/* 內層 */}
      <Tabs tabs={innerTabs} activeTab={innerTab} onChange={setInnerTab} />
      {innerTab === "inner1" && <div>內容</div>}
    </div>
  );
}
```

**更新後：**

```tsx
{
  /* 外層 */
}
<Tabs
  tabs={outerTabs}
  activeTab={outerTab}
  onChange={setOuterTab}
  enableSwipe={true}
>
  {outerTab === "tab1" && (
    <div>
      {/* 內層 - 設置 nested={true} */}
      <Tabs
        tabs={innerTabs}
        activeTab={innerTab}
        onChange={setInnerTab}
        enableSwipe={true}
        nested={true}
      >
        {innerTab === "inner1" && <div>內容</div>}
      </Tabs>
    </div>
  )}
</Tabs>;
```

## ⚙️ 配置選項

### enableSwipe

- 類型：`boolean`
- 預設：`false`
- 說明：是否啟用滑動切換功能

### swipeThreshold

- 類型：`number`
- 預設：`50`
- 建議值：
  - 小螢幕（手機）：`40-50` - 更靈敏
  - 大螢幕（平板）：`60-80` - 避免誤觸
  - 內容較多：`70-100` - 確保是切換意圖

### nested

- 類型：`boolean`
- 預設：`false`
- 說明：是否為嵌套的內層 tabs
- 用途：確保多層 tabs 時，內層優先響應滑動

## 📱 測試清單

更新頁面後，請在以下設備測試：

- [ ] iPhone Safari（iOS）
- [ ] Android Chrome
- [ ] iPad Safari
- [ ] 桌面瀏覽器（確認點擊仍正常）

測試項目：

- [ ] 向左滑動切換到下一個 tab
- [ ] 向右滑動切換到上一個 tab
- [ ] 第一個 tab 無法向右滑動
- [ ] 最後一個 tab 無法向左滑動
- [ ] 上下滑動不會觸發 tab 切換
- [ ] 嵌套 tabs 時內層優先響應
- [ ] 點擊 tab 按鈕仍正常工作

## 🔍 故障排除

### 問題：滑動無反應

```tsx
// 確認已啟用滑動
<Tabs enableSwipe={true} ... >
  {/* 確認內容在 children 中 */}
  {activeTab === "tab1" && <div>...</div>}
</Tabs>
```

### 問題：嵌套 tabs 衝突

```tsx
// 外層 tabs
<Tabs enableSwipe={true} ...>
  {/* 內層 tabs - 加上 nested */}
  <Tabs enableSwipe={true} nested={true} ...>
    ...
  </Tabs>
</Tabs>
```

### 問題：滑動太靈敏/不夠靈敏

```tsx
// 調整 swipeThreshold 值
<Tabs
  enableSwipe={true}
  swipeThreshold={80}  // 增加數值降低靈敏度
  ...
>
```

## 📝 注意事項

1. **向後兼容**：預設不啟用滑動，現有頁面不受影響
2. **漸進式更新**：可以逐步更新各個頁面
3. **用戶體驗**：建議所有手機常用頁面都啟用滑動
4. **嵌套優先**：有嵌套時記得設置 `nested={true}`
5. **測試充分**：更新後務必在實際設備上測試

## 📚 相關文檔

- [SWIPEABLE_TABS_USAGE.md](./SWIPEABLE_TABS_USAGE.md) - 詳細使用指南
- `src/components/common/Tabs.tsx` - 組件源碼
- `src/hooks/useSwipeableTabs.ts` - Hook 源碼
