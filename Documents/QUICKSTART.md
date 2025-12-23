# SportFlow 快速啟動指南

## 📝 開發前準備

### 1. 建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案（或選擇現有專案）
3. 啟用以下服務：
   - Authentication（Google 登入）
   - Firestore Database
   - Storage
   - Functions
   - Hosting

### 2. 取得 Firebase 配置

在 Firebase Console：

1. 專案設定 → 一般
2. 在「您的應用程式」區域選擇 Web 應用程式
3. 複製 firebaseConfig 物件的值

### 3. 設定本地環境

建立 `.env` 檔案：

```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 🚀 本地開發

### 安裝依賴

```bash
# 前端
npm install

# Firebase Functions
cd functions
npm install
cd ..
```

### 啟動開發伺服器

```bash
# 僅前端（推薦開發時使用）
npm run dev

# 前端 + Functions 模擬器
npm run dev & cd functions && npm run serve
```

### 測試賬號流程

1. 使用 Google 帳號登入
2. 在個人檔案切換到「主辦方」角色
3. 建立測試賽事
4. 切換到「一般用戶」角色報名
5. 切換回「主辦方」確認報名並抽籤
6. 發布賽程
7. 切換到「紀錄員」角色查看任務（需先被邀請）

## 📧 設定 Email 通知

### Gmail SMTP 設定

1. 啟用 Gmail 的「兩步驟驗證」
2. 產生「應用程式密碼」
3. 設定 Firebase Functions 環境變數：

```bash
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"
firebase functions:config:set app.url="http://localhost:5173"
```

### 測試 Email

部署 Functions 後，執行以下操作會觸發 Email：

- 主辦方確認選手報名
- 主辦方發布賽程
- 主辦方邀請工作人員

## 🔥 部署到 Firebase

### 首次部署

```bash
# 1. 登入 Firebase
firebase login

# 2. 初始化（已完成可跳過）
firebase init

# 3. 更新 .firebaserc 中的專案 ID
# 將 "your-project-id" 替換為您的專案 ID

# 4. 建置與部署
npm run build
firebase deploy
```

### 後續部署

```bash
# 完整部署
npm run build && firebase deploy

# 僅部署前端
npm run build && firebase deploy --only hosting

# 僅部署 Functions
firebase deploy --only functions

# 僅部署 Rules
firebase deploy --only firestore:rules,storage
```

## 🐛 常見問題

### Q: Firebase 初始化失敗

**A:** 檢查 `.env` 檔案是否正確設定，確保所有 `VITE_FIREBASE_*` 變數都有值。

### Q: Email 沒有發送

**A:**

1. 確認 Functions 環境變數已設定：`firebase functions:config:get`
2. 檢查 Functions 日誌：`firebase functions:log`
3. 確認 Gmail 應用程式密碼正確

### Q: 圖片上傳失敗

**A:**

1. 確認 Storage Rules 已部署
2. 檢查檔案大小是否超過 5MB
3. 確認檔案格式為圖片

### Q: 路由 404 錯誤

**A:**

1. 確認 `firebase.json` 的 rewrites 設定正確
2. 重新部署：`firebase deploy --only hosting`

### Q: Firestore 權限錯誤

**A:**

1. 檢查 `firestore.rules` 是否已部署
2. 確認用戶已登入
3. 確認用戶角色正確

## 📊 專案統計

- **總代碼檔案**：45+
- **服務層**：6 個
- **UI 組件**：15+ 個
- **頁面**：15+ 個
- **路由**：20+ 個

## 🎯 下一步

1.  完成基本設定
2.  測試三種角色流程
3.  🔄 自訂 UI 設計
4.  🔄 新增更多運動項目
5.  🔄 整合第三方支付
6.  🔄 新增推播通知

## 📚 相關文檔

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

有問題？歡迎提交 Issue！
