# 編輯賽事規則配置修正

## 🐛 問題描述

在編輯賽事頁面（`/organizer/tournaments/:id/edit`）中，分類的規則配置（`ruleConfig`）和賽制模板（`selectedFormatId`）沒有被正確載入和保存。

### 具體問題

1. **載入時**：編輯現有賽事時，分類的 `ruleConfig` 和 `selectedFormatId` 沒有被載入到表單中
2. **保存時**：更新或創建分類時，`ruleConfig` 和 `selectedFormatId` 沒有被寫入資料庫
3. **結果**：編輯後的分類丟失了規則設定，導致賽程管理無法正常工作

## 修正內容

### 1. 更新類型定義

**檔案：** `src/pages/organizer/EditTournament.tsx`

**修正：** 在 categories state 中添加 `selectedFormat` 和 `ruleConfig` 欄位

```typescript
// Step 3: Categories
const [categories, setCategories] = useState<
  Array<{
    id?: string;
    name: string;
    matchType: "singles" | "doubles";
    maxParticipants: number;
    format: "KNOCKOUT_ONLY" | "GROUP_THEN_KNOCKOUT";
    pointsPerSet: number;
    enableThirdPlaceMatch: boolean;
    selectedFormat?: any; //  新增：FormatTemplate
    ruleConfig?: {
      //  新增：完整規則配置
      matchType: "set_based" | "point_based";
      maxSets: number;
      pointsPerSet: number;
      setsToWin: number;
      winByTwo: boolean;
      cap?: number;
    };
    groupConfig?: {
      totalGroups: number;
      advancePerGroup: number;
      bestThirdPlaces: number;
    };
  }>
>([]);
```

### 2. 修正載入邏輯

**問題：** 原本只載入了 `selectedFormatId`，沒有載入完整的模板資料

**修正：** 使用 `getFormat()` 載入完整的 `FormatTemplate` 對象

```typescript
// Convert categories - 載入完整的模板資料
const categoriesForm = await Promise.all(
  categoriesData.map(async (cat) => {
    let selectedFormat = undefined;

    // 如果有 selectedFormatId，載入完整的模板資料
    if (cat.selectedFormatId) {
      try {
        selectedFormat = await getFormat(cat.selectedFormatId);
      } catch (error) {
        console.warn(`Failed to load format ${cat.selectedFormatId}:`, error);
      }
    }

    return {
      id: cat.id,
      name: cat.name,
      matchType: cat.matchType,
      maxParticipants: cat.maxParticipants,
      format: cat.format,
      pointsPerSet: cat.pointsPerSet,
      enableThirdPlaceMatch: cat.enableThirdPlaceMatch,
      selectedFormat, //  載入完整模板
      ruleConfig: cat.ruleConfig || undefined, //  載入規則配置
      groupConfig: cat.groupConfig || undefined,
    };
  })
);
```

### 3. 修正保存邏輯

**問題：** 更新和創建分類時沒有包含 `selectedFormatId` 和 `ruleConfig`

**修正：** 在保存時包含這些欄位

#### 3.1 更新現有分類

```typescript
if (category.id && existingCategoryIds.includes(category.id)) {
  // Update existing category
  const updateData: any = {
    name: category.name,
    matchType: category.matchType,
    maxParticipants: category.maxParticipants,
    format: category.format,
    pointsPerSet: category.pointsPerSet,
    enableThirdPlaceMatch: category.enableThirdPlaceMatch,
    groupConfig: category.groupConfig,
  };

  //  包含賽制模板和規則配置
  if (category.selectedFormat?.id) {
    updateData.selectedFormatId = category.selectedFormat.id;
  }
  if (category.ruleConfig) {
    updateData.ruleConfig = category.ruleConfig;
  }

  await updateCategory(id, category.id, updateData);
  updatedCategoryIds.push(category.id);
}
```

#### 3.2 創建新分類

```typescript
else {
  // Create new category
  const createData: any = {
    name: category.name,
    matchType: category.matchType,
    maxParticipants: category.maxParticipants,
    format: category.format,
    pointsPerSet: category.pointsPerSet,
    enableThirdPlaceMatch: category.enableThirdPlaceMatch,
    groupConfig: category.groupConfig,
    status: "REGISTRATION_OPEN",
    currentParticipants: 0,
  };

  //  包含賽制模板和規則配置
  if (category.selectedFormat?.id) {
    createData.selectedFormatId = category.selectedFormat.id;
  }
  if (category.ruleConfig) {
    createData.ruleConfig = category.ruleConfig;
  }

  const newCategoryId = await createCategory(id, createData);
  updatedCategoryIds.push(newCategoryId);
}
```

