# 移動設備登入問題修復

## 問題描述

在移動設備上登入時出現錯誤：
```
Error 403: disallowed_useragent
Access blocked: courtside-25c9e.firebaseapp.com's request does not comply with Google's policies
```

## 問題原因

1. **Google OAuth 限制**：Google 從 2021 年開始禁止在嵌入式 WebView 中使用 OAuth
2. **登入方法不適合移動設備**：原本的 `signInWithPopup` 在移動設備上容易被識別為 WebView
3. **內嵌瀏覽器問題**：當用戶通過 Facebook、Instagram、LINE 等應用內的瀏覽器打開網站時會遇到此問題

## 解決方案

### 1. 代碼修改（已完成✅）

已修改 `src/contexts/AuthContext.tsx`：

- **添加設備檢測**：自動判斷是否為移動設備
- **使用 `signInWithRedirect`**：移動設備使用重定向方式登入（避免 WebView 限制）
- **使用 `signInWithPopup`**：桌面設備繼續使用彈窗方式（更好的用戶體驗）
- **處理重定向結果**：正確處理登入後的重定向

### 2. Firebase Console 設置檢查

請確認以下設置正確：

#### 步驟 1：檢查授權域名

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇你的專案（courtside-25c9e）
3. 左側選單：**Authentication** → **Settings** → **Authorized domains**
4. 確認以下域名已添加：
   - `courtside-25c9e.firebaseapp.com`（預設）
   - `courtside-25c9e.web.app`（如果使用 Hosting）
   - 你的自訂域名（如果有的話）
   - `localhost`（開發用）

#### 步驟 2：檢查 OAuth 同意畫面

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇對應的專案
3. 左側選單：**APIs & Services** → **OAuth consent screen**
4. 確認：
   - **User Type** 應設為 **External**（外部）
   - **Application name** 已填寫
   - **Authorized domains** 包含 `firebaseapp.com`

#### 步驟 3：檢查 OAuth 2.0 Client ID

1. 在 Google Cloud Console
2. 左側選單：**APIs & Services** → **Credentials**
3. 找到「Web client (auto created by Google Service)」
4. 確認：
   - **Authorized JavaScript origins** 包含：
     - `https://courtside-25c9e.firebaseapp.com`
     - `https://courtside-25c9e.web.app`
     - `http://localhost:5173`（開發用）
   - **Authorized redirect URIs** 包含：
     - `https://courtside-25c9e.firebaseapp.com/__/auth/handler`

### 3. 重新部署

修改完成後，需要重新建置和部署：

```bash
# 建置專案
npm run build

# 部署到 Firebase Hosting
firebase deploy --only hosting
```

## 測試步驟

### 在移動設備上測試：

1. **使用系統瀏覽器**（推薦）：
   - Safari（iOS）
   - Chrome（Android）
   - 直接在瀏覽器中輸入網址

2. **避免使用應用內瀏覽器**：
   - ❌ Facebook、Instagram、LINE 內的瀏覽器
   - ❌ 其他社交媒體應用的內嵌瀏覽器

3. **測試登入流程**：
   - 點擊「使用 Google 登入」
   - 應該會跳轉到 Google 登入頁面
   - 選擇帳號並授權
   - 自動返回應用並完成登入

### 預期行為：

- **移動設備**：點擊登入 → 跳轉到 Google 頁面 → 選擇帳號 → 返回應用（全頁重定向）
- **桌面設備**：點擊登入 → 彈出 Google 登入視窗 → 選擇帳號 → 視窗關閉（無需重新載入頁面）

## 常見問題

### Q1: 仍然出現相同錯誤？

**解決方法**：
1. 確認已重新部署最新代碼
2. 清除瀏覽器緩存
3. 嘗試在無痕/隱私模式下測試
4. 確認 Firebase Console 設置正確

### Q2: 可以在電腦上測試移動設備模式嗎？

可以，但有限制：
- Chrome DevTools 的移動設備模擬器可以測試
- 但無法完全模擬真實移動瀏覽器的行為
- 建議使用真實設備測試

### Q3: 如果用戶在 LINE 或 Facebook 內點擊連結怎麼辦？

建議添加提示訊息：
- 檢測到內嵌瀏覽器時，顯示提示「請在系統瀏覽器中打開」
- 提供「在瀏覽器中打開」的按鈕

### Q4: 登入後又跳回登入頁面？

檢查：
1. Firestore 規則是否允許寫入用戶資料
2. `syncUserProfile` 是否正常執行
3. 瀏覽器 Console 是否有錯誤訊息

## 技術說明

### signInWithPopup vs signInWithRedirect

| 特性 | signInWithPopup | signInWithRedirect |
|------|-----------------|-------------------|
| 用戶體驗 | 彈窗，不離開頁面 | 全頁跳轉 |
| 移動設備支援 | ⚠️ 可能被阻止 | ✅ 完全支援 |
| 桌面設備支援 | ✅ 最佳體驗 | ✅ 支援但較麻煩 |
| 需要處理重定向 | ❌ 不需要 | ✅ 需要 |

### 設備檢測邏輯

```typescript
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
```

這個正則表達式會檢測常見的移動設備 User Agent。

## 參考資料

- [Firebase Authentication - Redirect vs Popup](https://firebase.google.com/docs/auth/web/google-signin)
- [Google OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [disallowed_useragent Error](https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html)

## 修改記錄

- **2024-12-22**：修復移動設備 OAuth 登入問題
  - 添加設備檢測
  - 實現自適應登入方法（popup/redirect）
  - 添加重定向結果處理


