> **過去の作業指示（アーカイブ）— 再利用しないこと**
> 2026-03 以前に Claude Code へ渡した単発の指示書。機能は `TestRangeProblems.jsx` として実装済みだが、現在のコードとは異なる点がある:
> - `TestScoreView` の props は `userId` ではなく `user`
> - `showRangeProblems` は表示中のテストデータではなく true / false
>
> 同様の作業をするときは、この文書を貼り付けず、現在のコードを前提に指示を書き直すこと。

# タスク: テスト範囲の間違い問題まとめ表示

テスト詳細画面に「この範囲の間違い問題を見る」ボタンを追加し、テスト範囲に含まれるテキストの間違い問題を画像付きで一括表示する機能を実装する。

## 背景

テスト画面には既に sapixRange（例: { 算数: ['41B-01', ..., '41B-05'] }）が登録されている。テキスト画面ではPDFから問題を切り出して problems コレクションに保存している。しかし、テスト範囲を横断して「この範囲で間違えた問題だけまとめて見せる」機能がない。

## データの接続

```
テスト.sapixRange = { 算数: ['41B-01', '41B-02', ...] }
    ↓ テキストコードで突き合わせ
sapixTexts[].textNumber = '41B-01' → sapixTexts[].id = '1740830400000'
    ↓ sourceIdで突き合わせ
problems[].sourceId = '1740830400000' → 問題クリップ（imageUrls, problemNumber 等）
```

重要: sapixTexts の id は Date.now().toString() であり、textNumber にテキストコード（'41B-01'等）が入っている。problems の sourceId には sapixTexts.id が入っている。

## 実装内容

### 1. 新規コンポーネント: src/components/TestRangeProblems.jsx + .css

Props:
```javascript
{
  userId: string,
  sapixRange: { [subject]: string[] },  // テスト範囲のテキストコード
  testName: string,                      // テスト名（表示用）
  sapixTexts: array,                     // App.jsx で subscribe 済みの全テキスト
  onClose: function,                     // 閉じる
  onResolveProblem: function,            // (problemId) => void  解き直し完了
}
```

ロジック:
1. sapixRange の各テキストコード → sapixTexts で textNumber が一致するものを探す → text.id を取得
2. 各 text.id を sourceId として `getProblemsBySource(userId, 'textbook', textId)` で問題を取得
3. `!isCorrect` の問題だけフィルタ
4. 教科別 → テキストコード順にグループ化して表示

表示:
- 教科ヘッダー（🔢算数 8問）
- テキストごとにグループ（41B-01 大きな数）
  - 各問題: 問題番号 + 画像（imageUrls[0] があれば表示）+ [✅できた] ボタン
- reviewStatus === 'done' の問題は「解き直し済み」セクションに折り畳み
- 問題がなければ「この範囲の間違い問題はありません 🎉」
- モーダルまたはオーバーレイとして表示（onClose で閉じる）

画像表示:
```jsx
{problem.imageUrls?.length > 0 && (
  <img 
    src={problem.imageUrls[0]} 
    alt={problem.problemNumber}
    className="range-problem-image"
    onClick={() => {/* 拡大表示 */}}
  />
)}
```

### 2. src/components/TestScoreView.jsx の変更

テスト詳細の中（SapixRangeDisplay の近く）にボタンを追加:

```jsx
{score.sapixRange && Object.values(score.sapixRange).some(c => c?.length > 0) && (
  <button 
    className="test-range-problems-btn"
    onClick={() => dispatch({ type: 'SET_FIELD', field: 'showRangeProblems', value: score })}
  >
    📝 この範囲の間違い問題を見る
  </button>
)}
```

reducerのstateに追加:
```javascript
showRangeProblems: null,  // 表示中のテストスコア or null
```

TestRangeProblems コンポーネントを条件付きレンダリング:
```jsx
{state.showRangeProblems && (
  <TestRangeProblems
    userId={user.uid}
    sapixRange={state.showRangeProblems.sapixRange}
    testName={state.showRangeProblems.testName}
    sapixTexts={sapixTexts}
    onClose={() => dispatch({ type: 'SET_FIELD', field: 'showRangeProblems', value: null })}
    onResolveProblem={async (problemId) => {
      await updateProblem(user.uid, problemId, { reviewStatus: 'done' })
    }}
  />
)}
```

必要なimport追加:
```javascript
import TestRangeProblems from './TestRangeProblems'
import { updateProblem } from '../utils/problems'
```

sapixTexts は TestScoreView の props として渡す必要がある（App.jsx から）。既に App.jsx で subscribeSapixTexts しているので、TestScoreView の呼び出しに sapixTexts を追加:

App.jsx:
```jsx
<TestScoreView 
  userId={user.uid} 
  sapixTexts={sapixTexts}  // ★追加
/>
```

### 3. 利用する既存関数（変更不要）

- `getProblemsBySource(userId, 'textbook', sourceId)` from problems.js
- `updateProblem(userId, problemId, { reviewStatus: 'done' })` from problems.js
- `lookupSapixSchedule(code)` from sapixSchedule.js（テキスト名の取得に使える）

## CSS方針

- モーダルオーバーレイ（背景暗転、中央にカード）
- 問題画像は幅100%で表示（横スクロールなし）
- 「✅できた」ボタンは緑系（既存の pending-resolve-btn と同様）
- 解き直し済みセクションは opacity: 0.5 + 折り畳み
- モバイル対応必須（スマホで子供に見せる用途）

## 注意

- Firestoreスキーマ変更なし
- problems.js, sapixTexts.js は変更不要
- テスト範囲が未設定のテストではボタンを非表示にする
- テキストが登録されていない（textNumber に一致するものがない）場合はスキップ
- 問題クリップがゼロの場合は「間違い問題はありません」を表示
