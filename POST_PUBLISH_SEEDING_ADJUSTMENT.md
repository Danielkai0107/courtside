# 發布後選手配對調整功能

## 🎯 功能概述

擴展原有的「選手配對調整」功能，支援在賽程發布後重新調整種子位並重新生成賽程。系統會智能檢測已開始的比賽，確保不會影響正在進行或已完成的比賽。

## ✨ 新增功能

### 1. **智能檢測機制**

- 自動檢測是否有比賽已開始（IN_PROGRESS）或已完成（COMPLETED）
- 即時顯示賽程統計資訊
- 根據比賽狀態決定是否允許重新生成

### 2. **安全的重新生成流程**

- 僅刪除未開始（SCHEDULED）的比賽
- 保護已開始和已完成的比賽數據
- 使用調整後的種子位重新生成對戰

### 3. **完善的用戶提示**

- **情況 A**：所有比賽未開始 → 允許重新生成
- **情況 B**：有比賽已開始 → 顯示警告並阻止操作

## 🔧 技術實現

### 新增服務：scheduleRegenerationService.ts

#### 1. 檢測已開始的比賽

```typescript
export async function hasStartedMatches(
  tournamentId: string,
  categoryId: string
): Promise<{ hasStarted: boolean; count: number }> {
  const q = query(
    matchesRef,
    where("tournamentId", "==", tournamentId),
    where("categoryId", "==", categoryId),
    where("status", "in", ["IN_PROGRESS", "COMPLETED"])
  );

  const snapshot = await getDocs(q);
  return {
    hasStarted: !snapshot.empty,
    count: snapshot.size,
  };
}
```

#### 2. 刪除未開始的比賽

```typescript
export async function deleteUnstartedMatchesByCategory(
  tournamentId: string,
  categoryId: string
): Promise<number> {
  const q = query(
    matchesRef,
    where("tournamentId", "==", tournamentId),
    where("categoryId", "==", categoryId),
    where("status", "==", "SCHEDULED")
  );

  const snapshot = await getDocs(q);

  // 使用 batch 批量刪除
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  await batch.commit();
  return snapshot.size;
}
```

#### 3. 重新生成賽程

```typescript
export async function regenerateSchedule(
  tournamentId: string,
  category: Category,
  reorderedParticipants: Array<{ id: string; name: string }>,
  selectedFormat: FormatTemplate,
  courts: Array<{ id: string; name: string }>
): Promise<void> {
  // 1. 檢查是否有已開始的比賽
  const { hasStarted, count } = await hasStartedMatches(
    tournamentId,
    category.id
  );

  if (hasStarted) {
    throw new Error(
      `此分類有 ${count} 場比賽已開始或已完成，無法重新生成賽程。`
    );
  }

  // 2. 刪除所有未開始的比賽
  await deleteUnstartedMatchesByCategory(tournamentId, category.id);

  // 3. 根據賽制重新生成
  if (hasRoundRobin) {
    await generateRoundRobin(...);
  } else if (hasGroupStage) {
    await generateGroupThenKnockout(...);
  } else {
    await generateKnockoutOnly(...);
  }
}
```

### 更新組件：CategoryScheduleManager.tsx

#### 新增狀態管理

```typescript
const [regenerating, setRegenerating] = useState(false);
const [showSeedingModal, setShowSeedingModal] = useState(false);
const [showWarningModal, setShowWarningModal] = useState(false);
const [scheduleStats, setScheduleStats] = useState<any>(null);
const [recommendedFormats, setRecommendedFormats] = useState<FormatTemplate[]>(
  []
);
const [selectedFormat, setSelectedFormat] = useState<FormatTemplate | null>(
  null
);
const [adjustedParticipants, setAdjustedParticipants] = useState<any[]>([]);
```

#### 新增處理函數

```typescript
// 打開配對調整（檢查比賽狀態）
const handleOpenSeedingAdjustment = () => {
  if (
    scheduleStats &&
    (scheduleStats.inProgress > 0 || scheduleStats.completed > 0)
  ) {
    setShowWarningModal(true); // 有比賽已開始 → 顯示警告
  } else {
    setShowSeedingModal(true); // 所有比賽未開始 → 打開調整彈窗
  }
};

// 儲存種子位調整
const handleSaveSeedingAdjustment = (reorderedParticipants) => {
  setAdjustedParticipants(reorderedParticipants);
  setShowSeedingModal(false);
};

// 執行重新生成
const handleRegenerateSchedule = async () => {
  const confirmed = window.confirm(
    `確定要重新生成賽程嗎？\n\n` + `這將刪除所有未開始的比賽並重新生成。`
  );

  if (!confirmed) return;

  await regenerateSchedule(
    tournamentId,
    currentCategoryData,
    adjustedParticipants,
    selectedFormat,
    courts
  );

  // 重新載入數據
  // ...
};
```

