// SAPIX家庭学習スケジュール自動生成（持ち時間への割り付け方式）
//
// 授業曜日: 水曜（算数・理科）、金曜（国語・社会）
//
// 従来の「授業日 + 固定オフセット」方式は、塾のある水・金（持ち時間ほぼゼロ）に
// 最重要の当日復習を置いてしまい、毎週「間に合わない」原因になっていた。
// 本モジュールは各タスクに所要時間の目安を持たせ、曜日別の持ち時間へ
// 優先度 A → B → C の順に詰める。入りきらないタスクは「余裕があれば」
// (overflow) として分離し、落として良いことを明示する。

import { generateSapixSessions } from './sapixSchedule'
import { formatDate, parseLocalDate, addDays } from './dateUtils'

// 授業スケジュール（曜日 → 教科リスト）
// 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
export const CLASS_SCHEDULE = {
  3: ['算数', '理科'],  // 水曜
  5: ['国語', '社会'],  // 金曜
}

// 曜日別の持ち時間（分）= 家庭学習の割り付けに使えるまとまった時間。
// 毎日 10 分の基礎力トレーニングはこの枠とは別（朝など）に行う前提で、
// 割り付け予算からは差し引かない。塾のある水・金は 0。
// 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
export const DEFAULT_AVAILABLE_MINUTES = {
  0: 180, // 日
  1: 60,  // 月
  2: 60,  // 火
  3: 0,   // 水（塾）
  4: 60,  // 木
  5: 0,   // 金（塾）
  6: 180, // 土
}

// 1 サイクル（授業翌日〜）の長さ。休講で次の授業が 2 週間先でも、
// 宿題はこの日数以内に終える前提で割り付ける。
const CYCLE_DAYS = 6

const PRIORITY_ORDER = { A: 0, B: 1, C: 2 }

// 教科別の家庭学習テンプレート
//   minutes    : 所要時間の目安（分）
//   capMinutes : 上限時間。超えたら解答を見て切り上げる（算数のみ）
//   count      : 週あたりの回数（複数回は別タスクとして割り付ける）
//   priority   : A=必須 / B=標準 / C=余裕があれば
//   isDaily    : 授業の有無に関係なく毎日（基礎力トレーニング）
const HOMEWORK_TEMPLATES = {
  '算数': [
    { studyPriority: 1, studyCategory: 'b-review',       title: 'Bテキスト 復習・練習',        minutes: 60, capMinutes: 60, priority: 'A' },
    { studyPriority: 2, studyCategory: 'a-review',       title: 'Aテキスト 復習',              minutes: 60, capMinutes: 60, priority: 'A' },
    { studyPriority: 3, studyCategory: 'b-brain',        title: 'Bテキスト 頭脳トレーニング',   minutes: 15, count: 3,       priority: 'B' },
    { studyPriority: 4, studyCategory: 'a-exam',         title: 'Aテキスト 入試問題',           minutes: 20, count: 2,       priority: 'B' },
    { studyPriority: 5, studyCategory: 'basic-training', title: '基礎力トレーニング',           minutes: 10, isDaily: true,  priority: 'B' },
  ],
  '国語': [
    { studyPriority: 1, studyCategory: 'b-review',   title: 'Bテキスト 復習',              minutes: 30,           priority: 'A' },
    { studyPriority: 2, studyCategory: 'b-practice', title: 'Bテキスト 言葉ナビ・漢字練習', minutes: 15, count: 2, priority: 'A' },
    { studyPriority: 3, studyCategory: 'a-review',   title: 'Aテキスト 復習',              minutes: 30,           priority: 'B' },
    { studyPriority: 4, studyCategory: 'kanji',      title: '漢字の要・コトノハ',           minutes: 10, count: 4, priority: 'B' },
    { studyPriority: 5, studyCategory: 'basic-test', title: 'デイリーチェック対策',         minutes: 15,           priority: 'C' },
  ],
  '理科': [
    { studyPriority: 1, studyCategory: 'b-review',     title: 'テキスト 復習（ポイントチェック）', minutes: 15,           priority: 'A' },
    { studyPriority: 2, studyCategory: 'daily-step-1', title: 'デイリーステップ①②',              minutes: 20,           priority: 'A' },
    { studyPriority: 3, studyCategory: 'daily-step-2', title: 'デイリーステップ③〜',              minutes: 20,           priority: 'B' },
    { studyPriority: 4, studyCategory: 'basic-test',   title: 'コアプラス確認',                   minutes: 10, count: 2, priority: 'C' },
  ],
  '社会': [
    { studyPriority: 1, studyCategory: 'b-review',     title: 'テキスト 復習（ポイントチェック）', minutes: 15,           priority: 'A' },
    { studyPriority: 2, studyCategory: 'daily-step-1', title: 'デイリーステップ①②',              minutes: 20,           priority: 'A' },
    { studyPriority: 3, studyCategory: 'daily-step-2', title: 'デイリーステップ③〜',              minutes: 20,           priority: 'B' },
    { studyPriority: 4, studyCategory: 'knowledge',    title: 'コアプラス・白地図',               minutes: 10, count: 2, priority: 'C' },
  ],
}

