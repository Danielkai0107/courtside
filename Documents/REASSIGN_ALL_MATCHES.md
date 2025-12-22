# 重新分配場地包含所有場次

## ✅ 修復確認

### 重新分配按鈕的作用範圍

**修改前**：
```typescript
// 只重新分配有選手的比賽
const matchesNeedingCourts = allMatches.filter(m =>
  (m.status === "PENDING_COURT" || m.status === "SCHEDULED") &&
  m.player1Id !== null &&
  m.player2Id !== null  // ← 限制條件
);

結果：
  第二輪（選手還沒確定）→ 不會重新分配 ❌
```

**修改後**：
```typescript
// 重新分配所有未開始的比賽
const matchesNeedingCourts = allMatches.filter(m =>
  m.status === "PENDING_COURT" ||
  m.status === "PENDING_PLAYER" ||  // ← 包含等待晉級的
  m.status === "SCHEDULED"
);

結果：
  所有未開始的比賽 → 全部重新分配 ✅
```

## 🎯 完整的場地分配邏輯

### 發布賽程時（初始分配）

```
發布賽程
  ↓
生成所有比賽：
  R16: 8 場（選手已確定）
  QF: 4 場（選手待定）
  SF: 2 場（選手待定）
  FI: 1 場（選手待定）

分配所有場地：
  R16 Match 1-8 → Court 01, 02, 03...✅
  QF Match 1-4 → Court 01, 02, 03, 01 ✅
  SF Match 1-2 → Court 01 ✅
  FI Match 1 → Court 01 ✅

→ 所有比賽都有場地，即使選手還沒確定！
```

### 重新分配時（手動觸發）

```
主辦方點擊「🔄 重新分配場地」
  ↓
重新分配範圍：
  ✅ PENDING_COURT（等待場地）
  ✅ PENDING_PLAYER（等待選手）← 也會重新分配
  ✅ SCHEDULED（已排程但未開始）
  ❌ IN_PROGRESS（進行中）← 不影響
  ❌ COMPLETED（已完成）← 不影響

結果：
  所有未開始的比賽 → 重新分配場地
  使用智能策略（小組固定 + 決賽主場地）
```

## 📊 實際案例

### 案例：新增場地後重新分配

```
初始：2 個場地
發布賽程：
  R16（8 場）→ Court 01, 02, 01, 02...
  QF（4 場）→ Court 01, 02, 01, 02
  SF（2 場）→ Court 01, 01
  FI（1 場）→ Court 01

新增：Court 03, 04
點擊「重新分配」：
  R16（8 場）→ Court 01, 02, 03, 04, 01...✅
  QF（4 場）→ Court 01, 02, 03, 04 ✅
  SF（2 場）→ Court 01, 01（主場地）✅
  FI（1 場）→ Court 01（主場地）✅

→ 所有輪次都重新分配，更均勻利用場地
```

### 案例：第一輪完成後

```
第一輪已完成：
  - R16 全部 COMPLETED
  - 選手已晉級到 QF

點擊「重新分配」：
  ✅ QF（4 場）→ 重新分配
  ✅ SF（2 場）→ 重新分配
  ✅ FI（1 場）→ 重新分配
  ❌ R16（8 場）→ 跳過（已完成）

→ 只影響未開始的比賽
```

## 🎊 完成

**重新分配按鈕作用於所有未開始的場次！**

- ✅ 包含 PENDING_PLAYER（等待晉級）
- ✅ 包含 PENDING_COURT（等待場地）
- ✅ 包含 SCHEDULED（已排程）
- ✅ 不影響 IN_PROGRESS（進行中）
- ✅ 不影響 COMPLETED（已完成）
- ✅ 使用智能分配策略

**場地管理功能完整且智能！** 🏟️✅

---

## 🎯 總結

### 發布賽程時
→ 所有輪次都分配場地 ✅

### 重新分配時
→ 所有未開始的比賽都重新分配 ✅

### 智能策略
→ 小組固定 + 決賽主場地 ✅

**完全符合您的需求！** 🎉

---

**修改日期**: 2024年12月21日  
**狀態**: ✅ 已完成並部署  
**URL**: https://courtside-25c9e.web.app

