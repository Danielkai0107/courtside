# Material UI 組件遷移完成

## 更新日期
2025年12月23日

## 概述
已成功將所有輸入框、下拉選單和選擇器從自定義組件遷移到 Material UI 組件。

## 安裝的套件
- `@mui/material` - Material UI 核心組件庫
- `@emotion/react` - Material UI 所需的樣式引擎
- `@emotion/styled` - Material UI 所需的 styled 組件

## 更新的文件

### 組件（Components）

#### 1. CategoryManager.tsx
- **輸入框替換**: 2 個 `Input` → `TextField`
  - 分類名稱輸入框
  - 參賽名額上限輸入框
- **樣式更新**: `CategoryManager.module.scss` 添加 Material UI 樣式覆蓋

#### 2. CategoryPlayersManager.tsx
- **輸入框替換**: 5 個 `Input` → `TextField`
  - 生成測試數據數量輸入框
  - 選手 Email 輸入框
  - 選手姓名輸入框
  - 選手2 Email 輸入框
  - 選手2 姓名輸入框
- **樣式更新**: `CategoryPlayersManager.module.scss` 添加 Material UI 樣式覆蓋

#### 3. RegistrationForm.tsx
- **輸入框替換**: 3 個 `Input` → `TextField`
  - 您的姓名輸入框
  - 隊友 Email 輸入框
  - 隊友姓名輸入框
- **下拉選單替換**: 1 個 `<select>` → Material UI `<Select>`
  - 選擇分類下拉選單，使用 `FormControl`、`InputLabel` 和 `MenuItem`
- **樣式更新**: `RegistrationForm.module.scss` 添加 Material UI 樣式覆蓋

#### 4. CategoryStaffManager.tsx
- **輸入框替換**: 2 個 `Input` → `TextField`
  - Email 輸入框
  - 姓名輸入框
- **樣式更新**: `CategoryStaffManager.module.scss` 添加 Material UI 樣式覆蓋

#### 5. CourtManager.tsx
- **輸入框替換**: 1 個 `Input` → `TextField`
  - 場地名稱輸入框
- **樣式更新**: `CourtManager.module.scss` 添加 Material UI 樣式覆蓋

#### 6. PlayerSeedingModal.tsx (選手配對調整)
- **下拉選單替換**: 多個 `<select>` → Material UI `<Select>`
  - 淘汰賽第一輪對戰配對選手選擇（每場比賽 2 個下拉選單）
  - 輪空選手選擇下拉選單
  - 小組分組選手選擇下拉選單
  - 循環賽種子序列選手選擇下拉選單
- **使用組件**: `FormControl` + `Select` + `MenuItem`
- **尺寸設置**: `size="small"` 適配緊湊佈局
- **樣式更新**: `PlayerSeedingModal.module.scss` 添加 Material UI 樣式覆蓋

### 頁面（Pages）

#### 7. CreateTournament.tsx
- **輸入框替換**: 3 個 `Input` → `TextField`
  - 賽事名稱輸入框
  - 比賽地點輸入框
  - 賽事說明多行輸入框（textarea → multiline TextField）
- **日期時間選擇器**: 2 個 `Input[type="datetime-local"]` → `TextField[type="datetime-local"]`
  - 比賽日期選擇器（加入 `InputLabelProps={{ shrink: true }}`）
  - 報名截止日期選擇器（加入 `InputLabelProps={{ shrink: true }}`）
- **樣式更新**: `CreateTournament.module.scss` 添加 Material UI 樣式覆蓋

#### 8. EditTournament.tsx
- **輸入框替換**: 3 個 `Input` → `TextField`
  - 賽事名稱輸入框
  - 比賽地點輸入框
  - 賽事說明多行輸入框（textarea → multiline TextField）
- **日期時間選擇器**: 2 個 `Input[type="datetime-local"]` → `TextField[type="datetime-local"]`
  - 比賽日期選擇器（加入 `InputLabelProps={{ shrink: true }}`）
  - 報名截止日期選擇器（加入 `InputLabelProps={{ shrink: true }}`）
- **樣式更新**: 與 `CreateTournament.tsx` 共用 `CreateTournament.module.scss`

## 統計

