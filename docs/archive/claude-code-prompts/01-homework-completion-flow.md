> **過去の作業指示（アーカイブ）— 再利用しないこと**
> 2026-03 以前に Claude Code へ渡した単発の指示書（02 で書き直されている）。
> ここで作る「家庭学習の完了フロー」「解き直し待ち」は現在のコードに存在しない。
> 前提としている `getTextInfoFromClassDate`、`completeHomework`、`pendingProblems` もない。
> 同様の作業をするときは、この文書を貼り付けず、現在のコードを前提に指示を書き直すこと。

# タスク: 家庭学習の完了フロー改善

以下の仕様に沿って実装してください。

## 目的

「今日の家庭学習」のチェックボックスをタップしたとき、即完了ではなく「全部できた / 止まった問題があった」の選択肢を挟む。止まった問題があれば問題番号を入力してproblemsコレクションに記録する。また、全未完了問題の件数をサマリーとして常時表示する。

## 変更対象ファイル（5つ）

### 1. src/utils/sapixSchedule.js

`computeCoveredUnitIds` 関数の直前に、以下の関数を追加:

```javascript
/**
 * 授業日＋教科からテキストコードとスケジュール情報を取得（逆引き）
 * @param {string} classDate - 'YYYY-MM-DD'（授業日）
 * @param {string} subject - '算数' | '国語' | '理科' | '社会'
 * @returns {{ textCode: string, name: string, unitIds: string[] } | null}
 */
export function getTextInfoFromClassDate(classDate, subject) {
  let dNumber = null
  let dayType = null
  for (const [dKey, dates] of Object.entries(SAPIX_CALENDAR_4_2026_FIRST)) {
    if (dates.wed === classDate) { dNumber = dKey; dayType = 'wed'; break }
    if (dates.fri === classDate) { dNumber = dKey; dayType = 'fri'; break }
  }
  if (!dNumber) return null
  const wedSubjects = ['算数', '理科']
  const friSubjects = ['国語', '社会']
  if (dayType === 'wed' && !wedSubjects.includes(subject)) return null
  if (dayType === 'fri' && !friSubjects.includes(subject)) return null
  const num = dNumber.replace('D', '')
  const codeMap = { '算数': `41B-${num}`, '理科': `430-${num}`, '国語': `41A-${num}`, '社会': `440-${num}` }
  const textCode = codeMap[subject]
  if (!textCode) return null
  const info = SAPIX_SCHEDULE[textCode]
  return { textCode, name: info?.name || '', unitIds: info?.unitIds || [] }
}
```

### 2. src/utils/sapixHomework.js

**変更A:** ファイル先頭にimport追加:
```javascript
import { getTextInfoFromClassDate } from './sapixSchedule'
```

**変更B:** `generateWeeklyHomework()` 内で、各教科のタスク生成ループの先頭でテキスト情報を逆引きし、allTasks.pushするオブジェクトに3フィールドを追加:

```javascript
// forループの先頭（templatesの前）に追加:
const textInfo = getTextInfoFromClassDate(classDayStr, subject)

// allTasks.push のオブジェクトに以下3つを追加:
textCode: textInfo?.textCode || null,
textName: textInfo?.name || null,
unitIds: textInfo?.unitIds || [],
```

### 3. src/App.jsx

**変更A:** import追加:
```javascript
import { addProblem, updateProblem, getAllProblems } from './utils/problems'
```

**変更B:** state追加（homeworkDoneの隣に）:
```javascript
const [pendingProblems, setPendingProblems] = useState([])
```

**変更C:** toggleHomework関数の直後に以下を追加:

```javascript
// 解き直し待ち問題をロード
const loadPendingProblems = async () => {
  if (!user) return
  const result = await getAllProblems(user.uid)
  if (result.success) {
    setPendingProblems(
      result.data.filter(p => !p.isCorrect && p.reviewStatus !== 'done')
    )
  }
}

useEffect(() => {
  loadPendingProblems()
}, [user])

/**
 * 家庭学習タスク完了ハンドラ
 */
const completeHomework = async (hwId, stuckInfo = null) => {
  const updated = { ...homeworkDone, [hwId]: true }
  setHomeworkDone(updated)
  if (user) {
    await saveHomeworkDone(user.uid, updated)
  }
  if (user && stuckInfo && stuckInfo.problemNumbers?.length > 0) {
    for (const problemNumber of stuckInfo.problemNumbers) {
      await addProblem(user.uid, {
        sourceType: 'textbook',
        sourceId: stuckInfo.textCode || hwId,
        subject: stuckInfo.subject,
        problemNumber,
        unitIds: stuckInfo.unitIds || [],
        isCorrect: false,
        missType: 'understanding',
        imageUrls: [],
      })
    }
    toast(`⚡ ${stuckInfo.problemNumbers.length}件の問題を記録しました`)
    await loadPendingProblems()
  }
}

const resolveProblem = async (problemId) => {
  if (!user) return
  await updateProblem(user.uid, problemId, { reviewStatus: 'done' })
  setPendingProblems(prev => prev.filter(p => p.id !== problemId))
  toast('✅ 解き直し完了！')
}
```