### 4. 新增依賴導入

```typescript
import { getFormat } from "../../services/formatService";
```

## 🔍 測試步驟

### 測試場景 1：編輯現有賽事

1. 創建一個新賽事，包含分類和規則配置
2. 進入編輯頁面 `/organizer/tournaments/:id/edit`
3. 檢查：
   - 分類的規則配置應該正確顯示
   - 模板資訊應該正確載入
4. 修改分類名稱並保存
5. 檢查：
   - 規則配置應該保持不變
   - 模板 ID 應該保持不變

### 測試場景 2：添加新分類

1. 進入編輯頁面
2. 添加新分類，選擇規則預設
3. 保存
4. 檢查資料庫：
   - 新分類應該包含 `ruleConfig`
   - 新分類應該包含 `selectedFormatId`（如果有選擇模板）

### 測試場景 3：修改規則配置

1. 進入編輯頁面
2. 修改現有分類的規則（例如從 3 戰 2 勝改為 5 戰 3 勝）
3. 保存
4. 檢查：
   - 規則應該更新為新的配置
   - 其他欄位保持不變

## 📊 影響範圍

### 直接影響

- 編輯賽事功能正常運作
- 規則配置正確保存和載入
- 賽程管理可以正常使用規則配置

### 間接影響

- 選手配對調整功能依賴 `selectedFormatId`，現在能正確運作
- 計分板使用 `ruleConfig`，現在能顯示正確的規則
- 比賽生成邏輯依賴 `ruleConfig`，現在能正確生成比賽

## 🔗 相關文件

- `src/pages/organizer/EditTournament.tsx` - 編輯賽事頁面
- `src/components/features/CategoryManager.tsx` - 分類管理組件
- `src/services/formatService.ts` - 模板服務
- `src/services/categoryService.ts` - 分類服務

## 📝 注意事項

### 1. 向後兼容

修正後的代碼向後兼容沒有 `ruleConfig` 的舊分類：

```typescript
ruleConfig: cat.ruleConfig || undefined,  // 如果沒有，設為 undefined
```

### 2. 錯誤處理

載入模板時有錯誤處理：

```typescript
try {
  selectedFormat = await getFormat(cat.selectedFormatId);
} catch (error) {
  console.warn(`Failed to load format ${cat.selectedFormatId}:`, error);
  // 繼續執行，selectedFormat 為 undefined
}
```

### 3. 可選欄位

`selectedFormatId` 和 `ruleConfig` 都是可選的：

```typescript
if (category.selectedFormat?.id) {
  updateData.selectedFormatId = category.selectedFormat.id;
}
if (category.ruleConfig) {
  updateData.ruleConfig = category.ruleConfig;
}
```

## 🎯 預期結果

修正後：

1.  編輯賽事時能看到完整的規則配置
2.  修改分類後規則配置不會丟失
3.  新增的分類會正確保存規則配置
4.  賽程管理能正確使用模板和規則
5.  選手配對調整功能能正常運作

## 🐛 原本的錯誤行為

### Before（修正前）

```typescript
// 載入時
const categoriesForm = categoriesData.map((cat) => ({
  id: cat.id,
  name: cat.name,
  // ... 其他欄位
  // 沒有 selectedFormat
  // 沒有 ruleConfig
}));

// 保存時
await updateCategory(id, category.id, {
  name: category.name,
  // ... 其他欄位
  // 沒有 selectedFormatId
  // 沒有 ruleConfig
});
```

### After（修正後）

```typescript
// 載入時
const categoriesForm = await Promise.all(
  categoriesData.map(async (cat) => {
    let selectedFormat = undefined;
    if (cat.selectedFormatId) {
      selectedFormat = await getFormat(cat.selectedFormatId);
    }
    return {
      id: cat.id,
      name: cat.name,
      // ... 其他欄位
      selectedFormat, //  載入完整模板
      ruleConfig: cat.ruleConfig, //  載入規則配置
    };
  })
);

// 保存時
const updateData: any = {
  /* ... */
};
if (category.selectedFormat?.id) {
  updateData.selectedFormatId = category.selectedFormat.id; //  保存模板ID
}
if (category.ruleConfig) {
  updateData.ruleConfig = category.ruleConfig; //  保存規則配置
}
await updateCategory(id, category.id, updateData);
```

---

**版本：** 1.0.0  
**修正日期：** 2024-12-23  
**開發者：** SportFlow Team  
**問題來源：** 用戶回報 - 編輯沒有帶到規則
