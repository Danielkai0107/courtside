# 賽制模板優先級修正

## 🐛 問題描述

用戶報告：「明明是小組賽，打開選手配對調整時卻顯示對戰配對，而不是小組分組。」

### 問題根源

在 `CategoryPublisher` 和 `CategoryScheduleManager` 中，載入賽制模板時**沒有檢查分類是否已經設定了 `selectedFormatId`**，而是直接使用推薦的第一個模板覆蓋。

#### 問題流程

1. 用戶在創建/編輯賽事時選擇了「小組賽+淘汰賽」模板
2. 分類的 `selectedFormatId` 被正確儲存
3. 進入賽程管理或發布頁面時：
   - 系統根據參賽者人數推薦模板
   - 自動選擇推薦的第一個模板（可能是純淘汰賽）
   - 覆蓋了原本設定的小組賽模板
4. 打開選手配對調整時：
   - 使用了錯誤的模板（淘汰賽而非小組賽）
   - 顯示對戰配對而不是小組分組

## 修正內容

### 核心原則

**優先使用分類已設定的模板，沒有才使用推薦的第一個。**

### 1. CategoryScheduleManager.tsx

**Before（錯誤）：**

```typescript
// Load recommended formats
if (participantsList.length >= 2) {
  const formats = await getFormatsByParticipantCount(participantsList.length);
  setRecommendedFormats(formats);
  if (formats.length > 0) {
    setSelectedFormat(formats[0]); // 直接覆蓋
  }
}
```

**After（修正）：**

```typescript
// Load recommended formats
if (participantsList.length >= 2) {
  const formats = await getFormatsByParticipantCount(participantsList.length);
  setRecommendedFormats(formats);

  // 優先使用分類已設定的模板，沒有才用推薦的第一個
  if (category.selectedFormatId) {
    const { getFormat } = await import("../../services/formatService");
    try {
      const existingFormat = await getFormat(category.selectedFormatId);
      if (existingFormat) {
        console.log(" 載入分類已設定的模板:", existingFormat.name);
        setSelectedFormat(existingFormat);
      } else if (formats.length > 0) {
        setSelectedFormat(formats[0]);
      }
    } catch (error) {
      console.warn("載入已設定模板失敗，使用推薦模板");
      if (formats.length > 0) {
        setSelectedFormat(formats[0]);
      }
    }
  } else if (formats.length > 0) {
    setSelectedFormat(formats[0]);
  }
}
```

### 2. CategoryPublisher.tsx

**Before（錯誤）：**

```typescript
useEffect(() => {
  const loadRecommendations = async () => {
    try {
      const formats = await getFormatsByParticipantCount(participants.length);
      setRecommendedFormats(formats);

      // 自動選擇第一個推薦模板
      if (formats.length > 0) {
        setSelectedFormat(formats[0]); // 直接覆蓋
      }
    } catch (error) {
      console.error("Failed to load format recommendations:", error);
    }
  };

  loadRecommendations();
}, [participants.length]);
```

**After（修正）：**

```typescript
useEffect(() => {
  const loadRecommendations = async () => {
    try {
      const formats = await getFormatsByParticipantCount(participants.length);
      setRecommendedFormats(formats);

      // 優先使用分類已設定的模板，沒有才用推薦的第一個
      if (category.selectedFormatId) {
        const { getFormat } = await import("../../services/formatService");
        try {
          const existingFormat = await getFormat(category.selectedFormatId);
          if (existingFormat) {
            console.log(" 載入分類已設定的模板:", existingFormat.name);
            setSelectedFormat(existingFormat);
          } else if (formats.length > 0) {
            setSelectedFormat(formats[0]);
          }
        } catch (error) {
          console.warn("載入已設定模板失敗，使用推薦模板");
          if (formats.length > 0) {
            setSelectedFormat(formats[0]);
          }
        }
      } else if (formats.length > 0) {
        // 沒有設定模板，使用推薦的第一個
        setSelectedFormat(formats[0]);
      }
    } catch (error) {
      console.error("Failed to load format recommendations:", error);
    }
  };

  loadRecommendations();
}, [participants.length, category.selectedFormatId]); //  添加依賴
```

## 📊 修正效果

### Before（修正前）

```
用戶選擇：小組賽+淘汰賽
           ↓
分類儲存：selectedFormatId = "group_8_knockout"
           ↓
進入賽程管理
           ↓
系統：載入推薦模板 → [純淘汰賽, 循環賽, ...]
           ↓
系統：自動選擇第一個 → 純淘汰賽 ❌
           ↓
PlayerSeedingModal：顯示對戰配對 ❌
```

### After（修正後）