**変更D:** TodayAndWeekViewのpropsに3つ追加:
```jsx
<TodayAndWeekView
  // ...既存props全てそのまま
  onCompleteHomework={completeHomework}
  pendingProblems={pendingProblems}
  onResolveProblem={resolveProblem}
/>
```

### 4. src/components/TodayAndWeekView.jsx

大幅変更のため、以下の設計方針で書き換え:

**propsに追加:**
```javascript
onCompleteHomework,   // (hwId, stuckInfo?) => void
pendingProblems = [], // problem[] 全未完了問題
onResolveProblem,     // (problemId) => void
```

**追加state:**
```javascript
const [completingHwId, setCompletingHwId] = useState(null)
const [showProblemInput, setShowProblemInput] = useState(false)
const [problemInput, setProblemInput] = useState('')
const [showPendingList, setShowPendingList] = useState(false)
```

**チェックボックス動作変更:**
- 未完了をチェック → 即完了ではなく `setCompletingHwId(hw.id)` で完了フローを開始
- 完了済みをチェック → 従来通り `onToggleHomework(hw.id)` で解除

**完了フローUI（タスクカードの直下にインライン展開）:**
```
[テキストコード + テキスト名を表示]  ← hw.textCodeがあれば
[✅ 全部できた]  [⚡ 止まった問題があった]  [キャンセル]
```
「⚡止まった問題があった」タップ後:
```
止まった問題番号: [テキスト入力 placeholder="例: P5 問2, P9 問1"]
[記録して完了]  [キャンセル]
```
- 「全部できた」→ `onCompleteHomework(hw.id, null)`
- 「記録して完了」→ `onCompleteHomework(hw.id, { textCode, unitIds, subject, problemNumbers })`
- problemNumbersはカンマ/スペース区切りで分割

**解き直し待ちサマリー（TodayAndWeekView最上部に表示、件数0なら非表示）:**
```
📝 解き直し待ち  🔢算数 3件  📖国語 1件  [▼]
```
タップで展開:
```
🔢算数
  41B-03  P5 問2   2/26  [✅できた]
  41B-03  P9 問1   2/26  [✅できた]
📖国語
  41A-03  P12 問1  2/22  [✅できた]
```
「✅できた」→ `onResolveProblem(p.id)`

**週間ビュー:** 完了済みタスクの横に、そのtextCodeに紐づく未完了問題件数を表示:
```
✓ 算数 Bテキスト復習  ⚡2
```

### 5. src/components/TodayAndWeekView.css

以下のクラスのスタイルを追加:

- `.pending-summary-bar` — 解き直し待ちバー（白背景、黄色ボーダー、角丸）
- `.pending-summary-content` — flexレイアウト、クリッカブル
- `.pending-subject-chip` — 教科別件数チップ（教科色+薄背景）
- `.pending-list` — 展開リスト（黄色薄背景）
- `.pending-problem-row` — 各問題行（flex、白背景）
- `.pending-resolve-btn` — 「できた」ボタン（緑系）
- `.hw-task-wrapper` — タスク+完了フローのコンテナ（flex column）
- `.hw-complete-flow` — 完了フロー展開エリア（白背景、slideDownアニメーション）
- `.hw-complete-info` — テキストコード表示
- `.hw-btn-ok` — 全部できたボタン（緑系）
- `.hw-btn-stuck` — 止まった問題ボタン（黄色系）
- `.hw-btn-cancel` — キャンセルボタン（グレー）
- `.hw-problem-input` — 問題番号テキスト入力
- `.hw-btn-save` — 記録して完了ボタン（インディゴ）
- `.hw-stuck-badge` / `.week-hw-stuck` — 止まり件数バッジ（黄色系）
- `.priority-task.completing` — border-bottom-radiusを0に

モバイル480px以下: ボタンを縦並びに、inputのfont-size: 16px（iOS zoom防止）

## 注意事項

- Firestoreスキーマ変更なし。既存のproblemsコレクション・addProblem()をそのまま使う
- problems.js, firestore.js, constants.js は変更不要
- studyCategory='basic-training'（基礎力トレーニング）の場合、textCode=nullになる。完了フローは動くが単元情報なしで記録される。これは許容
- 完了フローはモーダルではなくタスクカード直下のインライン展開にすること