## 🎨 UI 設計

### 1. 發布後的操作按鈕

```tsx
<div className={styles.publishedActions}>
  <Button variant="secondary" onClick={handleReassignCourts}>
    重新分配場地
  </Button>

  <Button
    variant="outline"
    onClick={handleOpenSeedingAdjustment}
    disabled={!selectedFormat || participants.length < 2}
  >
    ⚙️ 調整配對並重新生成
  </Button>

  <Button
    variant="primary"
    onClick={() =>
      (window.location.href = `/events/${tournamentId}/categories/${activeCategory}`)
    }
  >
    查看賽程
  </Button>
</div>
```

### 2. 警告彈窗（有比賽已開始）

```tsx
<Modal
  isOpen={showWarningModal}
  onClose={() => setShowWarningModal(false)}
  title="無法重新生成賽程"
>
  <div className={styles.warningModalContent}>
    <div className={styles.warningIcon}>
      <AlertTriangle size={48} color="#ff6b00" />
    </div>

    <p className={styles.warningMessage}>
      此分類有比賽已經開始或已完成，無法重新生成賽程。
    </p>

    <div className={styles.warningStats}>
      <div className={styles.statRow}>
        <span>進行中：</span>
        <strong>{scheduleStats?.inProgress || 0} 場</strong>
      </div>
      <div className={styles.statRow}>
        <span>已完成：</span>
        <strong>{scheduleStats?.completed || 0} 場</strong>
      </div>
      <div className={styles.statRow}>
        <span>未開始：</span>
        <strong>{scheduleStats?.scheduled || 0} 場</strong>
      </div>
    </div>

    <div className={styles.warningHint}>
      <p>
        <strong>建議：</strong>
      </p>
      <ul>
        <li>使用「重新分配場地」功能調整未開始的比賽場地</li>
        <li>等待所有比賽完成後再重新生成賽程</li>
      </ul>
    </div>
  </div>
</Modal>
```

### 3. 確認彈窗（所有比賽未開始）

```tsx
<Modal
  isOpen={adjustedParticipants !== participants}
  onClose={() => setAdjustedParticipants(participants)}
  title="確認重新生成賽程"
>
  <div className={styles.confirmModalContent}>
    <p>您已調整種子位，是否要立即重新生成賽程？</p>

    <div className={styles.confirmStats}>
      <div className={styles.statRow}>
        <span>將刪除未開始的比賽：</span>
        <strong>{scheduleStats?.scheduled || 0} 場</strong>
      </div>
      <div className={styles.statRow}>
        <span>將保留已開始/完成的比賽：</span>
        <strong>
          {(scheduleStats?.inProgress || 0) + (scheduleStats?.completed || 0)}{" "}
          場
        </strong>
      </div>
    </div>

    <div className={styles.confirmActions}>
      <Button
        variant="text"
        onClick={() => setAdjustedParticipants(participants)}
      >
        取消
      </Button>
      <Button
        variant="primary"
        onClick={handleRegenerateSchedule}
        loading={regenerating}
      >
        確認重新生成
      </Button>
    </div>
  </div>
</Modal>
```

## 🔒 安全保護機制

### 1. 數據層保護

- 僅查詢 `status === "SCHEDULED"` 的比賽
- 使用 Firestore 的 `where` 條件過濾
- 批量操作使用 `writeBatch` 確保原子性

### 2. 業務邏輯保護

- 檢測到已開始的比賽時拋出錯誤
- 明確告知用戶無法操作的原因
- 提供替代方案建議

### 3. 用戶體驗保護

- 二次確認機制
- 清楚顯示將受影響的比賽數量
- 操作前後的狀態對比

## 📊 操作流程圖

```
┌─────────────────────────────────────────────────────────┐
│  主辦方進入「賽程管理」→ 選擇組別                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  點擊「⚙️ 調整配對並重新生成」                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ 有比賽已開始？   │      │ 所有比賽未開始   │
│                  │      │                  │
│ • 進行中: 2 場   │      │ • 未開始: 16 場  │
│ • 已完成: 5 場   │      │                  │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ 警告彈窗      │      │ 打開配對調整彈窗 │
│                  │      │                  │
│ • 顯示統計資訊   │      │ • 調整種子位     │
│ • 阻止操作       │      │ • 預覽對戰       │
│ • 提供建議       │      │ • 儲存調整       │
└──────────────────┘      └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ 確認重新生成彈窗 │
                          │                  │
                          │ • 顯示影響範圍   │
                          │ • 二次確認       │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ 執行重新生成     │
                          │                  │
                          │ 1. 刪除未開始    │
                          │ 2. 重新生成      │
                          │ 3. 重新載入      │
                          └──────────────────┘
```

