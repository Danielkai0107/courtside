# 🎨 SportFlow SCSS 設計系統文檔

## 📁 檔案結構

```
src/styles/
├── _variables.scss    # 所有設計 tokens（顏色、間距、字體等）
├── _mixins.scss       # 可重用的 SCSS mixins
├── _reset.scss        # CSS Reset 與基礎樣式
└── main.scss          # 主入口（匯入所有樣式）
```

## 🎨 設計 Token 系統

### 顏色系統 (Colors)

#### 主色調（橘色系統）

```scss
$primary-color: #ff6b00; // 主要橘色
$primary-light: #ff8c00; // 較亮的橘色
$primary-dark: #e65c00; // 較深的橘色
$primary-gradient: linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%);
```

#### 背景色

```scss
$bg-color: #f5f5f5; // 頁面背景（淺灰）
$card-bg: #ffffff; // 卡片背景（白色）
```

#### 文字顏色

```scss
$text-primary: #333333; // 主要文字（深灰）
$text-secondary: #999999; // 次要文字（灰色）
$text-placeholder: #cccccc; // 佔位文字（淡灰）
$text-disabled: #e0e0e0; // 禁用文字（更淡灰）
```

#### 邊框顏色

```scss
$border-color: #e0e0e0; // 預設邊框
$border-active: $primary-color; // 活動狀態邊框（橘色）
```

#### 狀態顏色

```scss
$accent-color: #00e676; // 成功/綠色
$error-color: #ff5252; // 錯誤/紅色
$warning-color: #ffca28; // 警告/黃色
```

### 間距系統 (Spacing)

```scss
$spacing-xxs: 4px; // 極小間距
$spacing-xs: 4px; // 小間距（相同）
$spacing-sm: 8px; // 小間距
$spacing-md: 16px; // 中等間距
$spacing-lg: 24px; // 大間距
$spacing-xl: 32px; // 超大間距
```

**使用範例**：

```scss
.button {
  padding: $spacing-md $spacing-lg;
  margin-bottom: $spacing-xl;
}
```

### 圓角系統 (Border Radius)

```scss
$radius-sm: 8px; // 小圓角（輸入框、卡片）
$radius-md: 10px; // 中圓角
$radius-lg: 12px; // 大圓角（按鈕、Modal）
$radius-pill: 9999px; // 圓形（標籤、頭像）
```

### 陰影系統 (Shadows)

```scss
$shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1); // 小陰影
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.08); // 中陰影
$shadow-bottom: 0 -2px 8px rgba(0, 0, 0, 0.1); // 底部陰影（固定按鈕用）
```

### 字體系統 (Typography)

```scss
$font-family-base: "Inter", system-ui, -apple-system, sans-serif;

$font-size-sm: 0.875rem; // 14px - 次要文字
$font-size-base: $font-size-base; // 16px - 正常文字
$font-size-lg: 1.25rem; // 20px - 標題
$font-size-xl: 1.5rem; // 24px - 大標題
```

## 🛠️ Mixins 工具

### 佈局 Mixins

```scss
// 水平垂直置中
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

// 垂直排列
@mixin flex-column {
  display: flex;
  flex-direction: column;
}

// 兩端對齊
@mixin flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// Mobile 容器
@mixin mobile-container {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100dvh;
  background-color: $bg-color;
  position: relative;
  overflow-x: hidden;
}
```

### 響應式 Mixins

```scss
// 斷點
$mobile: 480px;
$tablet: 768px;

// 使用方式
@include respond-to(mobile) {
  // 手機版樣式
}

@include respond-to(tablet) {
  // 平板版樣式
}
```

## 🎯 如何客製化

### 1. 修改主題顏色

在 `src/styles/_variables.scss` 中修改：

```scss
// 例如：改為藍色主題
$primary-color: #2979ff;
$primary-light: #448aff;
$primary-dark: #1976d2;
$primary-gradient: linear-gradient(135deg, #2979ff 0%, #448aff 100%);
```

### 2. 調整間距

```scss
// 例如：增加整體間距
$spacing-md: 20px; // 原本 16px
$spacing-lg: 28px; // 原本 24px
```

### 3. 改變圓角

