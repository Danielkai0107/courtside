# 📂 SCSS 檔案結構完整說明

## 🎨 設計系統核心檔案

所有設計 tokens 集中管理在 `src/styles/` 目錄：

```
src/styles/
├── _variables.scss    ⭐ 所有顏色、間距、字體變數
├── _mixins.scss       ⭐ 可重用的 SCSS mixins
├── _reset.scss        ⭐ CSS Reset 與基礎樣式
└── main.scss          ⭐ 主入口（全域樣式）
```

### 變數命名規範

```scss
// 顏色
$primary-color          // 主色調
$text-primary           // 主要文字
$bg-color              // 背景色
$card-bg               // 卡片背景

// 間距
$spacing-xs            // 4px
$spacing-sm            // 8px
$spacing-md            // 16px
$spacing-lg            // 24px
$spacing-xl            // 32px

// 圓角
$radius-sm             // 8px
$radius-lg             // 12px

// 其他...
```

## 📱 頁面 SCSS 檔案

每個頁面都有對應的 `.module.scss` 檔案：

### 主要頁面

```
src/pages/
├── Home.tsx → Home.module.scss
├── Events.tsx → Events.module.scss
├── EventDetail.tsx → EventDetail.module.scss
├── MyGames.tsx → MyGames.module.scss
├── MatchDetail.tsx → MatchDetail.module.scss
├── Profile.tsx → Profile.module.scss
└── Login.tsx → Login.module.scss
```

### 主辦方頁面

```
src/pages/organizer/
├── OrganizerHome.tsx → OrganizerHome.module.scss
├── CreateTournament.tsx → CreateTournament.module.scss
└── TournamentDashboard.tsx → TournamentDashboard.module.scss
```

### 紀錄員頁面

```
src/pages/scorer/
├── ScorerHome.tsx → ScorerHome.module.scss
└── ScoringConsole.tsx → ScoringConsole.module.scss
```

## 🧩 組件 SCSS 檔案

### 通用組件

```
src/components/common/
├── Button.tsx → Button.module.scss
├── Card.tsx → Card.module.scss
├── SelectableCard.tsx → SelectableCard.module.scss
├── Input.tsx → Input.module.scss
├── Select.tsx → Select.module.scss
├── Stepper.tsx → Stepper.module.scss
├── Tabs.tsx → Tabs.module.scss
├── Modal.tsx → Modal.module.scss
├── Loading.tsx → Loading.module.scss
└── IndexBuildingNotice.tsx → IndexBuildingNotice.module.scss
```

### 功能組件

```
src/components/features/
├── TournamentCard.tsx → TournamentCard.module.scss
├── MatchCard.tsx → MatchCard.module.scss
├── LiveScoreboard.tsx → LiveScoreboard.module.scss
├── RegistrationForm.tsx → RegistrationForm.module.scss
├── PlayerList.tsx → PlayerList.module.scss
└── BracketView.tsx → BracketView.module.scss
```

### 佈局組件

```
src/components/layout/
├── AppLayout.tsx → AppLayout.module.scss
└── BottomNav.tsx → BottomNav.module.scss
```

### 守衛組件（無需樣式）

```
src/components/guards/
├── AuthGuard.tsx     （邏輯組件，無 SCSS）
└── RoleGuard.tsx     （邏輯組件，無 SCSS）
```

## 🎯 SCSS 模組使用方式

### 1. 在組件中引入

```tsx
// MyComponent.tsx
import React from "react";
import styles from "./MyComponent.module.scss";

const MyComponent: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>標題</h1>
    </div>
  );
};
```

### 2. 在 SCSS 中引入變數和 mixins

```scss
// MyComponent.module.scss
@import "../../styles/variables";
@import "../../styles/mixins";

.container {
  padding: $spacing-md;
  background: $card-bg;
  @include flex-center;
}

.title {
  color: $primary-color;
  font-size: $font-size-xl;
}
```

## ✏️ 如何客製化特定頁面

### 範例：修改首頁樣式

1. **開啟** `src/pages/Home.module.scss`

2. **修改變數**：

```scss
.home {
  padding: $spacing-xl $spacing-md; // 改為更大的間距
  background: linear-gradient(180deg, #fff 0%, #f5f5f5 100%); // 添加漸層
}

.title {
  font-size: 32px; // 改為更大的標題
  color: $primary-color;
}
```

