# 🌳 SportFlow 專案完整結構

## 📂 完整檔案樹狀圖

```
sportflow/
│
├── 📋 配置檔案
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── firebase.json              ⭐ Firebase 配置
│   ├── .firebaserc               ⭐ Firebase 專案 ID
│   ├── firestore.rules           ⭐ Firestore 安全規則
│   ├── firestore.indexes.json    ⭐ Firestore 索引
│   ├── storage.rules             ⭐ Storage 安全規則
│   ├── .env.example              ⭐ 環境變數範本
│   └── .gitignore
│
├── 📚 文檔
│   ├── README.md                 ⭐ 專案說明
│   ├── QUICKSTART.md             ⭐ 快速啟動指南
│   ├── SCSS_DESIGN_SYSTEM.md     ⭐ SCSS 設計系統文檔
│   ├── SCSS_STRUCTURE.md         ⭐ SCSS 結構說明（本檔案）
│   ├── PROJECT_STRUCTURE.md      ⭐ 專案結構（本檔案）
│   └── DEPLOYMENT_STATUS.md      ⭐ 部署狀態
│
├── 🔥 Firebase Functions
│   └── functions/
│       ├── package.json
│       ├── tsconfig.json
│       ├── .gitignore
│       └── src/
│           ├── index.ts                    ⭐ Functions 入口
│           └── notifications/
│               └── emailService.ts         ⭐ Email 通知服務
│
└── 💻 前端應用
    └── src/
        │
        ├── 🎨 全域樣式系統
        │   └── styles/
        │       ├── _variables.scss         ⭐ 設計 tokens（顏色、間距等）
        │       ├── _mixins.scss            ⭐ SCSS mixins
        │       ├── _reset.scss             ⭐ CSS Reset
        │       └── main.scss               ⭐ 主入口
        │
        ├── 🧩 組件
        │   ├── common/                     通用 UI 組件
        │   │   ├── Button.tsx
        │   │   ├── Button.module.scss      ⭐
        │   │   ├── Card.tsx
        │   │   ├── Card.module.scss        ⭐
        │   │   ├── SelectableCard.tsx
        │   │   ├── SelectableCard.module.scss  ⭐
        │   │   ├── Input.tsx
        │   │   ├── Input.module.scss       ⭐
        │   │   ├── Select.tsx
        │   │   ├── Select.module.scss      ⭐
        │   │   ├── Stepper.tsx
        │   │   ├── Stepper.module.scss     ⭐
        │   │   ├── Tabs.tsx
        │   │   ├── Tabs.module.scss        ⭐
        │   │   ├── Modal.tsx
        │   │   ├── Modal.module.scss       ⭐
        │   │   ├── Loading.tsx
        │   │   ├── Loading.module.scss     ⭐
        │   │   ├── IndexBuildingNotice.tsx
        │   │   └── IndexBuildingNotice.module.scss  ⭐
        │   │
        │   ├── features/                   功能組件
        │   │   ├── TournamentCard.tsx
        │   │   ├── TournamentCard.module.scss      ⭐
        │   │   ├── MatchCard.tsx
        │   │   ├── MatchCard.module.scss           ⭐
        │   │   ├── LiveScoreboard.tsx
        │   │   ├── LiveScoreboard.module.scss      ⭐
        │   │   ├── RegistrationForm.tsx
        │   │   ├── RegistrationForm.module.scss    ⭐
        │   │   ├── PlayerList.tsx
        │   │   ├── PlayerList.module.scss          ⭐
        │   │   ├── BracketView.tsx
        │   │   └── BracketView.module.scss         ⭐
        │   │
        │   ├── guards/                     路由守衛（純邏輯）
        │   │   ├── AuthGuard.tsx
        │   │   └── RoleGuard.tsx
        │   │
        │   └── layout/                     佈局組件
        │       ├── AppLayout.tsx
        │       ├── AppLayout.module.scss   ⭐
        │       ├── BottomNav.tsx
        │       └── BottomNav.module.scss   ⭐
        │
        ├── 📄 頁面
        │   ├── 一般用戶頁面
        │   │   ├── Home.tsx
        │   │   ├── Home.module.scss        ⭐
        │   │   ├── Events.tsx
        │   │   ├── Events.module.scss      ⭐
        │   │   ├── EventDetail.tsx
        │   │   ├── EventDetail.module.scss ⭐
        │   │   ├── MyGames.tsx
        │   │   ├── MyGames.module.scss     ⭐
        │   │   ├── MatchDetail.tsx
        │   │   ├── MatchDetail.module.scss ⭐
        │   │   ├── Profile.tsx
        │   │   ├── Profile.module.scss     ⭐
        │   │   ├── Login.tsx
        │   │   └── Login.module.scss       ⭐
        │   │
        │   ├── organizer/                  主辦方頁面
        │   │   ├── OrganizerHome.tsx
        │   │   ├── OrganizerHome.module.scss      ⭐
        │   │   ├── CreateTournament.tsx
        │   │   ├── CreateTournament.module.scss   ⭐
        │   │   ├── TournamentDashboard.tsx
        │   │   └── TournamentDashboard.module.scss ⭐
        │   │
        │   └── scorer/                     紀錄員頁面
        │       ├── ScorerHome.tsx
        │       ├── ScorerHome.module.scss  ⭐
        │       ├── ScoringConsole.tsx
        │       └── ScoringConsole.module.scss  ⭐
        │
        ├── 🔧 服務層
        │   └── services/
        │       ├── firebase.ts             ⭐ Firebase 初始化
        │       ├── userService.ts          ⭐ 用戶服務
        │       ├── tournamentService.ts    ⭐ 賽事服務
        │       ├── matchService.ts         ⭐ 比賽服務
        │       ├── registrationService.ts  ⭐ 報名服務
        │       ├── staffService.ts         ⭐ 工作人員服務
        │       ├── drawService.ts          ⭐ 抽籤服務
        │       └── storageService.ts       ⭐ 圖片上傳服務
        │
        ├── 🎭 Contexts
        │   └── contexts/
        │       └── AuthContext.tsx         ⭐ 認證 Context
        │
        ├── 📝 類型定義
        │   └── types/
        │       └── index.ts                ⭐ TypeScript 類型
        │
        ├── App.tsx                         ⭐ 主應用程式
        └── main.tsx                        ⭐ 入口點
```

