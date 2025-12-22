# Header 結構標準化指南

## 📋 標準 Header 結構

所有頁面的 header 應該遵循以下標準結構：

### 1️⃣ 標準結構（無返回按鈕）

```tsx
<div className={styles.header}>
  <h1 className={styles.headerTitle}>頁面標題</h1>
  {/* 可選：右側操作按鈕或選擇器 */}
  <Select ... />
</div>
```

**CSS 樣式：**
```scss
@import "../styles/variables";
@import "../styles/mixins";

.container {
  @include page-container;
}

.header {
  @include page-header;
}

.headerTitle {
  font-size: $font-size-xl;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}
```

### 2️⃣ 帶返回按鈕的結構

```tsx
<div className={styles.header}>
  <button 
    className={styles.backButton} 
    onClick={() => navigate(-1)}
    aria-label="返回"
  >
    <ArrowLeft size={24} />
  </button>
  <h1 className={styles.headerTitle}>頁面標題</h1>
  <div className={styles.headerSpacer} />
</div>
```

**CSS 樣式：**
```scss
@import "../styles/variables";
@import "../styles/mixins";

.container {
  @include page-container;
}

.header {
  @include page-header;
}

.headerTitle {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $text-primary;
  margin: 0;
  flex: 1;
  text-align: center;
}

.backButton {
  background: none;
  border: none;
  padding: $spacing-sm;
  cursor: pointer;
  color: $text-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }

  &:active {
    opacity: 0.5;
  }
}

.headerSpacer {
  width: 40px; // 平衡左側返回按鈕，保持標題居中
}
```

## 📁 頁面分類

### A. 主導航頁面（無返回按鈕）
這些是應用的主要入口頁面，使用底部導航欄進行切換：

- ✅ **Home** (`/`) - `<h1>` + 運動選擇器
- ✅ **Events** (`/events`) - `<h1>` + 運動選擇器  
- ✅ **MyGames** (`/my-games`) - `<h1>`
- ✅ **Profile** (`/profile`) - `<h1>`
- ✅ **Notifications** (`/notifications`) - `<h1>` + 標記已讀按鈕
- ✅ **OrganizerHome** (`/organizer`) - `<h1>`
- ✅ **ScorerHome** (`/scorer`) - `<h1>`

**標準結構：**
```tsx
<div className={styles.header}>
  <h1 className={styles.headerTitle}>頁面標題</h1>
  {/* 可選的右側操作 */}
</div>
```

### B. 詳情頁面（有返回按鈕）
這些頁面是從主頁面導航進入的，需要返回按鈕：

- ✅ **EventDetail** (`/events/:id`) - 返回 + 居中標題
- ✅ **CategoryDetail** (`/events/:id/category/:categoryId`) - 返回 + 居中標題
- ✅ **MatchDetail** (`/match/:id`) - 返回 + 標題
- ✅ **TournamentDashboard** (`/organizer/tournament/:id`) - 返回 + 標題
- ✅ **TournamentMatches** (`/scorer/tournament/:id`) - 返回 + 標題
- ✅ **ScoringConsole** (`/scorer/match/:id`) - 返回 + 標題 + LIVE 標籤
- ✅ **CreateTournament** (`/organizer/create`) - 返回 + 標題

**標準結構：**
```tsx
<div className={styles.header}>
  <button className={styles.backButton} onClick={() => navigate(-1)}>
    <ArrowLeft size={24} />
  </button>
  <h1 className={styles.headerTitle}>頁面標題</h1>
  <div className={styles.headerSpacer} />
</div>
```

## 🎨 CSS 類名標準

### 必須使用的類名：
- `.header` - 使用 `@include page-header` mixin
- `.headerTitle` - 標題文字（統一使用，不要用 `.title`）
- `.backButton` - 返回按鈕（如果有）
- `.headerSpacer` - 右側空格（有返回按鈕時必須）

### ❌ 避免使用：
- ~~`.title`~~ - 改用 `.headerTitle`
- 自定義的 header 樣式 - 改用 `@include page-header`

## 📐 尺寸標準

| 元素 | 主頁面 | 詳情頁面 |
|------|--------|----------|
| Header 高度 | 62px | 62px |
| 標題字體大小 | `$font-size-xl` (24px) | `$font-size-lg` (18px) |
| 標題字重 | 700 (Bold) | 600 (Semi-bold) |
| 返回按鈕尺寸 | N/A | 24px icon |
| 右側空格寬度 | N/A | 40px |

