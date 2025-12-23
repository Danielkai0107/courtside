# 滑動切換 Tabs 使用指南

## 功能說明

已為所有 Tabs 組件添加左右滑動切換功能：

- 向左滑動：切換到下一個 tab
- 向右滑動：切換到上一個 tab
- 自動判斷滑動方向（橫向/縱向）
- 嵌套 tabs 支持（內層優先響應）
- 向後兼容（預設不啟用滑動）

## 基本使用

### 方法 1：直接使用 Tabs 組件（推薦）

```tsx
import Tabs from "../../components/common/Tabs";

function MyComponent() {
  const [activeTab, setActiveTab] = useState("tab1");

  const tabs = [
    { id: "tab1", label: "選項 1" },
    { id: "tab2", label: "選項 2" },
    { id: "tab3", label: "選項 3" },
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onChange={setActiveTab}
      enableSwipe={true} // 啟用滑動切換
      swipeThreshold={50} // 滑動距離閾值（可選，預設 50px）
    >
      {/* Tab 內容區域 */}
      <div>
        {activeTab === "tab1" && <div>內容 1</div>}
        {activeTab === "tab2" && <div>內容 2</div>}
        {activeTab === "tab3" && <div>內容 3</div>}
      </div>
    </Tabs>
  );
}
```

### 方法 2：使用獨立的 SwipeableTabs 組件

```tsx
import SwipeableTabs from "../../components/common/SwipeableTabs";

function MyComponent() {
  const [activeTab, setActiveTab] = useState("tab1");

  const tabs = [
    { id: "tab1", label: "選項 1" },
    { id: "tab2", label: "選項 2" },
    { id: "tab3", label: "選項 3" },
  ];

  return (
    <SwipeableTabs
      tabs={tabs}
      activeTab={activeTab}
      onChange={setActiveTab}
      swipeThreshold={50}
    >
      <div>
        {activeTab === "tab1" && <div>內容 1</div>}
        {activeTab === "tab2" && <div>內容 2</div>}
        {activeTab === "tab3" && <div>內容 3</div>}
      </div>
    </SwipeableTabs>
  );
}
```

### 方法 3：使用 Hook（進階）

```tsx
import { useSwipeableTabs } from "../../hooks/useSwipeableTabs";
import Tabs from "../../components/common/Tabs";

function MyComponent() {
  const [activeTab, setActiveTab] = useState("tab1");

  const tabs = [
    { id: "tab1", label: "選項 1" },
    { id: "tab2", label: "選項 2" },
    { id: "tab3", label: "選項 3" },
  ];

  const { swipeHandlers, swipeState } = useSwipeableTabs({
    tabs,
    activeTab,
    onChange: setActiveTab,
    swipeThreshold: 50,
  });

  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div
        {...swipeHandlers}
        style={{
          touchAction:
            swipeState.swipeDirection === "horizontal" ? "none" : "auto",
        }}
      >
        {activeTab === "tab1" && <div>內容 1</div>}
        {activeTab === "tab2" && <div>內容 2</div>}
        {activeTab === "tab3" && <div>內容 3</div>}
      </div>
    </div>
  );
}
```

## 嵌套 Tabs 使用（重要）

當頁面有多層 tabs 時，設置 `nested={true}` 讓內層優先響應滑動：

```tsx
function TournamentDashboard() {
  // 外層 tabs（主要 tabs）
  const [outerTab, setOuterTab] = useState("players");

  // 內層 tabs（分類 tabs）
  const [innerTab, setInnerTab] = useState("category1");

  const outerTabs = [
    { id: "info", label: "賽事資訊" },
    { id: "players", label: "選手管理" },
    { id: "schedule", label: "賽程管理" },
  ];

  const innerTabs = [
    { id: "category1", label: "男子單打" },
    { id: "category2", label: "女子單打" },
    { id: "category3", label: "男子雙打" },
  ];

  return (
    <div>
      {/* 外層 tabs - 不設置 nested */}
      <Tabs
        tabs={outerTabs}
        activeTab={outerTab}
        onChange={setOuterTab}
        enableSwipe={true}
      >
        <div>
          {outerTab === "players" && (
            <div>
              {/* 內層 tabs - 設置 nested={true} */}
              <Tabs
                tabs={innerTabs}
                activeTab={innerTab}
                onChange={setInnerTab}
                enableSwipe={true}
                nested={true} // 👈 重要！內層優先響應
              >
                <div>
                  {innerTab === "category1" && <div>男子單打內容</div>}
                  {innerTab === "category2" && <div>女子單打內容</div>}
                  {innerTab === "category3" && <div>男子雙打內容</div>}
                </div>
              </Tabs>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
```

## 在 TournamentDashboard 中應用

```tsx
// src/pages/organizer/TournamentDashboard.tsx

const TournamentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("info");

  const tabs = [
    { id: "info", label: "賽事資訊" },
    { id: "players", label: "選手管理" },
    { id: "scorers", label: "紀錄員管理" },
    { id: "courts", label: "場地管理" },
    { id: "schedule", label: "賽程管理" },
  ];

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>{/* ... header content ... */}</div>

      <div className={styles.content}>
        {/* 啟用滑動切換 */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          enableSwipe={true} // 👈 加入這一行
          swipeThreshold={60} // 可選：調整滑動靈敏度
        >
          <div className={styles.tabContent}>
            {activeTab === "info" && <div>賽事資訊內容</div>}
            {activeTab === "players" && <div>選手管理內容</div>}
            {activeTab === "scorers" && <div>紀錄員管理內容</div>}
            {activeTab === "courts" && <div>場地管理內容</div>}
            {activeTab === "schedule" && <div>賽程管理內容</div>}
          </div>
        </Tabs>
      </div>
    </div>
  );
};
```

## 參數說明

| 參數             | 類型    | 預設值  | 說明                                            |
| ---------------- | ------- | ------- | ----------------------------------------------- |
| `enableSwipe`    | boolean | `false` | 是否啟用滑動切換                                |
| `swipeThreshold` | number  | `50`    | 滑動距離閾值（px），超過此距離才會觸發切換      |
| `nested`         | boolean | `false` | 是否為嵌套的內層 tabs，設為 true 時優先響應滑動 |

## 注意事項

1. **向後兼容**：預設不啟用滑動，需要明確設置 `enableSwipe={true}`
2. **內容包裹**：啟用滑動時，必須將 tab 內容放在 `<Tabs>` 的子元素中
3. **嵌套優先**：有嵌套 tabs 時，內層設置 `nested={true}` 確保優先響應
4. **滑動方向**：自動判斷橫向/縱向滑動，只有橫向滑動才會切換 tab
5. **觸控設備**：滑動功能主要針對觸控設備，桌面端仍可使用點擊切換

## 故障排除

### 問題：滑動無反應

- 確認已設置 `enableSwipe={true}`
- 確認 tab 內容已包裹在 `<Tabs>` 子元素中
- 檢查是否有其他元素阻擋了觸控事件

### 問題：嵌套 tabs 滑動衝突

- 確認內層 tabs 設置了 `nested={true}`
- 確認內外層 tabs 都正確包裹了內容區域

### 問題：頁面整體也會跟著滑動

- 確認 `touchAction` 樣式正確應用
- 檢查是否有父元素覆蓋了 touch-action 屬性

## 樣式自訂

如需自訂滑動動畫或視覺效果，可以在 `Tabs.module.scss` 中修改：

```scss
.swipeableContent {
  // 滑動中的視覺反饋
  &.swiping {
    user-select: none;
    cursor: grabbing;
    // 可以添加過渡動畫
    // transition: transform 0.3s ease;
  }
}
```
