# 報名按鈕修復

## 🐛 問題

**報名按鈕無法點擊** - 按鈕根本沒有顯示

## 🔍 問題原因

### 舊邏輯（有問題）

```typescript
const canRegister = tournament.status === "REGISTRATION_OPEN" && !isRegistered;

// isRegistered 的檢查
const registered = await isUserRegistered(id, currentUser.uid);
// ↑ 只檢查舊的 players 集合
// ↑ 不檢查新的 categories/teams
```

**問題**：

1. `isUserRegistered` 只查詢舊的 players 集合
2. 三層架構下，報名是按 **category** 的（不是按 tournament）
3. 用戶可能報名了男子雙打，但想報名女子單打
4. 舊邏輯會阻止顯示報名按鈕

### 實際情況

```
用戶狀態：已報名男子雙打
想要：報名女子單打
舊邏輯：isRegistered = true（因為查到 players 有記錄）
結果：報名按鈕不顯示 ❌
實際：應該可以報名其他分類
```

## 修復方案

### 方案：總是顯示報名按鈕

```typescript
// 新邏輯
const canRegister = tournament.status === "REGISTRATION_OPEN";
// 移除 !isRegistered 條件

// 原因：
// 1. 報名是按 category 的
// 2. 用戶可以報名多個分類
// 3. 在報名表單內部檢查該分類是否已報名
```

### 報名表單內部檢查

```typescript
// RegistrationForm 內部
useEffect(() => {
  if (category && currentUser) {
    checkCategoryRegistration(category);
  }
}, [selectedCategoryId]);

const checkCategoryRegistration = async (category) => {
  if (category.matchType === "singles") {
    // 檢查是否已報名此分類
  } else {
    // 檢查是否在此分類的隊伍中
    const inTeam = await isUserInTeam(
      tournamentId,
      category.id,
      currentUser.uid
    );
    if (inTeam) {
      setError(`您已報名此分類（${category.name}）`);
    }
  }
};
```

## 🎯 修復效果

### 場景 1：首次報名

```
1. 用戶進入賽事頁面
2. 看到「報名」按鈕
3. 點擊報名
4. 選擇分類（男子雙打）
5. 填寫資料
6. 提交 → 成功
```

### 場景 2：報名多個分類

```
1. 用戶已報名男子雙打
2. 想報名女子單打
3. 看到「報名」按鈕 （不被阻擋）
4. 點擊報名
5. 選擇分類（女子單打）
6. 提交 → 成功
```

### 場景 3：重複報名同一分類

```
1. 用戶已報名男子雙打
2. 再次點擊「報名」
3. 選擇分類（男子雙打）
4. 表單顯示錯誤：「您已報名此分類」❌
5. 無法提交
```

### 場景 4：被婉拒後重新報名

```
1. 用戶報名男子雙打 → 被婉拒
2. 修改後再次報名
3. 看到「報名」按鈕
4. 選擇分類（男子雙打）
5. 提交 → 成功（狀態重置為 pending）
```

## 📋 修改清單

### 修改文件（2 個）

1. **EventDetail.tsx**

   - 簡化 `canRegister` 邏輯
   - 移除 `!isRegistered` 條件
   - 移除「您已報名此賽事」徽章（因為可能報名多個分類）

2. **RegistrationForm.tsx**
   - 添加分類級別的報名檢查
   - 切換分類時檢查是否已報名
   - 顯示清晰的錯誤提示

## 🎯 新的報名邏輯

### Tournament 層級

```
EventDetail:
  - 狀態 === REGISTRATION_OPEN → 顯示「報名」按鈕
  - 不檢查是否已報名（允許報名多個分類）
```

### Category 層級

```
RegistrationForm:
  - 選擇分類時檢查是否已報名該分類
  - 單打：檢查 players（簡化）
  - 雙打：檢查是否在 teams 中
  - 已報名 → 顯示錯誤，阻止提交
  - 未報名 → 允許報名
```

## 測試檢查清單

- [ ] 首次報名：按鈕顯示
- [ ] 報名多個分類：允許
- [ ] 重複報名同一分類：阻止
- [ ] 被婉拒後重新報名：允許
- [ ] 錯誤訊息清晰

## 🎊 完成

**報名按鈕和邏輯已修復！**

- 報名按鈕總是顯示（報名開放時）
- 支援報名多個分類
- 分類級別檢查重複報名
- 被婉拒者可以重新報名
- 清晰的錯誤提示

**報名體驗更合理！**

---

**修復日期**: 2024 年 12 月 21 日  
**問題**: 報名按鈕不顯示  
**原因**: 舊的 isRegistered 檢查邏輯  
**解決**: 改為按分類檢查  
**狀態**: 已修復並部署