3. **儲存檔案** - Vite 會自動熱更新！

### 範例：修改按鈕樣式

1. **開啟** `src/components/common/Button.module.scss`

2. **修改樣式**：

```scss
.button {
  padding: 16px 32px; // 改為更大的按鈕
  border-radius: $radius-lg; // 更圓的邊角

  &.primary {
    background: $primary-color; // 改為純色（非漸層）
    box-shadow: 0 8px 16px rgba(255, 107, 0, 0.3); // 更大陰影
  }
}
```

## 🔍 快速定位檔案

### 按功能查找

| 想修改...    | 編輯檔案                                             |
| ------------ | ---------------------------------------------------- |
| 主色調       | `src/styles/_variables.scss`                         |
| 全域間距     | `src/styles/_variables.scss`                         |
| 首頁外觀     | `src/pages/Home.module.scss`                         |
| 賽事卡片     | `src/components/features/TournamentCard.module.scss` |
| 按鈕樣式     | `src/components/common/Button.module.scss`           |
| 底部導覽     | `src/components/layout/BottomNav.module.scss`        |
| 建立賽事表單 | `src/pages/organizer/CreateTournament.module.scss`   |
| 計分板       | `src/pages/scorer/ScoringConsole.module.scss`        |

## 📐 SCSS 模組優點

### ✅ 隔離性

- 每個模組的 class 名稱自動加上 hash，避免衝突
- 例如：`.button` → `.Button_button__abc123`

### ✅ 可維護性

- 樣式與組件在同一目錄
- 容易找到對應的樣式檔案

### ✅ 可客製化

- 修改單一檔案只影響對應組件
- 不會意外影響其他頁面

### ✅ 設計一致性

- 所有模組都引入 `_variables.scss`
- 使用統一的設計 tokens

## 🎨 客製化工作流程

### 1. 修改全域設計（影響所有組件）

編輯 `src/styles/_variables.scss`：

```scss
$primary-color: #你的新顏色;
$spacing-md: 20px; // 改變間距
```

→ 所有使用這些變數的組件都會更新

### 2. 修改特定頁面

編輯對應的 `.module.scss` 檔案：

```scss
// src/pages/Home.module.scss
.home {
  // 只影響首頁
  background: linear-gradient(...);
}
```

### 3. 修改特定組件

編輯組件的 `.module.scss` 檔案：

```scss
// src/components/common/Button.module.scss
.button {
  // 只影響按鈕組件
  padding: 20px 40px;
}
```

## 🔥 實時預覽

所有 SCSS 修改都會透過 Vite 的 HMR（熱模組替換）立即反映在瀏覽器中，**無需重新整理頁面**！

## 📝 命名慣例

### Class 命名

- 使用 camelCase：`.myButton`, `.userProfile`
- 描述性命名：`.submitButton`, `.errorMessage`
- 狀態修飾符：`.active`, `.disabled`, `.selected`

### 檔案命名

- 組件檔名：`ComponentName.tsx`
- 樣式檔名：`ComponentName.module.scss`
- 必須使用 `.module.scss` 後綴啟用 CSS Modules

## 🎯 完整範例

### 建立新頁面帶獨立樣式

1. **建立頁面組件**：`src/pages/NewPage.tsx`

```tsx
import React from "react";
import styles from "./NewPage.module.scss";

const NewPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>新頁面</h1>
    </div>
  );
};

export default NewPage;
```

2. **建立對應樣式**：`src/pages/NewPage.module.scss`

```scss
@import "../styles/variables";
@import "../styles/mixins";

.page {
  padding: $spacing-lg;
  background: $bg-color;
  min-height: 100dvh;
}

.title {
  color: $primary-color;
  font-size: $font-size-xl;
  font-weight: 700;
}
```

3. **完成！** 樣式自動隔離，不會影響其他頁面

## 📊 目前統計

- ✅ **總頁面數**：13 個（13 個獨立 SCSS 檔案）
- ✅ **總組件數**：18 個（16 個獨立 SCSS 檔案）
- ✅ **守衛組件**：2 個（邏輯組件，無需樣式）
- ✅ **設計系統核心**：4 個檔案

**所有需要樣式的組件和頁面都已經有獨立的 SCSS 模組！** ✨

---

**提示**：修改任何 `.module.scss` 檔案都會立即生效，盡情客製化！🎨
