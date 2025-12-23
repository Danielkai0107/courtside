# 選手配對調整功能

## 📋 功能概述

主辦方可以在**賽程發布前**或**賽程發布後**調整選手的種子順序，以改變對戰配對或分組。這個功能完全解耦於對戰算法和晉級流向，僅影響參賽者的初始排序。

### 🆕 發布後調整（新增）
- ✅ 支援發布後重新調整配對
- ✅ 自動檢測已開始的比賽
- ✅ 僅刪除未開始的比賽並重新生成
- ✅ 保護已進行和已完成的比賽

## ✨ 主要特性

### 1. **智能預覽系統**
根據選擇的賽制模板自動顯示相應的配對預覽：

- **淘汰賽模式**：顯示第一輪對戰配對
- **小組賽模式**：顯示各組分組情況
- **循環賽模式**：顯示種子序列（影響對戰順序）

### 2. **直覺式交換機制**
- 每個選手名字都是下拉選單
- 選擇其他選手後，兩者位置自動互換
- 即時更新配對預覽

### 3. **完全解耦設計**
- 不影響對戰算法
- 不影響晉級流向
- 不影響積分計算
- 僅調整參賽者的初始順序

### 4. **操作便利性**
- 一鍵重置：恢復原始順序
- 即時保存：調整立即生效
- 視覺反饋：清楚顯示種子位

## 🎯 使用場景

### 避免不理想的配對
- 同隊選手避免第一輪相遇
- 地主選手分散到不同組別
- 種子選手合理分布

### 賽事平衡
- 根據選手實力調整種子位
- 避免某一邊對戰組過強或過弱
- 確保賽事觀賞性

## 📁 文件結構

```
src/components/features/
├── PlayerSeedingModal.tsx              # 配對調整彈窗組件
├── PlayerSeedingModal.module.scss      # 彈窗樣式
├── CategoryPublisher.tsx               # 發布前：整合配對調整按鈕
├── CategoryPublisher.module.scss       # 更新操作區樣式
├── CategoryScheduleManager.tsx         # 發布後：整合重新生成功能
└── CategoryScheduleManager.module.scss # 警告彈窗樣式

src/services/
└── scheduleRegenerationService.ts      # 賽程重新生成服務

文檔/
└── STAGE_TYPE_EXPLANATION.md           # 賽制階段類型說明（重要！）
```

## ⚠️ 重要提醒：賽制類型區分

系統中有兩個相似但不同的階段類型：

1. **`FormatStage.type`**（模板階段）：使用 `"group_stage"`
2. **`Match.stage`**（比賽階段）：使用 `"group"`

在代碼中需要正確映射：
```typescript
// 讀取模板時
const hasGroupStage = stages.some(s => s.type === "group_stage");

// 生成比賽時
const match = { stage: "group", ... };

// 內部狀態映射
if (hasGroupStage) {
  setFormatType("group");  // 映射為 "group"
}
```

詳細說明請參考：[STAGE_TYPE_EXPLANATION.md](./STAGE_TYPE_EXPLANATION.md)

## 🔧 技術實現

### 1. PlayerSeedingModal 組件

**主要功能：**
- 接收參賽者列表和賽制模板
- 根據賽制類型顯示不同預覽
- 實現選手交換邏輯
- 保存調整後的順序

**Props：**
```typescript
interface PlayerSeedingModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Array<{ id: string; name: string }>;
  selectedFormat: FormatTemplate | null;
  onSave: (reorderedParticipants: Array<{ id: string; name: string }>) => void;
  matchType: "singles" | "doubles";
}
```

### 2. 賽制預覽邏輯

#### 淘汰賽預覽
```typescript
// 計算第一輪對戰配對
const pairCount = Math.floor(orderedParticipants.length / 2);
for (let i = 0; i < pairCount; i++) {
  pairs.push([i, orderedParticipants.length - 1 - i]);
}
```

#### 小組賽預覽
```typescript
// 計算分組（蛇形分配）
const groups: number[][] = Array.from({ length: totalGroups }, () => []);
orderedParticipants.forEach((_, index) => {
  const groupIndex = index % totalGroups;
  groups[groupIndex].push(index);
});
```

#### 循環賽預覽
```typescript
// 顯示完整種子序列
orderedParticipants.map((participant, index) => ({
  seed: index + 1,
  name: participant.name
}))
```

### 3. 交換機制

```typescript
const handleSwap = (index1: number, index2: number) => {
  if (index1 === index2) return;
  
  const newOrder = [...orderedParticipants];
  [newOrder[index1], newOrder[index2]] = [newOrder[index2], newOrder[index1]];
  setOrderedParticipants(newOrder);
};
```

### 4. CategoryPublisher 整合