```scss
// 例如：更圓潤的設計
$radius-sm: 12px; // 原本 8px
$radius-lg: 16px; // 原本 12px
```

### 4. 自訂字體

```scss
// 例如：使用 Noto Sans TC（繁體中文）
$font-family-base: "Noto Sans TC", system-ui, -apple-system, sans-serif;
```

## 📦 組件樣式命名規範

### BEM 命名法（部分使用）

```scss
.componentName {
  // 區塊 (Block)
  &__element {
    // 元素 (Element)
    // 樣式
  }

  &--modifier {
    // 修飾符 (Modifier)
    // 樣式
  }
}
```

### 實際範例

```scss
// Button 組件
.button {
  // 基礎樣式

  &.primary {
    // 變體
    background: $primary-gradient;
  }

  &.fullWidth {
    // 修飾符
    width: 100%;
  }
}
```

## 🌈 主題變體快速切換

### 建立新主題

在 `_variables.scss` 中可以定義多個主題：

```scss
// 預設主題（橘色）
$theme-primary: #ff6b00;

// 可選主題變數
$theme-blue: #2979ff;
$theme-green: #00c853;
$theme-purple: #9c27b0;

// 使用時只需更改這一行：
$primary-color: $theme-primary; // 改為 $theme-blue 即切換藍色主題
```

## 📋 常用客製化場景

### 場景 1：改變主題色

```scss
// src/styles/_variables.scss

// 1. 修改主色調
$primary-color: #你的顏色;
$primary-light: #較亮的顏色;
$primary-dark: #較深的顏色;
$primary-gradient: linear-gradient(135deg, #起始色 0%, #結束色 100%);

// 2. 儲存檔案，Vite 會自動熱更新
```

### 場景 2：調整整體間距

```scss
// src/styles/_variables.scss

// 統一放大 1.2 倍
$spacing-xs: 5px; // 原 4px
$spacing-sm: 10px; // 原 8px
$spacing-md: 19px; // 原 16px
$spacing-lg: 29px; // 原 24px
$spacing-xl: 38px; // 原 32px
```

### 場景 3：改變按鈕樣式

```scss
// src/components/common/Button.module.scss

.button {
  // 修改這些值
  padding: 14px 28px; // 原 12px 24px
  border-radius: $radius-lg; // 更圓潤
  font-size: 18px; // 更大字體
}
```

### 場景 4：深色模式準備

在 `_variables.scss` 底部添加：

```scss
// 深色模式變數（未來可用）
$dark-bg-color: #121212;
$dark-card-bg: #1e1e1e;
$dark-text-primary: #ffffff;
$dark-text-secondary: #b0b0b0;
```

## 🔥 實時預覽

所有修改都會即時反映在開發伺服器中，無需重啟！

**修改流程**：

1. 編輯 `_variables.scss`
2. 儲存檔案
3. 瀏覽器自動更新（HMR）

## 📚 進階客製化

### 新增自訂顏色

```scss
// src/styles/_variables.scss

// 在檔案底部添加
$custom-blue: #1976d2;
$custom-pink: #e91e63;
$custom-teal: #009688;
```

### 新增自訂 Mixin

```scss
// src/styles/_mixins.scss

// 在檔案底部添加
@mixin card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
}

// 使用方式
.myCard {
  @include card-hover;
}
```

## 🎯 設計原則

1. **Mobile First**：所有尺寸以手機為優先
2. **一致性**：使用變數而非硬編碼值
3. **可維護性**：集中管理設計 tokens
4. **可擴展性**：易於添加新變體

## 📖 快速參考

| 用途         | 變數名稱            | 預設值    |
| ------------ | ------------------- | --------- |
| 主要按鈕背景 | `$primary-gradient` | 橘色漸層  |
| 卡片背景     | `$card-bg`          | `#FFFFFF` |
| 頁面背景     | `$bg-color`         | `#F5F5F5` |
| 主要文字     | `$text-primary`     | `#333333` |
| 邊框         | `$border-color`     | `#E0E0E0` |
| 標準間距     | `$spacing-md`       | `16px`    |
| 標準圓角     | `$radius-sm`        | `8px`     |
| 大型按鈕圓角 | `$radius-lg`        | `12px`    |

---

**提示**：修改 `_variables.scss` 後會立即套用到整個應用程式！🎨
