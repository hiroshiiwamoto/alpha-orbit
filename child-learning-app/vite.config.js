import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/alpha-orbit/',
  build: {
    // CSS はチャンク分割しない（1ファイルに統合して初回にロード）。
    // コンポーネント間で CSS クラスを借用している箇所があり
    // （例: SapixTextView が PastPaperView.css の add-form-* を使用）、
    // CSS を遅延チャンクに分割するとタブの訪問順によってスタイルが
    // 欠落するため。CSS 全体は gzip 約30KB と小さく分割の利点も薄い。
    cssCodeSplit: false,
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