```typescript
// 維護調整後的參賽者順序
const [adjustedParticipants, setAdjustedParticipants] = useState(participants);

// 發布時使用調整後的順序
await generateKnockoutOnly(
  tournamentId,
  category.id,
  adjustedParticipants,  // 使用調整後的順序
  category.enableThirdPlaceMatch,
  courts
);
```

## 🎨 UI/UX 設計

### 視覺元素
- **種子標籤**：橙色標籤顯示種子位（#1, #2...）
- **對戰區塊**：VS 居中顯示，清楚表達對戰關係
- **分組卡片**：各組用不同卡片展示，標題顯示組別（A組、B組...）
- **提示信息**：藍色提示框說明功能不影響算法

### 交互設計
- **下拉選單**：Hover 時邊框變色（主題色）
- **即時反饋**：選擇後立即交換，無需額外確認
- **重置功能**：快速恢復到原始順序
- **響應式**：移動端自動調整為單列佈局

## 📱 響應式設計

### 桌面版（>768px）
- 對戰配對：兩列佈局（左選手 vs 右選手）
- 小組顯示：自動網格，每組最小 250px
- 種子列表：自動填充，每項最小 300px

### 移動版（≤768px）
- 對戰配對：單列佈局，VS 文字居中
- 小組顯示：單列顯示
- 種子列表：單列顯示
- 操作按鈕：全寬顯示，垂直排列

## 🚀 使用流程

### 1. 發布前調整（CategoryPublisher）

```
1. 進入賽程發布頁面
   └─ 選擇組別 → 進入 CategoryPublisher

2. 選擇賽制模板
   └─ 系統根據人數推薦模板

3. 【可選】調整選手配對
   └─ 點擊「⚙️ 選手配對調整」按鈕
   └─ 查看預覽（第一輪對戰/分組）
   └─ 通過下拉選單交換選手位置
   └─ 點擊「儲存調整」

4. 發布賽程
   └─ 點擊「發布賽程」按鈕
   └─ 系統使用調整後的選手順序生成對戰
```

### 2. 發布後調整（CategoryScheduleManager）

```
1. 進入賽程管理頁面
   └─ 選擇組別 → 查看已發布的賽程

2. 點擊「⚙️ 調整配對並重新生成」
   └─ 系統檢查是否有比賽已開始

3. 情況 A：所有比賽都未開始
   └─ 打開配對調整彈窗
   └─ 調整種子位並儲存
   └─ 確認重新生成
   └─ 系統刪除所有比賽並重新生成

4. 情況 B：有比賽已開始
   └─ 顯示警告彈窗
   └─ 提示無法重新生成
   └─ 建議使用「重新分配場地」功能
```

### 2. 按鈕狀態

| 狀態 | 條件 | 顯示 |
|------|------|------|
| 啟用 | 已選擇模板 & 參賽者 ≥ 2 | 正常可點擊 |
| 禁用 | 未選擇模板 或 參賽者 < 2 | 灰色不可點擊 |

## ⚡ 性能優化

### 1. 狀態管理
- 使用 `useState` 維護調整後的參賽者順序
- 僅在保存時更新父組件狀態
- 關閉彈窗不會丟失調整

### 2. 渲染優化
- 預覽列表使用 `key` 優化 React 渲染
- 下拉選單僅在必要時重新渲染
- CSS 使用 CSS Module 避免全局污染

### 3. 用戶體驗
- 交換操作即時反饋（無延遲）
- 重置操作快速響應
- 彈窗開啟時禁止背景滾動

## 🔐 數據安全

### 1. 數據驗證
- 檢查參賽者數量是否符合最小要求
- 驗證調整後的參賽者列表完整性
- 確保 ID 不重複、不遺漏

### 2. 操作限制
- 僅主辦方可見配對調整功能
- 發布後不可再調整（已解耦）
- 取消操作不影響原始數據

## 💡 最佳實踐

### 1. 種子位分配建議

**淘汰賽：**
- #1 種子 vs #最後一名
- #2 種子 vs #倒數第二名
- 強弱交錯配對

**小組賽：**
- 蛇形分配確保各組實力均衡
- 例：4組 → A-D-D-A-A-D-D-A...

**循環賽：**
- 高種子 vs 低種子優先安排
- 中段種子錯開時間

### 2. 實際應用場景

#### 場景1：避免同隊對決
```
原始順序：
#1 王小明（A隊）
#2 李大華（A隊）
...

調整後：
#1 王小明（A隊）
#2 張三（B隊）  ← 交換
...
```

#### 場景2：地主分散
```
原始：A組有3個地主
調整：每組最多1個地主
```

## 🔒 安全機制

### 1. 發布後重新生成的保護措施