```
用戶選擇：小組賽+淘汰賽
           ↓
分類儲存：selectedFormatId = "group_8_knockout"
           ↓
進入賽程管理
           ↓
系統：載入推薦模板 → [純淘汰賽, 循環賽, ...]
           ↓
系統：檢查 selectedFormatId
           ↓
系統：載入已設定模板 → 小組賽+淘汰賽
           ↓
PlayerSeedingModal：顯示小組分組
```

## 🎯 邏輯流程圖

```
┌─────────────────────────────────────┐
│ 載入賽制模板                         │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ 檢查分類是否   │
        │ 有 selectedFormatId? │
        └───────┬───────┘
                │
        ┌───────┴───────┐
        │               │
      Yes             No
        │               │
        ▼               ▼
┌───────────────┐  ┌──────────────┐
│ 載入已設定模板│  │ 使用推薦的   │
│ getFormat(id) │  │ 第一個模板   │
└───────┬───────┘  └──────┬───────┘
        │                 │
        ▼                 │
┌───────────────┐         │
│ 載入成功？    │         │
└───────┬───────┘         │
        │                 │
   ┌────┴────┐           │
  Yes       No           │
   │         │           │
   │         └───────────┘
   │                 │
   ▼                 ▼
┌──────────────────────────┐
│ 設置 selectedFormat       │
└──────────────────────────┘
```

## 🔍 測試場景

### 測試 1：已設定小組賽模板

1. 創建賽事，選擇「4 組取 2 晉級 8 強」模板
2. 進入賽程管理
3. **預期**：應該載入「4 組取 2 晉級 8 強」模板
4. 打開選手配對調整
5. **預期**：應該顯示小組分組（A 組、B 組、C 組、D 組）

### 測試 2：已設定淘汰賽模板

1. 創建賽事，選擇「16 強淘汰賽」模板
2. 進入賽程管理
3. **預期**：應該載入「16 強淘汰賽」模板
4. 打開選手配對調整
5. **預期**：應該顯示對戰配對

### 測試 3：未設定模板（新分類）

1. 創建賽事，未選擇模板（或舊的分類沒有 selectedFormatId）
2. 進入賽程管理
3. **預期**：應該使用推薦的第一個模板
4. 打開選手配對調整
5. **預期**：根據推薦模板顯示相應預覽

### 測試 4：已設定模板但載入失敗

1. 分類設定了一個不存在的 formatId
2. 進入賽程管理
3. **預期**：載入失敗後，降級使用推薦的第一個模板
4. Console 顯示警告訊息

## 🛡️ 錯誤處理

### 1. 模板載入失敗

```typescript
try {
  const existingFormat = await getFormat(category.selectedFormatId);
  if (existingFormat) {
    setSelectedFormat(existingFormat);
  } else {
    // 模板不存在，使用推薦模板
    if (formats.length > 0) {
      setSelectedFormat(formats[0]);
    }
  }
} catch (error) {
  console.warn("載入已設定模板失敗，使用推薦模板");
  // 發生錯誤，使用推薦模板
  if (formats.length > 0) {
    setSelectedFormat(formats[0]);
  }
}
```

### 2. 向後兼容

- 舊的分類沒有 `selectedFormatId` → 使用推薦模板
- `selectedFormatId` 為空字串 → 使用推薦模板
- `selectedFormatId` 指向不存在的模板 → 降級使用推薦模板

## 📝 相關文件

- `src/components/features/CategoryPublisher.tsx` - 發布前賽程管理
- `src/components/features/CategoryScheduleManager.tsx` - 發布後賽程管理
- `src/components/features/PlayerSeedingModal.tsx` - 選手配對調整彈窗
- `src/services/formatService.ts` - 模板服務

## 🎓 開發者注意事項

### 1. 依賴更新

記得在 `useEffect` 依賴中添加 `category.selectedFormatId`：

```typescript
useEffect(() => {
  // ...
}, [participants.length, category.selectedFormatId]); //  添加依賴
```

### 2. 動態導入

使用動態導入避免循環依賴：

```typescript
const { getFormat } = await import("../../services/formatService");
```

### 3. Console 日誌

添加日誌幫助調試：

```typescript
console.log(" 載入分類已設定的模板:", existingFormat.name);
console.warn("載入已設定模板失敗，使用推薦模板");
```

## 🚀 後續優化建議

1. **UI 提示**：當使用的模板與推薦模板不同時，顯示提示訊息
2. **模板驗證**：檢查已設定的模板是否適合當前參賽者人數
3. **模板選擇器**：允許用戶在賽程管理時切換模板
4. **模板歷史**：記錄模板變更歷史

---

**版本：** 1.0.0  
**修正日期：** 2024-12-23  
**開發者：** SportFlow Team  
**問題來源：** 用戶回報 - 明明是小組卻顯示對戰