// 教科 + studyCategory からテキスト種別を判定
//   'A' / 'B'    : 算数・国語の A/B テキスト
//   'SINGLE'     : 理科・社会（テキスト1種類のみ）
//   null         : 回に紐づかないカテゴリ（基礎トレ・漢字・コアプラス等）
const NO_LESSON_CATEGORIES = new Set(['basic-training', 'kanji', 'basic-test', 'knowledge'])

function textTypeForCategory(subject, category) {
  if (NO_LESSON_CATEGORIES.has(category)) return null
  if (subject === '理科' || subject === '社会') return 'SINGLE'
  if (category === 'b-review' || category === 'b-practice' || category === 'b-brain') return 'B'
  if (category === 'a-review' || category === 'a-exam') return 'A'
  return null
}

// 授業日 + 教科 + テキスト種別から SAPIX セッション情報を取得
function findSession(sessions, classDate, subject, textType) {
  if (!textType) return null
  return sessions.find(s => {
    if (s.date !== classDate || s.subject !== subject) return false
    if (textType === 'A') return /^4\dA-/.test(s.textCode)
    if (textType === 'B') return /^4\dB-/.test(s.textCode)
    if (textType === 'SINGLE') return /^4\d0-/.test(s.textCode)
    return false
  })
}

// テキストコードから「第N回」のラベルを生成（例: "41B-09" → "第9回"）
function lessonLabelFromCode(code) {
  if (!code) return ''
  const m = code.match(/-(\d{2})$/)
  if (!m) return ''
  return `第${parseInt(m[1], 10)}回`
}

// 持ち時間（分）を返す
export function getAvailableMinutes(date, availability = DEFAULT_AVAILABLE_MINUTES) {
  return availability[date.getDay()] ?? 0
}

// ── 毎日タスク ─────────────────────────────────────────────
// 授業の有無・休講・テスト週・講習中などに関わらず、各日に 1 件出す。
// 割り付けの対象外で、その日の持ち時間から先に差し引く。
function generateDailyHomework(startDate, endDate, allTasks) {
  for (const [subject, templates] of Object.entries(HOMEWORK_TEMPLATES)) {
    for (const template of templates) {
      if (!template.isDaily) continue
      for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
        const dStr = formatDate(d)
        allTasks.push({
          id: `hw-${subject}-${template.studyCategory}-${dStr}`,
          subject,
          title: template.title,
          dueDate: dStr,
          minutes: template.minutes,
          capMinutes: template.capMinutes ?? null,
          studyPriority: template.studyPriority,
          studyCategory: template.studyCategory,
          priority: template.priority,
          classDate: null,
          isHomework: true,
          isDaily: true,
          overflow: false,
          textCode: '',
          lessonLabel: '',
          unitName: '',
          unitIds: [],
        })
      }
    }
  }
}

// ── 季節講習（春期・夏期・冬期）─────────────────────────────
// 講習日は毎日連続するため翌日に「テキスト 復習」を教科ごとに 1 件出す。
// 割り付けの対象外（固定日）で、その日の持ち時間から先に差し引く。
const SEASON_DNUMBERS = new Set(['春期', '夏期', '冬期'])
const SEASON_REVIEW_MINUTES = 30

function generateSeasonHomework(sessions, startDate, endDate, allTasks) {
  const startStr = formatDate(startDate)
  const endStr = formatDate(endDate)
  for (const s of sessions) {
    if (!SEASON_DNUMBERS.has(s.dNumber)) continue
    if (!s.subject || !s.textCode) continue
    const dueDateStr = formatDate(addDays(parseLocalDate(s.date), 1))
    if (dueDateStr < startStr || dueDateStr > endStr) continue
    allTasks.push({
      id: `hw-${s.subject}-season-review-${dueDateStr}`,
      subject: s.subject,
      title: 'テキスト 復習',
      dueDate: dueDateStr,
      minutes: SEASON_REVIEW_MINUTES,
      capMinutes: null,
      studyPriority: 1,
      studyCategory: 'season-review',
      priority: 'A',
      classDate: s.date,
      isHomework: true,
      isDaily: false,
      overflow: false,
      textCode: s.textCode,
      lessonLabel: lessonLabelFromCode(s.textCode),
      unitName: s.name,
      unitIds: s.unitIds,
    })
  }
}