## 🎯 使用場景

### 場景 1：發現種子位錯誤（比賽尚未開始）

**問題：** 發布後發現 #1 種子和 #2 種子應該互換

**解決方案：**

1. 進入賽程管理
2. 點擊「調整配對並重新生成」
3. 系統檢查：所有比賽都是 SCHEDULED
4. 調整種子位
5. 確認重新生成
6. 系統刪除 16 場未開始的比賽
7. 使用新種子位重新生成 16 場比賽

**結果：** 成功調整，所有比賽重新配對

### 場景 2：比賽進行中想調整（部分比賽已開始）

**問題：** 第一輪已經打了幾場，想調整後續配對

**系統反應：**

```
無法重新生成賽程

此分類有比賽已經開始或已完成，無法重新生成賽程。

進行中：2 場
已完成：5 場
未開始：9 場

建議：
• 使用「重新分配場地」功能調整未開始的比賽場地
• 等待所有比賽完成後再重新生成賽程
```

**結果：** 阻止操作，保護已開始的比賽數據

### 場景 3：所有比賽完成後重新開始（全部已完成）

**問題：** 賽事結束，想用相同選手重新開始新賽程

**解決方案：**

1. 所有比賽狀態都是 COMPLETED
2. 系統檢測到有已完成的比賽
3. 顯示警告彈窗，阻止重新生成
4. 建議：創建新的賽事或分類

**結果：** 保護歷史數據，建議創建新賽事

## 📝 開發者注意事項

### 1. Firestore 查詢優化

```typescript
//  好的做法：使用索引友好的查詢
where("status", "in", ["IN_PROGRESS", "COMPLETED"]);

// 避免：多次查詢後合併
const inProgress = await getDocs(query(where("status", "==", "IN_PROGRESS")));
const completed = await getDocs(query(where("status", "==", "COMPLETED")));
```

### 2. 批量刪除使用 Batch

```typescript
//  好的做法：使用 writeBatch
const batch = writeBatch(db);
snapshot.docs.forEach((doc) => batch.delete(doc.ref));
await batch.commit();

// 避免：逐個刪除
for (const doc of snapshot.docs) {
  await deleteDoc(doc.ref); // 太慢！
}
```

### 3. 錯誤處理

```typescript
try {
  await regenerateSchedule(...);
  alert(" 賽程重新生成成功！");
} catch (err: any) {
  // 顯示友好的錯誤訊息
  alert(`重新生成失敗：\n${err.message}`);
}
```

## 🧪 測試建議

### 單元測試

```typescript
describe("scheduleRegenerationService", () => {
  test("應該正確檢測已開始的比賽", async () => {
    const result = await hasStartedMatches(tournamentId, categoryId);
    expect(result.hasStarted).toBe(true);
    expect(result.count).toBe(7);
  });

  test("應該僅刪除未開始的比賽", async () => {
    const deletedCount = await deleteUnstartedMatchesByCategory(
      tournamentId,
      categoryId
    );
    expect(deletedCount).toBe(9);
  });

  test("有比賽已開始時應該拋出錯誤", async () => {
    await expect(
      regenerateSchedule(tournamentId, category, participants, format, courts)
    ).rejects.toThrow("已開始或已完成");
  });
});
```

### 整合測試

1. **測試場景 A**：所有比賽未開始

   - 調整種子位
   - 確認重新生成
   - 驗證比賽數量正確
   - 驗證配對符合新種子位

2. **測試場景 B**：有比賽已開始
   - 嘗試調整配對
   - 驗證顯示警告彈窗
   - 驗證無法執行重新生成

## 📚 相關文檔

- [選手配對調整功能（完整版）](./PLAYER_SEEDING_ADJUSTMENT.md)
- [賽制模板系統](./FORMATS_AND_RULES_IMPLEMENTATION.md)
- [賽程管理重構](./Documents/SCHEDULE_MANAGEMENT_REFACTOR.md)

---

**版本：** 1.0.0  
**更新日期：** 2024-12-23  
**開發者：** SportFlow Team  
**功能狀態：** 已完成並測試
