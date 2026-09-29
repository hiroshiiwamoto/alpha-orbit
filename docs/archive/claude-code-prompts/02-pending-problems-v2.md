> **過去の作業指示（アーカイブ）— 再利用しないこと**
> 2026-03 以前に Claude Code へ渡した単発の指示書（01 の書き直し版）。
> ここで作る「家庭学習の完了フロー」「解き直し待ち」は現在のコードに存在しない。
> 前提としている `getTextInfoFromClassDate`、`completeHomework`、`pendingProblems` もない。
> 同様の作業をするときは、この文書を貼り付けず、現在のコードを前提に指示を書き直すこと。

# タスク: 「おすすめ復習」を「解き直し待ち」に置き換え＋家庭学習の完了フロー追加

「おすすめ復習」（単元習熟度ベースの提案）を削除し、代わりに「解き直し待ち」（problemsコレクションの未完了問題一覧）を表示する。
同時に、「今日の家庭学習」のチェックボックスに完了フローを追加し、止まった問題をその場で記録できるようにする。

## 変更ファイル（4つ）

---

### 1. src/utils/sapixSchedule.js

`computeCoveredUnitIds` 関数の **直前** に以下を追加:

```javascript
/**
 * 授業日＋教科からテキストコードとスケジュール情報を取得（逆引き）
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

---

### 2. src/utils/sapixHomework.js

**変更A:** ファイル先頭にimport追加:
```javascript
import { getTextInfoFromClassDate } from './sapixSchedule'
```

**変更B:** `generateWeeklyHomework()` 内の `for (const subject of subjects)` ループで、templatesループの前にテキスト情報を逆引きし、`allTasks.push` に3フィールド追加:

```javascript
const textInfo = getTextInfoFromClassDate(classDayStr, subject)

// allTasks.push のオブジェクトに追加:
textCode: textInfo?.textCode || null,
textName: textInfo?.name || null,
unitIds: textInfo?.unitIds || [],
```

---

### 3. src/App.jsx

**削除するもの:**
- `import { getMasterUnitStats, getLessonLogs } from './utils/lessonLogs'`
- `import { getStaticMasterUnits } from './utils/importMasterUnits'`
- `import { generateDailyTasks } from './utils/dailyTaskEngine'`
- `const [suggestedTasks, setSuggestedTasks] = useState([])`
- `// おすすめ復習タスクを生成` の useEffect ブロック全体
- TodayAndWeekView の `suggestedTasks={suggestedTasks}` prop

**追加するもの:**

import変更:
```javascript
// getAllProblems は既にimportされている → addProblem, updateProblem を追加
import { getAllProblems, addProblem, updateProblem } from './utils/problems'
```

state追加（homeworkDoneの隣）:
```javascript
const [pendingProblems, setPendingProblems] = useState([])
```

toggleHomework の直前に以下を追加:
```javascript
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
```

toggleHomework の直後に以下を追加:
```javascript
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

TodayAndWeekView のprops変更:
```jsx
<TodayAndWeekView
  tasks={tasks}
  homeworkDone={homeworkDone}
  onToggleTask={toggleTask}
  onDeleteTask={deleteTask}
  onEditTask={handleEditTask}
  onToggleHomework={toggleHomework}
  onCompleteHomework={completeHomework}
  pendingProblems={pendingProblems}
  onResolveProblem={resolveProblem}
  userId={user.uid}
/>
```

---

### 4. src/components/TodayAndWeekView.jsx + TodayAndWeekView.css

**TodayAndWeekView.jsx を全面書き換え。** 主な変更:

- `suggestedTasks` prop を削除 → `onCompleteHomework`, `pendingProblems`, `onResolveProblem` を追加
- おすすめ復習セクション全体を削除
- 代わりに「解き直し待ち」セクション（アンバー/オレンジ色ヘッダー）を最上部に追加:
  - pendingProblems を教科別にグループ化して表示
  - 各問題に「✅できた」ボタン → onResolveProblem(p.id) を呼ぶ
  - 件数0なら非表示
- 「今日の家庭学習」のチェックボックス動作を変更:
  - 未完了をチェック → 即完了ではなく完了フローを開始（タスク直下にインライン展開）
  - 「✅ 全部できた」→ onCompleteHomework(hw.id, null)
  - 「⚡ 止まった問題があった」→ 問題番号入力フォーム表示 → onCompleteHomework(hw.id, { textCode, unitIds, subject, problemNumbers })
  - 完了済みをチェック → 従来通り onToggleHomework で解除
- 週間ビューの各タスクに ⚡件数バッジ表示（完了済みかつ未解決問題がある場合）

**TodayAndWeekView.css:**
- `.suggested-section`, `.suggested-*` 関連スタイルを全て削除
- 代わりに `.pending-section`, `.pending-list`, `.pending-problem-row`, `.pending-resolve-btn` 等を追加
- `.hw-complete-flow`, `.hw-btn-ok`, `.hw-btn-stuck`, `.hw-btn-cancel`, `.hw-problem-input`, `.hw-btn-save` 等の完了フロースタイルを追加
- `.hw-stuck-badge`, `.week-hw-stuck` のバッジスタイルを追加
- モバイル480px以下: ボタン縦並び、input font-size: 16px（iOS zoom防止）

---

## CSSの色設計

- 解き直し待ちヘッダー: `linear-gradient(135deg, #d97706, #b45309)` （アンバー）
- 展開リスト背景: `#fffbeb`
- 「全部できた」ボタン: 緑系 `#dcfce7` / `#166534`
- 「止まった問題があった」ボタン: 黄色系 `#fef3c7` / `#92400e`
- 「記録して完了」ボタン: インディゴ `#6366f1`
- ⚡バッジ: `#fef3c7` / `#d97706`

## 注意

- dailyTaskEngine.js は削除しないでよい（importを外すだけ）
- Firestoreスキーマ変更なし
- problems.js は変更不要（既存のaddProblem/updateProblem/getAllProblemsをそのまま使う）
- 完了フローはモーダルではなくタスクカード直下のインライン展開にすること
