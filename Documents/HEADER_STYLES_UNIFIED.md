# Header 樣式統一化完成

## 概述

已成功將所有頁面的 header 樣式統一到通用的 SASS mixin 中，現在只需要在一個地方修改就能影響所有頁面。

## 新增的 Mixins

在 `src/styles/_mixins.scss` 中新增了兩個 mixin：

### 1. `@mixin page-header`

統一的頁面 header 樣式：

```scss
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
```

### 2. `@mixin page-container`

統一的頁面容器樣式（避開 header）：

```scss
@mixin page-container {
  padding-top: 62px;
  height: 100dvh;
}
```

## 已更新的文件

### 頁面文件 (Pages)

1.  `src/pages/EventDetail.module.scss`
2.  `src/pages/Profile.module.scss`
3.  `src/pages/Events.module.scss`
4.  `src/pages/Home.module.scss`
5.  `src/pages/MyGames.module.scss`
6.  `src/pages/CategoryDetail.module.scss`
7.  `src/pages/Notifications.module.scss`
8.  `src/pages/scorer/ScorerHome.module.scss`
9.  `src/pages/scorer/TournamentMatches.module.scss`
10. `src/pages/organizer/OrganizerHome.module.scss`
11. `src/pages/organizer/TournamentDashboard.module.scss`

### 特殊樣式的頁面（未修改）

以下頁面有特殊的 header 樣式，保持原樣：

- `src/pages/MatchDetail.module.scss` - 使用半透明背景和模糊效果
- `src/pages/scorer/ScoringConsole.module.scss` - 使用半透明背景和模糊效果
- `src/pages/organizer/CreateTournament.module.scss` - 使用半透明背景和模糊效果
- `src/pages/admin/InitSports.module.scss` - 使用半透明背景和模糊效果

### 組件文件（未修改）

以下組件的 header 樣式是局部使用，不適合統一：

- `src/components/common/Modal.module.scss` - Modal 內部的 header
- `src/components/features/CategoryManager.module.scss` - 組件內部的 header
- `src/components/features/CourtManager.module.scss` - 組件內部的 header
- `src/components/features/TournamentMatchesCard.module.scss` - Card 內部的 header
- `src/components/features/MatchCard.module.scss` - Card 內部的 header

## 使用方式

### 標準用法

```scss
@import "../styles/variables";
@import "../styles/mixins";

.myPage {
  @include page-container;
}

.header {
  @include page-header;
}
```

### 帶額外樣式的用法

```scss
.header {
  @include page-header;
  // 可以添加額外的樣式覆蓋
  padding: 0 24px 0 60px;

  .backButton {
    position: absolute;
    left: 12px;
  }
}
```

## 優點

1. **統一性**：所有頁面的 header 高度、背景色、z-index 等都保持一致
2. **易維護**：只需在 `_mixins.scss` 中修改一次，所有頁面都會更新
3. **減少重複代碼**：從 11 個文件中移除了重複的樣式定義
4. **靈活性**：仍然可以在個別頁面中添加特殊樣式

## 如何修改 Header 樣式

如果需要修改所有頁面的 header 樣式，只需編輯：

```
src/styles/_mixins.scss
```

例如，要修改 header 高度：

```scss
@mixin page-header {
  // ... 其他樣式 ...
  height: 70px; // 從 62px 改為 70px
  // ... 其他樣式 ...
}

@mixin page-container {
  padding-top: 70px; // 也要相應調整
  height: 100dvh;
}
```

## 測試結果

編譯成功
無 linter 錯誤
所有頁面樣式保持一致

## 日期

2024-12-22