## 🔧 統一 Header Mixin

在 `src/styles/_mixins.scss` 中：

```scss
// 統一的 Header 樣式
@mixin page-header {
  width: 100%;
  position: fixed;
  background: $bg-color;
  top: 0;
  z-index: 100;
  height: 62px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

// 頁面容器（避開 header）
@mixin page-container {
  padding-top: 62px;
  height: 100dvh;
}
```

## ✅ 檢查清單

在創建或修改頁面時，請確保：

- [ ] 使用 `@include page-header` 和 `@include page-container`
- [ ] 標題統一使用 `.headerTitle` 類名
- [ ] 主頁面使用 `<h1>` 標籤，字體大小 `$font-size-xl`
- [ ] 詳情頁面使用 `<h1>` 標籤，字體大小 `$font-size-lg`
- [ ] 有返回按鈕時，必須添加 `.headerSpacer` 保持標題居中
- [ ] 返回按鈕統一使用 `<ArrowLeft size={24} />` 圖標
- [ ] 添加 `aria-label` 提升無障礙性

## 🔄 遷移指南

### 步驟 1：更新 SCSS
```scss
// 舊代碼
.myPage {
  padding-top: 62px;
  height: 100dvh;
}

.header {
  width: 100%;
  position: fixed;
  background: $bg-color;
  // ... 其他樣式
}

.title {
  font-size: $font-size-xl;
  // ...
}

// 新代碼
@import "../styles/variables";
@import "../styles/mixins";

.myPage {
  @include page-container;
}

.header {
  @include page-header;
}

.headerTitle {
  font-size: $font-size-xl;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}
```

### 步驟 2：更新 TSX
```tsx
// 舊代碼
<div className={styles.header}>
  <h2 className={styles.title}>頁面標題</h2>
</div>

// 新代碼
<div className={styles.header}>
  <h1 className={styles.headerTitle}>頁面標題</h1>
</div>
```

## 📊 當前狀態

### ✅ 已完全統一（CSS + TSX）
以下頁面的 CSS 和 TSX 結構已完全統一：

#### 主導航頁面（無返回按鈕）
- ✅ **Home** - 使用 `<h1>` + `.headerTitle` + 運動選擇器
- ✅ **Events** - 使用 `<h1>` + `.headerTitle` + 運動選擇器
- ✅ **MyGames** - 使用 `<h1>` + `.headerTitle`
- ✅ **Profile** - 使用 `<h1>` + `.headerTitle`
- ✅ **Notifications** - 使用 `<h1>` + `.headerTitle`
- ✅ **OrganizerHome** - 使用 `<h1>` + `.headerTitle` + 創建按鈕
- ✅ **ScorerHome** - 使用 `<h1>` + `.headerTitle`

#### 詳情頁面（有返回按鈕）
- ✅ **EventDetail** - 返回按鈕 + `<h1>` + `.headerTitle` (居中) + 空格
- ✅ **CategoryDetail** - 返回按鈕 + `<h1>` + `.headerTitle` (居中) + 空格
- ✅ **TournamentDashboard** - 返回按鈕 + `.headerTitle`
- ✅ **TournamentMatches** - 返回按鈕 + `<h1>` + `.headerTitle`

### 🎨 統一的樣式 Mixin
所有頁面現在都使用以下統一的 mixin：

```scss
@mixin page-header { }          // 統一 header 容器樣式
@mixin page-container { }        // 統一頁面容器樣式  
@mixin header-back-button { }   // 統一返回按鈕樣式
```

### ✅ 統一的類名
- ✅ `.header` - 使用 `@include page-header`
- ✅ `.headerTitle` - 所有標題統一使用（不再使用 `.title`）
- ✅ `.backButton` - 使用 `@include header-back-button`
- ✅ `.headerSpacer` - 有返回按鈕時保持標題居中

### 📈 統一成果
- **CSS 文件更新**: 11 個頁面
- **TSX 文件更新**: 8 個頁面  
- **新增 Mixin**: 3 個
- **代碼減少**: 約 150 行重複的 CSS 代碼
- **編譯狀態**: ✅ 成功

## 日期
2024-12-22

