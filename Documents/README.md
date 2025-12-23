# SportFlow - 全民賽事管理系統

一個專為台灣業餘球類賽事（羽球、籃球、排球）設計的 Mobile Web App，讓人人都能輕鬆成為賽事主辦。

## 🌟 主要功能

### 三種角色系統

- **一般用戶**：瀏覽賽事、報名比賽、查看即時比分
- **主辦方**：建立賽事、管理報名、自動抽籤排程
- **紀錄員**：操作計分板、即時文字直播

### 核心特色

- 自動抽籤演算法（循環賽/淘汰賽）
- 即時比分同步（Firestore Real-time）
- 影子帳號綁定機制
- Email 通知系統
- 響應式設計（Mobile First）
- 橘色主題 UI（參考設計規範）

## 🚀 快速開始

### 環境需求

- Node.js 18+
- npm 或 yarn
- Firebase 專案

### 安裝步驟

1. **Clone 專案**

```bash
git clone <repository-url>
cd sportflow
```

2. **安裝依賴**

```bash
# 安裝前端依賴
npm install

# 安裝 Firebase Functions 依賴
cd functions
npm install
cd ..
```

3. **設定環境變數**

建立 `.env` 檔案並填入您的 Firebase 配置：

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. **Firebase 設定**

在 Firebase Console 建立專案後：

```bash
# 登入 Firebase
firebase login

# 初始化專案（選擇 Hosting, Firestore, Functions, Storage）
firebase init

# 設定 Functions 環境變數
firebase functions:config:set email.user="your_email@gmail.com"
firebase functions:config:set email.password="your_app_password"
firebase functions:config:set app.url="https://yourdomain.com"
```

5. **啟動開發伺服器**

```bash
npm run dev
```

專案將在 `http://localhost:5173` 啟動。

## 📦 部署

### 建置與部署到 Firebase Hosting

```bash
# 建置專案
npm run build

# 部署所有服務（Hosting + Functions + Rules）
firebase deploy

# 僅部署 Hosting
firebase deploy --only hosting

# 僅部署 Functions
firebase deploy --only functions

# 僅部署 Firestore Rules
firebase deploy --only firestore:rules

# 僅部署 Storage Rules
firebase deploy --only storage
```

## 🏗️ 專案結構

```
sportflow/
├── src/
│   ├── components/
│   │   ├── common/          # 通用 UI 組件
│   │   ├── features/        # 功能性組件
│   │   ├── guards/          # 路由守衛
│   │   └── layout/          # 佈局組件
│   ├── contexts/            # React Context
│   ├── pages/               # 頁面組件
│   │   ├── organizer/       # 主辦方頁面
│   │   └── scorer/          # 紀錄員頁面
│   ├── services/            # Firebase 服務層
│   ├── styles/              # 全域樣式與變數
│   └── types/               # TypeScript 類型定義
├── functions/               # Firebase Cloud Functions
│   └── src/
│       ├── index.ts         # Functions 入口
│       └── notifications/   # Email 通知服務
├── firestore.rules          # Firestore 安全規則
├── storage.rules            # Storage 安全規則
└── firebase.json            # Firebase 配置
```

## 🎨 UI 設計規範

本專案採用橘色主題設計語言：

- **主色調**：#FF6B00
- **大型操作按鈕**：固定底部、橘色漸層、56px 高
- **卡片式選項**：選中時橘色邊框、價格/數值顯示
- **步驟指示器**：橘色表示進度
- **Mobile First**：完全響應式設計

## 📱 功能說明

### 一般用戶

1. 瀏覽首頁 Live Feed（即時比賽）
2. 探索並報名賽事
3. 查看我的比賽（即將到來/歷史紀錄）
4. 觀看即時比分與 Timeline

### 主辦方

1. 建立賽事（4 步驟表單）
2. 管理選手報名與審核
3. 手動新增選手（影子帳號）
4. 邀請工作人員
5. 自動抽籤排程
6. 發布賽程

### 紀錄員

1. 查看被指派的場次
2. 操作計分板（大型得分按鈕）
3. 復原功能
4. 結束比賽

## 🔒 安全性

- Firestore Security Rules 保護資料存取
- Storage Rules 限制上傳權限
- 路由守衛驗證用戶權限
- 角色基礎存取控制（RBAC）

## 📧 Email 通知

系統會在以下情況自動發送通知：

1. 選手報名被確認
2. 賽程發布
3. 工作人員邀請

需要在 Firebase Functions 設定 Email 憑證（使用 Gmail SMTP 或其他服務）。

## 🛠️ 技術棧

- **前端**：React 19, TypeScript, Vite
- **樣式**：SCSS Modules, Custom Design System
- **後端**：Firebase (Auth, Firestore, Storage, Functions, Hosting)
- **路由**：React Router v7
- **圖示**：Lucide React
- **Email**：Nodemailer

## 🐛 疑難排解

### Firebase 初始化錯誤

確保 `.env` 檔案已正確設定所有 Firebase 配置。

### Email 通知無法發送

檢查 Firebase Functions 環境變數是否已設定：

```bash
firebase functions:config:get
```

### 圖片上傳失敗

確認 Storage Rules 已部署：

```bash
firebase deploy --only storage
```

## 📄 授權

MIT License

## 🤝 貢獻

歡迎提交 Issue 與 Pull Request！

---

**Built with ❤️ for Taiwan's Amateur Sports Community**
