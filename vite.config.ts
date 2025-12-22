import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 啟用網絡訪問
    port: 5173, // 指定端口
    open: false, // 不自動打開瀏覽器
  },
})