## 🎯 SCSS 模組對應關係

### 完整對應表

| 組件/頁面           | TypeScript                                | SCSS 模組                                         |
| ------------------- | ----------------------------------------- | ------------------------------------------------- |
| **通用組件**        |                                           |                                                   |
| Button              | `common/Button.tsx`                       | `common/Button.module.scss`                       |
| Card                | `common/Card.tsx`                         | `common/Card.module.scss`                         |
| SelectableCard      | `common/SelectableCard.tsx`               | `common/SelectableCard.module.scss`               |
| Input               | `common/Input.tsx`                        | `common/Input.module.scss`                        |
| Select              | `common/Select.tsx`                       | `common/Select.module.scss`                       |
| Stepper             | `common/Stepper.tsx`                      | `common/Stepper.module.scss`                      |
| Tabs                | `common/Tabs.tsx`                         | `common/Tabs.module.scss`                         |
| Modal               | `common/Modal.tsx`                        | `common/Modal.module.scss`                        |
| Loading             | `common/Loading.tsx`                      | `common/Loading.module.scss`                      |
| IndexBuildingNotice | `common/IndexBuildingNotice.tsx`          | `common/IndexBuildingNotice.module.scss`          |
| **功能組件**        |                                           |                                                   |
| TournamentCard      | `features/TournamentCard.tsx`             | `features/TournamentCard.module.scss`             |
| MatchCard           | `features/MatchCard.tsx`                  | `features/MatchCard.module.scss`                  |
| LiveScoreboard      | `features/LiveScoreboard.tsx`             | `features/LiveScoreboard.module.scss`             |
| RegistrationForm    | `features/RegistrationForm.tsx`           | `features/RegistrationForm.module.scss`           |
| PlayerList          | `features/PlayerList.tsx`                 | `features/PlayerList.module.scss`                 |
| BracketView         | `features/BracketView.tsx`                | `features/BracketView.module.scss`                |
| **佈局組件**        |                                           |                                                   |
| AppLayout           | `layout/AppLayout.tsx`                    | `layout/AppLayout.module.scss`                    |
| BottomNav           | `layout/BottomNav.tsx`                    | `layout/BottomNav.module.scss`                    |
| **用戶頁面**        |                                           |                                                   |
| Home                | `pages/Home.tsx`                          | `pages/Home.module.scss`                          |
| Events              | `pages/Events.tsx`                        | `pages/Events.module.scss`                        |
| EventDetail         | `pages/EventDetail.tsx`                   | `pages/EventDetail.module.scss`                   |
| MyGames             | `pages/MyGames.tsx`                       | `pages/MyGames.module.scss`                       |
| MatchDetail         | `pages/MatchDetail.tsx`                   | `pages/MatchDetail.module.scss`                   |
| Profile             | `pages/Profile.tsx`                       | `pages/Profile.module.scss`                       |
| Login               | `pages/Login.tsx`                         | `pages/Login.module.scss`                         |
| **主辦方頁面**      |                                           |                                                   |
| OrganizerHome       | `pages/organizer/OrganizerHome.tsx`       | `pages/organizer/OrganizerHome.module.scss`       |
| CreateTournament    | `pages/organizer/CreateTournament.tsx`    | `pages/organizer/CreateTournament.module.scss`    |
| TournamentDashboard | `pages/organizer/TournamentDashboard.tsx` | `pages/organizer/TournamentDashboard.module.scss` |
| **紀錄員頁面**      |                                           |                                                   |
| ScorerHome          | `pages/scorer/ScorerHome.tsx`             | `pages/scorer/ScorerHome.module.scss`             |
| ScoringConsole      | `pages/scorer/ScoringConsole.tsx`         | `pages/scorer/ScoringConsole.module.scss`         |

