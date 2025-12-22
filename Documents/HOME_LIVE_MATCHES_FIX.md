# 首頁顯示邏輯修復

## ✅ 修復內容

### 1. 只顯示正在計分的比賽 ⭐

**修改後**：
```typescript
// 只顯示 IN_PROGRESS 狀態
const liveMatchesOnly = matches.filter(
  m => m.status === "IN_PROGRESS" || m.status === "live"
);
```

**效果**：
- ✅ 只顯示紀錄員已開始計分的比賽
- ❌ 不顯示 SCHEDULED（即將開始）
- ❌ 不顯示 COMPLETED（已完成）

### 2. 場地顯示名稱 ⭐

**修改前**：
```typescript
{match.courtId ? `場地 ${match.courtId}` : "未分配場地"}
// 顯示：場地 abc123xyz ❌
```

**修改後**：
```typescript
// 載入場地列表
const courtsData = await getCourts(tournament.id);

// Helper function
const getCourtName = (courtId) => {
  const court = courts.find(c => c.id === courtId);
  return court?.name || courtId;
};

// 使用
{getCourtName(match.courtId)}
// 顯示：Court 01 ✅
```

**效果**：
- ✅ Home.tsx 載入場地
- ✅ 傳遞給 TournamentMatchesCard
- ✅ 顯示場地名稱

## 🎨 首頁效果

### 有正在計分的比賽

```
🏠 賽事直播

┌─────────────────────────────┐
│ 錦標賽 test01       🔴 LIVE │
│ 12/27 • 台北體育館          │
├─────────────────────────────┤
│ ⏰ 8:30  Court 01  ← 顯示名稱│
│                             │
│ Alice/Bob        21         │
│ VS                          │
│ Carol/Dave       19         │
│ 🔴 進行中                   │
└─────────────────────────────┘
```

### 沒有正在計分的比賽

```
🏠 賽事直播

目前沒有正在計分的比賽
紀錄員開始比賽後會顯示在這裡
```

## 📊 何時會顯示

### 顯示條件

```
賽事狀態：
  ✅ REGISTRATION_CLOSED（已發布賽程）
  ✅ ONGOING（進行中）
  ✅ live / scheduled（舊狀態）

比賽狀態：
  ✅ IN_PROGRESS（正在計分）
  ✅ live（舊狀態）
  ❌ SCHEDULED（不顯示）
  ❌ COMPLETED（不顯示）
```

### 操作流程

```
主辦方：
1. 發布賽程
2. 賽事狀態可能是 REGISTRATION_CLOSED 或 ONGOING

紀錄員：
3. 進入計分頁面
4. 點擊「開始比賽」← 關鍵操作
5. 比賽狀態變為 IN_PROGRESS

選手/觀眾：
6. 首頁立即顯示這場比賽 ✅
7. 可以看到即時比分
```

## 📋 修改清單

### 修改文件（2 個）
- ✅ `src/pages/Home.tsx`
  - 只顯示 IN_PROGRESS 狀態
  - 載入場地列表
  - 傳遞場地給 TournamentMatchesCard
  - 更新空狀態提示

- ✅ `src/components/features/TournamentMatchesCard.tsx`
  - 接受 courts 參數
  - 添加 getCourtName helper
  - 顯示場地名稱

### 部署狀態
- ✅ 已構建
- ✅ 已部署
- ✅ https://courtside-25c9e.web.app

## 🎊 完成

**首頁顯示邏輯已修復！**

- ✅ 只顯示正在計分的比賽（IN_PROGRESS）
- ✅ 場地顯示名稱（Court 01）
- ✅ 提示文字清楚
- ✅ 符合用戶預期

**首頁功能正確！** 🏠✅

---

**修改日期**: 2024年12月21日  
**變更**: 首頁只顯示正在計分的比賽 + 場地顯示名稱  
**狀態**: ✅ 已完成並部署

