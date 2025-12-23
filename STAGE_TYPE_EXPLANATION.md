# 賽制階段類型說明

## 📋 類型區分

在系統中有兩個相似但不同的階段類型概念，需要特別注意：

### 1. `FormatStage.type`（模板階段類型）

**用途：** 用於賽制模板定義（`formats` 集合）

**類型定義：**
```typescript
export type StageType = "round_robin" | "knockout" | "group_stage";
```

**使用位置：**
- `src/types/index.ts` - 類型定義
- `FormatTemplate.stages[].type` - 模板配置
- 前端讀取模板時判斷賽制

**示例：**
```typescript
{
  name: "4組取2晉級8強",
  stages: [
    {
      name: "小組賽",
      type: "group_stage",  // ← 使用 "group_stage"
      count: 4,
      advance: 2
    },
    {
      name: "淘汰賽",
      type: "knockout",
      size: 8
    }
  ]
}
```

### 2. `Match.stage`（比賽階段類型）

**用途：** 用於實際生成的比賽記錄（`matches` 集合）

**類型定義：**
```typescript
export interface Match {
  stage: "group" | "knockout";  // ← 注意這裡是 "group" 不是 "group_stage"
  // ...
}
```

**使用位置：**
- `src/types/index.ts` - 類型定義
- 生成比賽時的 `stage` 字段
- 場地分配邏輯判斷
- 比賽列表顯示

**示例：**
```typescript
{
  id: "match_123",
  stage: "group",        // ← 使用 "group"
  groupLabel: "A",
  round: 1,
  // ...
}
```

## 🔄 類型映射

在代碼中需要正確映射這兩種類型：

### 讀取模板 → 判斷賽制

```typescript
// ✅ 正確：從 FormatStage.type 讀取
const hasGroupStage = selectedFormat.stages.some(
  (s) => s.type === "group_stage"  // 檢查 "group_stage"
);
```

### 生成比賽 → 設置階段

```typescript
// ✅ 正確：生成 Match 時使用 "group"
const match: Match = {
  stage: "group",  // 不是 "group_stage"
  groupLabel: "A",
  // ...
};
```

### 內部狀態映射

```typescript
// PlayerSeedingModal.tsx
if (hasRoundRobin) {
  setFormatType("round_robin");  // 循環賽
} else if (hasGroupStage) {
  setFormatType("group");        // 小組賽：映射為 "group"
} else {
  setFormatType("knockout");     // 淘汰賽
}
```

## ⚠️ 常見錯誤

### ❌ 錯誤示例 1：在 Match 中使用 "group_stage"

```typescript
// ❌ 錯誤
const match: Match = {
  stage: "group_stage",  // TypeScript 會報錯！
  // ...
};
```

**修正：**
```typescript
// ✅ 正確
const match: Match = {
  stage: "group",  // Match.stage 只接受 "group" 或 "knockout"
  // ...
};
```

### ❌ 錯誤示例 2：在 FormatStage 中使用 "group"

```typescript
// ❌ 錯誤
const format: FormatTemplate = {
  stages: [
    {
      name: "小組賽",
      type: "group",  // 應該用 "group_stage"
      count: 4
    }
  ]
};
```

**修正：**
```typescript
// ✅ 正確
const format: FormatTemplate = {
  stages: [
    {
      name: "小組賽",
      type: "group_stage",  // FormatStage.type 使用 "group_stage"
      count: 4
    }
  ]
};
```

### ❌ 錯誤示例 3：查詢時混淆類型

```typescript
// ❌ 錯誤：在查詢 Match 時使用 "group_stage"
const matches = await getDocs(
  query(
    matchesRef,
    where("stage", "==", "group_stage")  // Match.stage 沒有這個值
  )
);
```

**修正：**
```typescript
// ✅ 正確
const matches = await getDocs(
  query(
    matchesRef,
    where("stage", "==", "group")  // Match.stage 使用 "group"
  )
);
```

## 📊 完整類型對照表

| 概念 | FormatStage.type | Match.stage | 說明 |
|------|------------------|-------------|------|
| 循環賽 | `"round_robin"` | `"group"` 或 N/A | 全員對戰，無分組概念 |
| 小組賽 | `"group_stage"` | `"group"` | 分組循環賽 |
| 淘汰賽 | `"knockout"` | `"knockout"` | 單淘汰或雙淘汰 |

## 🎯 設計理由

### 為什麼要有兩種類型？

1. **語義清晰**
   - `"group_stage"` 明確表示這是一個「小組賽階段」（stage）
   - `"group"` 簡潔表示這場比賽屬於「小組」

2. **向後兼容**
   - `Match.stage` 定義較早，使用簡短的 `"group"`
   - `FormatStage.type` 後期加入，使用完整的 `"group_stage"` 更語義化

3. **數據庫查詢**
   - `Match.stage` 用於頻繁的查詢和過濾，簡短的值更高效
   - `FormatStage.type` 用於模板配置，清晰的命名更重要

## 🔧 開發建議

### 1. 使用 TypeScript 類型檢查

讓 TypeScript 幫助你避免混淆：

```typescript
// 定義明確的類型
type FormatStageType = "round_robin" | "knockout" | "group_stage";
type MatchStageType = "group" | "knockout";

// 使用類型守衛
function isGroupStage(stage: FormatStageType): boolean {
  return stage === "group_stage";
}

function isGroupMatch(stage: MatchStageType): boolean {
  return stage === "group";
}
```

### 2. 添加註釋說明

在容易混淆的地方添加註釋：

```typescript
// 檢查模板類型（FormatStage.type）
const hasGroupStage = selectedFormat.stages.some(
  (s) => s.type === "group_stage"  // 注意：這裡用 "group_stage"
);

// 生成比賽時使用 Match.stage
const match = {
  stage: "group",  // 注意：這裡用 "group"
  // ...
};
```

### 3. 創建映射函數

```typescript
/**
 * 將 FormatStage.type 映射為 Match.stage
 */
function mapFormatTypeToMatchStage(
  formatType: FormatStageType
): MatchStageType | null {
  switch (formatType) {
    case "group_stage":
      return "group";
    case "knockout":
      return "knockout";
    case "round_robin":
      return "group";  // 循環賽也視為一種小組賽
    default:
      return null;
  }
}
```

## 📚 相關代碼位置

### 類型定義
- `src/types/index.ts` - 第6行：StageType 定義
- `src/types/index.ts` - 第150行：Match.stage 定義

### 實際使用
- `src/components/features/PlayerSeedingModal.tsx` - 第38-52行：類型映射
- `src/components/features/CategoryPublisher.tsx` - 第95-97行：檢查賽制
- `src/services/bracketService.ts` - 第207行：Match.stage 使用
- `src/services/scheduleRegenerationService.ts` - 第107-109行：檢查賽制

## 🎓 總結

- **`FormatStage.type`**：模板配置用，值為 `"group_stage"`
- **`Match.stage`**：比賽記錄用，值為 `"group"`
- **映射關係**：`"group_stage"` → `"group"`
- **核心原則**：讀取模板時用 `"group_stage"`，生成比賽時用 `"group"`

記住這個簡單的規則就不會混淆了！ 🎯

---

**版本：** 1.0.0  
**更新日期：** 2024-12-23  
**開發者：** SportFlow Team

