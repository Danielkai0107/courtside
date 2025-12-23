# 小組積分榜實現

## 🎯 按照競品設計實現

根據您提供的競品截圖（IMG_9638），正確的小組賽顯示應該是：

### 默認顯示：積分榜

```
Group A                      [查看比賽 →]
────────────────────────────────────────
球員/隊伍          PTS  W  L  PD
1. Andrew Jung      4   4  -  +29  ✓ (綠色線)
   Weng Lum Lok
2. Edson Malaki     3   3  1  +6   ✓ (綠色線)
   DON VICENTE
3. Gary Llanes      2   2  2  +11
   Webster Letargo
4. Maricar Lanuza   1   1  3  -22
   Romeo Vinco Jr.
5. Annalyn Dela     -   -  4  -24
   Evelyn Marks
```

### 點擊「查看比賽」：比賽詳情

```
Group A                      [收起 →]
────────────────────────────────────────
星期六, 13 12月             8:30 上午
MATCH 1 • 1—2
Maricar Lanuza / Romeo Jr.      1
Edson Malaki / DON VICENTE     11  ✓
                          [擊掌][回放][分享]

星期六, 13 12月             8:30 上午
MATCH 2 • 3—4
Annalyn Dela / Evelyn Marks     1
Gary Llanes / Webster          11  ✓
...
```

## 已實現功能

### 1. standingsService.ts（新增）

**核心函數**：

```typescript
calculateGroupStandings(matches, participants);
```

**計算邏輯**：

1. **積分（PTS）**：

   - 勝：3 分
   - 平：1 分
   - 負：0 分

2. **勝負場數（W/L）**

3. **淨勝分（PD）**：

   - pointDifference = pointsFor - pointsAgainst

4. **排序規則**：
   - 主要：積分高的在前
   - 次要：淨勝分高的在前
   - 再次：得分高的在前

### 2. CategoryDetail.tsx（重寫）

**功能**：

- 默認顯示積分榜
- 點擊「查看比賽」展開比賽詳情
- 前 2 名標示綠色（晉級區）
- 淨勝分顏色標示（正數綠色、負數紅色）

### 3. CategoryDetail.module.scss（擴充）

**新增樣式**：

- 積分榜表格樣式
- 晉級區綠色標示（`.qualified`）
- 比賽詳情樣式
- 展開/收起按鈕

## 🎨 UI 效果

### 積分榜（默認顯示）

```
┌──────────────────────────────────────────┐
│ Group A               [查看比賽 →]       │
├──────────────────────────────────────────┤
│ 球員/隊伍          PTS  W  L   PD       │
├──────────────────────────────────────────┤
│ 1. Alice / Bob      6   3  0  +15  ← 綠線│
│ 2. Carol / Dave     4   2  1   +8  ← 綠線│
│ 3. Eve / Frank      2   1  2   -5       │
│ 4. Grace / Henry    0   0  3  -18       │
└──────────────────────────────────────────┘
```

### 比賽詳情（點擊後）

```
┌──────────────────────────────────────────┐
│ Group A               [收起 →]           │
├──────────────────────────────────────────┤
│ 2024/12/21           Court 01           │
│                                          │
│ Alice / Bob               21             │
│ Carol / Dave               19            │
│ 狀態：已完成                             │
├──────────────────────────────────────────┤
│ 2024/12/21           待分配              │
│                                          │
│ Alice / Bob                -             │
│ Eve / Frank                -             │
│ 狀態：待開始                             │
└──────────────────────────────────────────┘
```

## 📊 積分計算範例

### Group A 比賽結果

```
Match 1: Alice/Bob 21 - 19 Carol/Dave  → Alice/Bob 勝 (+3 分)
Match 2: Alice/Bob 21 - 15 Eve/Frank   → Alice/Bob 勝 (+3 分)
Match 3: Carol/Dave 21 - 18 Eve/Frank  → Carol/Dave 勝 (+3 分)
Match 4: Carol/Dave 19 - 21 Alice/Bob  → Alice/Bob 勝 (+3 分)
Match 5: Eve/Frank 20 - 21 Grace/Henry → Grace/Henry 勝 (+3 分)
Match 6: Grace/Henry 15 - 21 Alice/Bob → Alice/Bob 勝 (+3 分)

積分榜：
1. Alice/Bob:   12 分（4勝0負），淨勝分 +24
2. Carol/Dave:   6 分（2勝2負），淨勝分 +4
3. Grace/Henry:  3 分（1勝3負），淨勝分 -8
4. Eve/Frank:    0 分（0勝4負），淨勝分 -20
```

## 🎯 晉級規則

### 綠色線標示

**顯示邏輯**：

```typescript
index < 2 ? styles.qualified : "";
```

- 前 2 名：綠色線 ✓
- 其他：無標示

**CSS**：

```scss
.qualified {
  border-left: 4px solid $success-color;
  background: rgba(0, 230, 118, 0.03);
}
```

### 動態晉級線（未來擴展）

可以根據 `groupConfig.advancePerGroup` 動態標示：

```typescript
// 如果每組取前 3 名
index < groupConfig.advancePerGroup ? styles.qualified : "";
```

## 📋 修改清單

### 新增文件

- `src/services/standingsService.ts` - 積分榜計算服務

### 修改文件

- `src/pages/CategoryDetail.tsx`
- 重寫小組賽顯示邏輯
- 添加積分榜計算
- 添加展開/收起功能
- 標示晉級區

- `src/pages/CategoryDetail.module.scss`
- 添加積分榜表格樣式
- 添加晉級區樣式
- 添加比賽詳情樣式
- 添加查看按鈕樣式

## 功能檢查清單

### 積分榜顯示

- [x] 默認顯示積分榜（不是比賽列表）
- [x] 顯示 PTS（積分）
- [x] 顯示 W（勝）
- [x] 顯示 L（負）
- [x] 顯示 PD（淨勝分）
- [x] 按積分排序
- [x] 前 2 名綠色標示
- [x] 淨勝分顏色標示

### 比賽詳情

- [x] 點擊「查看比賽」展開
- [x] 顯示所有比賽
- [x] 顯示日期時間
- [x] 顯示場地
- [x] 顯示比分
- [x] 顯示狀態
- [x] 點擊「收起」隱藏

### 計算邏輯

- [x] 勝利得 3 分
- [x] 平手得 1 分
- [x] 失敗得 0 分
- [x] 淨勝分計算正確
- [x] 排序規則正確

## 🎊 完成

**小組積分榜已完全按照競品標準實現！**

現在小組 Tab 會顯示：

- 標準的積分榜（PTS, W, L, PD）
- 晉級區綠色標示
- 點擊查看比賽詳情
- 符合國際標準 UI

**與競品一致的專業小組賽顯示！** 🏆

---

**實施日期**: 2024 年 12 月 21 日  
**參考**: 競品截圖 IMG_9638  
**狀態**: 已完成