// ── 通常授業のサイクル ──────────────────────────────────────
// 1 サイクル = ある授業日から次の同曜日授業の前日まで。
// タスクは翌日（earliest）以降、期限（deadline）までに割り付ける。
function buildCycles(sessions, windowStart, windowEnd) {
  const regularDates = [...new Set(
    sessions.filter(s => s.dNumber.startsWith('D')).map(s => s.date)
  )].sort()

  const cycles = []
  for (const [dayStr, subjects] of Object.entries(CLASS_SCHEDULE)) {
    const classDayOfWeek = parseInt(dayStr, 10)
    const dates = regularDates.filter(d => parseLocalDate(d).getDay() === classDayOfWeek)
    for (let i = 0; i < dates.length; i++) {
      const classDate = parseLocalDate(dates[i])
      if (classDate < windowStart || classDate > windowEnd) continue
      // 期限 = 次の同曜日授業の前日、ただし最長でも授業日 + CYCLE_DAYS
      const next = dates[i + 1] ? parseLocalDate(dates[i + 1]) : addDays(classDate, 7)
      const byNext = addDays(next, -1)
      const byCycle = addDays(classDate, CYCLE_DAYS)
      cycles.push({
        classDateStr: dates[i],
        subjects,
        earliest: addDays(classDate, 1),
        deadline: byNext < byCycle ? byNext : byCycle,
      })
    }
  }
  return cycles
}

function buildCycleTasks(sessions, cycle) {
  const tasks = []
  for (const subject of cycle.subjects) {
    const templates = HOMEWORK_TEMPLATES[subject]
    if (!templates) continue
    for (const template of templates) {
      if (template.isDaily) continue
      const textType = textTypeForCategory(subject, template.studyCategory)
      const session = findSession(sessions, cycle.classDateStr, subject, textType)
      const textCode = session?.textCode || ''
      const count = template.count ?? 1
      for (let n = 1; n <= count; n++) {
        const suffix = count > 1 ? `-${n}` : ''
        tasks.push({
          // 割り付け先の日が変わっても ID が安定するよう、授業日をキーにする
          id: `hw-${subject}-${template.studyCategory}${suffix}-${cycle.classDateStr}`,
          subject,
          title: template.title,
          dueDate: null,
          minutes: template.minutes,
          capMinutes: template.capMinutes ?? null,
          studyPriority: template.studyPriority,
          studyCategory: template.studyCategory,
          priority: template.priority,
          classDate: cycle.classDateStr,
          isHomework: true,
          isDaily: false,
          overflow: false,
          textCode,
          lessonLabel: lessonLabelFromCode(textCode),
          unitName: session?.name || '',
          unitIds: session?.unitIds || [],
          occurrence: n,
          earliest: cycle.earliest,
          deadline: cycle.deadline,
        })
      }
    }
  }
  return tasks
}

// ── 割り付け ───────────────────────────────────────────────
// 日付順に走査し、各日の残り持ち時間へ「優先度 A→B→C、授業日が古い順、
// 教科内の順番」で詰める。最後まで入らなかったタスクは、実施可能期間の
// 中で最も空きが大きい日に overflow=true で置く（表示上は「余裕があれば」）。
// 固定タスクのうち毎日タスク（基礎トレ）は持ち時間の枠外なので予算から
// 差し引かない。季節講習の復習は枠内として差し引く。
function allocate(tasks, fixedTasks, availability, startDate, endDate) {
  const used = {}
  for (const t of fixedTasks) {
    if (t.isDaily) continue
    used[t.dueDate] = (used[t.dueDate] || 0) + t.minutes
  }

  const byPriority = (a, b) => {
    const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (p !== 0) return p
    const e = a.earliest - b.earliest
    if (e !== 0) return e
    const s = a.studyPriority - b.studyPriority
    if (s !== 0) return s
    return (a.occurrence || 0) - (b.occurrence || 0)
  }

  let remaining = [...tasks]
  const placed = []
  const leftover = {}

  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    const dStr = formatDate(d)
    let budget = getAvailableMinutes(d, availability) - (used[dStr] || 0)
    const candidates = remaining.filter(t => d >= t.earliest && d <= t.deadline).sort(byPriority)
    for (const t of candidates) {
      if (t.minutes <= budget) {
        budget -= t.minutes
        placed.push({ ...t, dueDate: dStr, overflow: false })
        remaining = remaining.filter(r => r !== t)
      }
    }
    leftover[dStr] = budget
  }

  // 入りきらなかったタスク: 期間内で最も余裕のある日に「余裕があれば」として配置
  for (const t of remaining) {
    let bestDate = null
    let bestLeft = -Infinity
    for (let d = new Date(t.earliest); d <= t.deadline; d = addDays(d, 1)) {
      const dStr = formatDate(d)
      const left = leftover[dStr] ?? getAvailableMinutes(d, availability)
      if (left > bestLeft) { bestLeft = left; bestDate = dStr }
    }
    placed.push({ ...t, dueDate: bestDate ?? formatDate(t.deadline), overflow: true })
  }

  return placed
}

