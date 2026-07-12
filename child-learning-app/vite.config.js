import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/alpha-orbit/',
  build: {
    rollupOptions: {
      output: {
        // 大きな vendor を分離してキャッシュ効率を上げる。
        // アプリコードの変更時に firebase / pdfjs の再ダウンロードを避ける。
        manualChunks: {
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
          ],
          pdfjs: ['pdfjs-dist'],
        },
      },
    },
  },
})