**總計**：29 個 SCSS 模組檔案 + 4 個全域樣式檔案 = **33 個 SCSS 檔案**

## 🎨 客製化優先級

### Level 1：全域設計變更

**檔案**：`src/styles/_variables.scss`  
**影響範圍**：整個應用程式  
**範例**：改變主題顏色、間距、字體

### Level 2：組件樣式變更

**檔案**：`src/components/*/*.module.scss`  
**影響範圍**：該組件在所有頁面的顯示  
**範例**：改變按鈕大小、卡片陰影

### Level 3：頁面樣式變更

**檔案**：`src/pages/*/*.module.scss`  
**影響範圍**：僅該頁面  
**範例**：首頁特殊佈局、賽事列表間距

## 🚀 快速客製化範例

### 🎨 範例 1：改為藍色主題

編輯 `src/styles/_variables.scss`：

```scss
// 將這幾行：
$primary-color: #ff6b00;
$primary-light: #ff8c00;
$primary-dark: #e65c00;
$primary-gradient: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%);

// 改為：
$primary-color: #2979ff;
$primary-light: #448aff;
$primary-dark: #1976d2;
$primary-gradient: linear-gradient(135deg, #2979ff 0%, #448aff 100%);
```

**結果**：整個應用變成藍色主題！🔵

### 📏 範例 2：增大所有按鈕

編輯 `src/components/common/Button.module.scss`：

```scss
.button {
  padding: 16px 32px; // 原本 12px 24px
  font-size: 18px; // 原本 $font-size-base (16px)
}
```

**結果**：所有按鈕變大！

### 🏠 範例 3：自訂首頁背景

編輯 `src/pages/Home.module.scss`：

```scss
.home {
  background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%);
  // 或使用圖片
  background-image: url("/your-bg-image.jpg");
  background-size: cover;
}
```

**結果**：只有首頁背景改變！

## 📐 SCSS Modules 工作原理

### 自動 Scoping

```scss
// Button.module.scss
.button {
  padding: 16px;
}
```

編譯後：

```css
.Button_button__abc123 {
  padding: 16px;
}
```

### 避免樣式衝突

每個模組的 class 名稱都是唯一的，所以：

- 可以在不同檔案使用相同的 class 名稱
- 不會意外覆蓋其他組件的樣式
- 易於維護和除錯

## 🎯 最佳實踐

### DO（推薦做法）

1. **使用設計 tokens**

```scss
.button {
  color: $primary-color; //  使用變數
  padding: $spacing-md; //
}
```

2. **引入必要的檔案**

```scss
@import "../../styles/variables";
@import "../../styles/mixins";
```

3. **使用 mixins**

```scss
.container {
  @include flex-center; //  重用 mixin
}
```

### DON'T（避免做法）

1. **硬編碼值**

```scss
.button {
  color: #ff6b00; // 應使用 $primary-color
  padding: 16px; // 應使用 $spacing-md
}
```

2. **重複樣式**

```scss
.container {
  display: flex; // 應使用 @include flex-center
  justify-content: center;
  align-items: center;
}
```

## 🔄 修改後的影響範圍

| 修改檔案             | 影響範圍                   | 生效時間    |
| -------------------- | -------------------------- | ----------- |
| `_variables.scss`    | 🌍 整個應用                | 即時（HMR） |
| `Button.module.scss` | 📦 所有 Button 組件        | 即時（HMR） |
| `Home.module.scss`   | 📄 僅首頁                  | 即時（HMR） |
| `_mixins.scss`       | 🌍 所有使用該 mixin 的地方 | 即時（HMR） |

## 客製化建議

### 開始客製化前

1.  先閱讀 `SCSS_DESIGN_SYSTEM.md` 了解變數命名
2.  查看 `_variables.scss` 了解可用的 tokens
3.  在瀏覽器開發者工具查看元素的 class 名稱
4.  找到對應的 `.module.scss` 檔案進行修改

### 客製化順序建議

1. **先改全域** → `_variables.scss`（顏色、間距）
2. **再改組件** → `components/*/*.module.scss`（按鈕、卡片）
3. **最後改頁面** → `pages/*/*.module.scss`（特定頁面佈局）

## 🎨 所有可客製化的項目

### 顏色（11 個變數）

- 主色調系統（4 個）
- 背景色（2 個）
- 文字顏色（4 個）
- 邊框顏色（2 個）
- 狀態顏色（3 個）

### 間距（6 個變數）

- `$spacing-xxs` 到 `$spacing-xl`

### 字體（5 個變數）

- 字體家族 + 4 種字體大小

### 圓角（4 個變數）

- `$radius-sm` 到 `$radius-pill`

### 陰影（3 個變數）

- 小、中、底部陰影

### 斷點（2 個變數）

- Mobile、Tablet

---

**總結**： 所有 29 個組件/頁面都有獨立的 SCSS 模組，完全客製化！🎨