- **總共更新文件**: 8 個 TypeScript 組件/頁面 + 7 個 SCSS 樣式文件
- **替換的輸入框**: 17 個單行輸入框 + 2 個多行輸入框
- **替換的日期時間選擇器**: 4 個 datetime-local 輸入框
- **替換的下拉選單**: 
  - 1 個分類選擇下拉選單（RegistrationForm）
  - 多個選手配對下拉選單（PlayerSeedingModal - 淘汰賽、小組賽、循環賽）

## Material UI TextField 配置

所有 TextField 組件使用統一配置：
```tsx
<TextField
  label="標籤"
  value={value}
  onChange={handleChange}
  placeholder="提示文字"
  required  // 如適用
  fullWidth
  variant="outlined"
  size="medium"
  type="text" // 或 "email", "number" 等
  inputProps={{ min: 0 }} // 對於 number 類型
/>
```

### 日期時間選擇器配置

```tsx
<TextField
  label="比賽日期"
  type="datetime-local"
  value={date}
  onChange={handleChange}
  required
  fullWidth
  variant="outlined"
  size="medium"
  InputLabelProps={{ shrink: true }} // 重要：保持標籤縮小狀態
/>
```

### 多行輸入框配置

```tsx
<TextField
  label="說明"
  value={description}
  onChange={handleChange}
  placeholder="請輸入說明..."
  multiline
  rows={8}
  fullWidth
  variant="outlined"
  size="medium"
/>
```

## Material UI Select 配置

### 帶標籤的 Select（完整表單）
Select 組件使用 FormControl 包裝：
```tsx
<FormControl fullWidth variant="outlined" size="medium" required>
  <InputLabel>標籤</InputLabel>
  <Select
    value={value}
    onChange={handleChange}
    label="標籤"
  >
    <MenuItem value="option1">選項 1</MenuItem>
    <MenuItem value="option2">選項 2</MenuItem>
  </Select>
</FormControl>
```

### 不帶標籤的 Select（選手配對等緊湊場景）
```tsx
<FormControl size="small" fullWidth>
  <Select
    value={selectedIndex}
    onChange={(e) => handleChange(e.target.value as number)}
  >
    {items.map((item, idx) => (
      <MenuItem key={idx} value={idx}>
        {item.name}
      </MenuItem>
    ))}
  </Select>
</FormControl>
```

## 樣式定制

每個組件的 SCSS 文件都添加了全局樣式覆蓋，以匹配應用的設計系統：

```scss
:global {
  .MuiTextField-root {
    margin-bottom: 0;
  }

  .MuiOutlinedInput-root {
    border-radius: 8px;
    background-color: var(--background-primary);

    &:hover .MuiOutlinedInput-notchedOutline {
      border-color: var(--primary-color);
    }

    &.Mui-focused .MuiOutlinedInput-notchedOutline {
      border-color: var(--primary-color);
      border-width: 2px;
    }
  }

  .MuiInputLabel-root {
    color: var(--text-secondary);

    &.Mui-focused {
      color: var(--primary-color);
    }
  }

  .MuiOutlinedInput-input {
    color: var(--text-primary);
  }

  .MuiFormControl-root {
    width: 100%;
  }
}
```

## 測試

✅ 所有文件已通過 ESLint 檢查
✅ 開發服務器成功啟動（http://localhost:5176/）
✅ 無編譯錯誤

## 優勢

1. **一致性**: 所有輸入組件現在使用統一的 Material UI 設計語言
2. **可訪問性**: Material UI 組件內建 ARIA 標籤和鍵盤導航支持
3. **功能豐富**: 內建驗證、錯誤提示、輔助文字等功能
4. **響應式**: 自動適應不同屏幕尺寸
5. **主題化**: 易於通過 CSS 變量進行主題定制
6. **維護性**: 使用行業標準組件庫，減少自定義代碼維護成本

## 下一步建議

1. 考慮遷移其他表單元素（如 Checkbox、Radio、Switch）
2. 探索 Material UI 的其他組件（如 Dialog、Snackbar、Tooltip）
3. 設置 Material UI 主題提供器以實現全局主題配置
4. 添加表單驗證（可使用 react-hook-form 配合 Material UI）

## 注意事項

- 移動設備上的輸入框字體大小設置為 16px 以防止自動縮放
- 所有組件保持了原有的功能和行為
- 樣式已調整以匹配應用的視覺設計