#### 自動檢測已開始的比賽
```typescript
export async function hasStartedMatches(
  tournamentId: string,
  categoryId: string
): Promise<{ hasStarted: boolean; count: number }> {
  // 查詢 IN_PROGRESS 或 COMPLETED 狀態的比賽
  const q = query(
    matchesRef,
    where("tournamentId", "==", tournamentId),
    where("categoryId", "==", categoryId),
    where("status", "in", ["IN_PROGRESS", "COMPLETED"])
  );
  // ...
}
```

#### 僅刪除未開始的比賽
```typescript
export async function deleteUnstartedMatchesByCategory(
  tournamentId: string,
  categoryId: string
): Promise<number> {
  // 僅刪除 SCHEDULED 狀態的比賽
  const q = query(
    matchesRef,
    where("status", "==", "SCHEDULED")
  );
  // ...
}
```

### 2. 用戶確認流程

#### 警告彈窗（有比賽已開始）
- 顯示進行中和已完成的比賽數量
- 阻止重新生成操作
- 提供替代方案建議

#### 確認彈窗（所有比賽未開始）
- 明確告知將刪除的比賽數量
- 要求用戶二次確認
- 說明操作不可撤銷

## 🐛 已知限制

1. **僅影響初始配對**
   - 晉級後的對戰由系統算法決定
   - 無法預調整第二輪以後的配對

2. **發布後調整限制**
   - ⚠️ 有比賽已開始時無法重新生成
   - ✅ 可使用「重新分配場地」作為替代方案
   - 建議在比賽開始前完成配對調整

3. **移動端操作建議**
   - 下拉選單較多時可能需滾動
   - 建議橫屏操作以獲得更好體驗

## 🎓 開發者注意事項

### 擴展此功能時需注意：

1. **保持解耦**：不要將種子位邏輯與晉級算法耦合
2. **數據一致性**：確保調整後的參賽者列表完整
3. **向後兼容**：已發布的賽事不受影響
4. **測試覆蓋**：包含各種賽制的預覽測試

### 未來可能的增強：

- [x] 發布後調整支援（已完成）
- [x] 智能檢測已開始的比賽（已完成）
- [ ] 拖放排序（Drag & Drop）
- [ ] 批量交換（一次交換多對選手）
- [ ] 智能建議（根據實力評分自動推薦種子位）
- [ ] 歷史記錄（記錄調整歷程）
- [ ] 導出種子表（PDF/CSV）
- [ ] 部分重新生成（僅重新生成特定輪次）

## 📞 相關文檔

- [賽制模板系統](./FORMATS_AND_RULES_IMPLEMENTATION.md)
- [對戰生成服務](./Documents/BRACKET_DISPLAY_GUIDE.md)
- [賽程發布流程](./REGISTRATION_AND_PUBLISH_FLOW.md)

## 📊 使用統計與監控

### 賽程統計資訊
系統會即時追蹤每個分類的賽程狀態：

```typescript
interface ScheduleStats {
  total: number;       // 總比賽數
  scheduled: number;   // 未開始
  inProgress: number;  // 進行中
  completed: number;   // 已完成
}
```

### 日誌記錄
所有重新生成操作都會記錄：
- 刪除的比賽數量
- 使用的賽制模板
- 調整後的參賽者順序
- 操作時間和執行者

## 🎬 操作示例

### 示例 1：發布前調整（避免同隊對決）

**原始配對：**
```
第1場：王小明（A隊）vs 李大華（A隊）  ❌ 同隊對決
第2場：張三（B隊）vs 趙四（C隊）
```

**調整後：**
```
1. 點擊「選手配對調整」
2. 在第1場中，將李大華換成張三
3. 系統自動交換李大華和張三的種子位
4. 儲存並發布
```

**結果：**
```
第1場：王小明（A隊）vs 張三（B隊）  ✅ 不同隊
第2場：李大華（A隊）vs 趙四（C隊）
```

### 示例 2：發布後調整（所有比賽未開始）

**情況：** 發現種子位分配不理想，但還沒有比賽開始

**操作：**
```
1. 進入「賽程管理」
2. 點擊「調整配對並重新生成」
3. 系統檢查：0 場已開始 ✅
4. 打開配對調整彈窗
5. 調整種子位
6. 確認重新生成
7. 系統刪除 16 場未開始的比賽
8. 重新生成 16 場比賽
```

### 示例 3：發布後無法調整（有比賽已開始）

**情況：** 部分比賽已經開始

**系統反應：**
```
⚠️ 無法重新生成賽程

此分類有比賽已經開始或已完成，無法重新生成賽程。

進行中：2 場
已完成：5 場
未開始：9 場

💡 建議：
• 使用「重新分配場地」功能調整未開始的比賽場地
• 等待所有比賽完成後再重新生成賽程
```

---

**版本：** 2.0.0  
**更新日期：** 2024-12-23  
**開發者：** SportFlow Team  
**新增功能：** 發布後調整支援