/**
 * 家庭学習スケジュールを生成（today を含む前後の期間）
 * @param {Date} today - 基準日
 * @param {Object} availability - 曜日別持ち時間 { 0..6: minutes }
 * @returns {Array} タスク配列（dueDate 順 → overflow 後回し → studyPriority 順）
 *   各タスク: { id, subject, title, dueDate, minutes, capMinutes, priority,
 *              studyPriority, studyCategory, classDate, overflow, isDaily,
 *              textCode, lessonLabel, unitName, unitIds, isHomework }
 */
export function generateWeeklyHomework(today = new Date(), availability = DEFAULT_AVAILABLE_MINUTES) {
  const sessions = generateSapixSessions()

  // 割り付け対象のサイクル: 授業日が today-14 〜 today+7 の範囲。
  // 過去分も含めることで、どの日を基準に生成しても同じ割り付け結果になる。
  const windowStart = addDays(today, -14)
  const windowEnd = addDays(today, 7)
  const cycles = buildCycles(sessions, windowStart, windowEnd)

  const cycleTasks = cycles.flatMap(c => buildCycleTasks(sessions, c))
  const rangeStart = cycles.length ? new Date(Math.min(...cycles.map(c => c.earliest))) : windowStart
  const rangeEnd = new Date(Math.max(
    addDays(today, 14).getTime(),
    ...cycles.map(c => c.deadline.getTime()),
  ))

  const fixed = []
  generateDailyHomework(rangeStart, rangeEnd, fixed)
  generateSeasonHomework(sessions, rangeStart, rangeEnd, fixed)

  const allocated = allocate(cycleTasks, fixed, availability, rangeStart, rangeEnd)

  const all = [...fixed, ...allocated]
  all.sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.overflow !== b.overflow) return a.overflow ? 1 : -1
    if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject)
    return a.studyPriority - b.studyPriority
  })
  return all
}

/**
 * 特定の日の家庭学習タスクを取得
 */
export function getHomeworkForDate(date = new Date(), availability = DEFAULT_AVAILABLE_MINUTES) {
  const dateStr = formatDate(date)
  return generateWeeklyHomework(date, availability).filter(t => t.dueDate === dateStr)
}

/**
 * 今日〜指定日数分の家庭学習タスクを日付別にグループ化
 * @returns {Object} { 'YYYY-MM-DD': Task[] }
 */
export function getHomeworkByDate(today = new Date(), days = 7, availability = DEFAULT_AVAILABLE_MINUTES) {
  const all = generateWeeklyHomework(today, availability)
  const result = {}
  for (let i = 0; i < days; i++) {
    const dateStr = formatDate(addDays(today, i))
    result[dateStr] = all.filter(t => t.dueDate === dateStr)
  }
  return result
}

/**
 * 1 日分のプラン: 必須 / 余裕があれば に分け、所要時間の合計を付与
 */
export function getDayPlan(tasks, date, availability = DEFAULT_AVAILABLE_MINUTES) {
  const required = tasks.filter(t => !t.overflow)
  const optional = tasks.filter(t => t.overflow)
  const sum = list => list.reduce((s, t) => s + (t.minutes || 0), 0)
  return {
    required,
    optional,
    // 持ち時間の枠内で消費する分（毎日タスクは枠外なので除く）
    requiredMinutes: sum(required.filter(t => !t.isDaily)),
    dailyMinutes: sum(required.filter(t => t.isDaily)),
    optionalMinutes: sum(optional),
    availableMinutes: getAvailableMinutes(date, availability),
  }
}
