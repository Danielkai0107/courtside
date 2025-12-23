# Bug 修復：toLowerCase 錯誤

## 問題描述

錯誤訊息：

```
Cannot read properties of undefined (reading 'toLowerCase')
```

## 根本原因

在 `CategoryDetail.tsx` 和 `ScorerCategoryDetail.tsx` 中，使用了：

```typescript
// 問題代碼
styles[match.status?.toLowerCase() || ""];
```

當 `match.status` 是 `undefined` 時，雖然 `?.` 運算符可以安全訪問，但在某些情況下（例如 `match.status` 屬性存在但值為 `undefined`），仍會嘗試調用 `toLowerCase()`，導致錯誤。

## 解決方案

改為更安全的寫法：

```typescript
//  修復代碼
styles[(match.status || "").toLowerCase()];
```

這樣可以確保：

1. 如果 `match.status` 是 `undefined` 或 `null`，會使用空字串 `""`
2. 空字串調用 `toLowerCase()` 會返回空字串，不會報錯
3. `styles[""]` 會返回 `undefined`，但不會導致錯誤

## 修改的檔案

1. **`src/pages/CategoryDetail.tsx`** - 2 處修改
2. **`src/pages/scorer/ScorerCategoryDetail.tsx`** - 2 處修改

## 驗證

修改後應該不會再看到 `toLowerCase` 錯誤，即使在以下情況：

- Match 剛生成（status 可能未正確設定）
- 佔位符 Match（status 為 "PENDING_PLAYER"）
- 舊的 Match 資料（可能缺少某些欄位）

## 其他安全改進

建議在整個專案中檢查類似的模式：

```bash
# 搜尋所有使用 ?. 然後 toLowerCase 的地方
grep -r "?\.toLowerCase" src/
```

並統一改為：

```typescript
(value || "").toLowerCase();
```

## 部署

這是前端代碼修改，不需要部署 Firebase。只需：

1. 重新整理瀏覽器
2. 清除快取（如果需要）

修改會在下次訪問頁面時生效。

---

**修復日期：** 2024 年 12 月 23 日
**狀態：** 已完成
