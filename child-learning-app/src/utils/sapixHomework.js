// SAPIX家庭学習スケジュール自動生成
//
// 授業曜日: 水曜（算数・理科）、金曜（国語・社会）
// 各教科の家庭学習優先順位（SAPIXカリキュラム共通）を
// 授業翌日〜次回授業前日に自動配分する

import { generateSapixSessions } from './sapixSchedule'
import { formatDate, parseLocalDate, addDays } from './dateUtils'

// 授業スケジュール（曜日 → 教科リスト）
// 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
export const CLASS_SCHEDULE = {
  3: ['算数', '理科'],  // 水曜
  5: ['国語', '社会'],  // 金曜
}

// 教科別の家庭学習テンプレート（優先順位順）
// dayOffset: 授業日を0として、何日後にやるか（配列で複数日指定可）
const HOMEWORK_TEMPLATES = {
  '算数': [
    // --- 授業当日 ---
    {
      studyPriority: 1,
      studyCategory: 'b-review',
      title: 'Bテキスト 復習',
      dayOffsets: [0],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'Bテキスト 練習',
      dayOffsets: [0],
      priority: 'A',
    },
    {
      studyPriority: 3,
      studyCategory: 'a-review',
      title: 'Aテキスト 復習',
      dayOffsets: [0],
      priority: 'A',
    },
    // --- 次の授業までにスケジュール ---
    {
      studyPriority: 4,
      studyCategory: 'b-brain',
      title: 'Bテキスト 頭脳トレーニング',
      dayOffsets: [1, 2, 3],
      priority: 'B',
    },
    {
      studyPriority: 5,
      studyCategory: 'a-exam',
      title: 'Aテキスト 入試問題',
      dayOffsets: [4, 5],
      priority: 'B',
    },
    // --- 毎日（休講・テスト週・春夏期含めて毎日表示する） ---
    {
      studyPriority: 6,
      studyCategory: 'basic-training',
      title: '基礎力トレーニング',
      isDaily: true,
      priority: 'B',
    },
  ],
  '国語': [
    {
      studyPriority: 1,
      studyCategory: 'b-review',
      title: 'Bテキスト 復習',
      dayOffsets: [0],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'Bテキスト 言葉ナビ・漢字練習',
      dayOffsets: [1, 2],
      priority: 'A',
    },
    {
      studyPriority: 3,
      studyCategory: 'a-review',
      title: 'Aテキスト 復習',
      dayOffsets: [3],
      priority: 'B',
    },
    {
      studyPriority: 4,
      studyCategory: 'kanji',
      title: '漢字の要・コトノハ',
      dayOffsets: [1, 2, 3, 4],
      priority: 'B',
    },
    {
      studyPriority: 5,
      studyCategory: 'basic-test',
      title: 'デイリーチェック対策',
      dayOffsets: [4],
      priority: 'C',
    },
  ],
  '理科': [
    {
      studyPriority: 1,
      studyCategory: 'b-review',
      title: 'テキスト 復習（ポイントチェック）',
      dayOffsets: [0],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'デイリーステップ①②',
      dayOffsets: [1],
      priority: 'A',
    },
    {
      studyPriority: 3,
      studyCategory: 'b-practice',
      title: 'デイリーステップ③〜',
      dayOffsets: [2],
      priority: 'B',
    },
    {
      studyPriority: 4,
      studyCategory: 'basic-test',
      title: 'コアプラス確認',
      dayOffsets: [3, 4],
      priority: 'C',
    },
  ],
  '社会': [
    {
      studyPriority: 1,
      studyCategory: 'b-review',
      title: 'テキスト 復習（ポイントチェック）',
      dayOffsets: [0],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'デイリーステップ①②',
      dayOffsets: [1],
      priority: 'A',
    },
    {
      studyPriority: 3,
      studyCategory: 'b-practice',
      title: 'デイリーステップ③〜',
      dayOffsets: [2],
      priority: 'B',
    },
    {
      studyPriority: 4,
      studyCategory: 'knowledge',
      title: 'コアプラス・白地図',
      dayOffsets: [3, 4],
      priority: 'C',
    },
  ],
}

// 指定日の曜日(0-6)を返す
function getDayOfWeek(date) {
  return date.getDay()
}

// 直近の授業日（過去方向）をカレンダーから探す
// 実在する通常授業（D-番号）のみを対象とし、テスト日や講習日を誤認しない
function findLastClassDay(sessions, fromDate, classDayOfWeek) {
  const fromStr = formatDate(fromDate)
  const dates = [...new Set(
    sessions
      .filter(s => s.dNumber.startsWith('D') && s.date <= fromStr)
      .map(s => s.date)
  )].sort()
  for (let i = dates.length - 1; i >= 0; i--) {
    const d = parseLocalDate(dates[i])
    if (getDayOfWeek(d) === classDayOfWeek) return d
  }
  return null
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

/**
 * 今週の家庭学習スケジュールを生成
 * @param {Date} today - 基準日（デフォルト: 今日）
 * @returns {Array} 日付ごとの学習タスク配列
 *   [{
 *     id: string,
 *     subject: string,
 *     title: string,
 *     dueDate: 'YYYY-MM-DD',
 *     studyPriority: 1-5,
 *     studyCategory: string,
 *     priority: 'A' | 'B' | 'C',
 *     classDate: 'YYYY-MM-DD',
 *     isHomework: true,
 *   }]
 */
// 講習中の家庭学習タスクを生成（春期・夏期）
// 通常授業（D-番号）と異なり、講習日は毎日連続するため翌日に「テキスト復習」を1件出すのみ。
// テンプレート定義は持たず、SAPIXセッションから直接タスクを構築する。
const SEASON_DNUMBERS = new Set(['春期', '夏期', '冬期'])

// 毎日表示する家庭学習タスクを生成
// 通常授業の有無・休講・テスト週・講習中などに関わらず、
// horizon 範囲（今日 〜 今日 + DAILY_HORIZON_DAYS）の各日に 1 件出す。
const DAILY_HORIZON_DAYS = 14

function generateDailyHomework(today, allTasks) {
  for (const [subject, templates] of Object.entries(HOMEWORK_TEMPLATES)) {
    for (const template of templates) {
      if (!template.isDaily) continue
      for (let i = 0; i <= DAILY_HORIZON_DAYS; i++) {
        const d = addDays(today, i)
        const dStr = formatDate(d)
        allTasks.push({
          id: `hw-${subject}-${template.studyCategory}-${dStr}`,
          subject,
          title: template.title,
          dueDate: dStr,
          studyPriority: template.studyPriority,
          studyCategory: template.studyCategory,
          priority: template.priority,
          classDate: null,
          isHomework: true,
          textCode: '',
          lessonLabel: '',
          unitName: '',
          unitIds: [],
        })
      }
    }
  }
}

function generateSeasonHomework(sessions, today, allTasks) {
  const todayStr = formatDate(today)
  const horizonStr = formatDate(addDays(today, 6))
  for (const s of sessions) {
    if (!SEASON_DNUMBERS.has(s.dNumber)) continue
    const classDate = parseLocalDate(s.date)
    const dueDate = addDays(classDate, 1)
    const dueDateStr = formatDate(dueDate)
    if (dueDateStr < todayStr || dueDateStr > horizonStr) continue
    allTasks.push({
      id: `hw-${s.subject}-season-review-${dueDateStr}`,
      subject: s.subject,
      title: 'テキスト 復習',
      dueDate: dueDateStr,
      studyPriority: 1,
      studyCategory: 'season-review',
      priority: 'A',
      classDate: s.date,
      isHomework: true,
      textCode: s.textCode,
      lessonLabel: lessonLabelFromCode(s.textCode),
      unitName: s.name,
      unitIds: s.unitIds,
    })
  }
}

export function generateWeeklyHomework(today = new Date()) {
  const allTasks = []
  // 1回の生成中だけセッション一覧を保持（モジュール越しのキャッシュは持たない）
  const sessions = generateSapixSessions()

  // 毎日タスク（基礎力トレーニング等）— 授業の有無に関わらず horizon 範囲を生成
  generateDailyHomework(today, allTasks)

  // 講習期間中の家庭学習（D-番号外のセッションを別ロジックで処理）
  generateSeasonHomework(sessions, today, allTasks)

  for (const [dayStr, subjects] of Object.entries(CLASS_SCHEDULE)) {
    const classDayOfWeek = parseInt(dayStr, 10)

    // 直近の授業日を取得
    const classDate = findLastClassDay(sessions, today, classDayOfWeek)
    if (!classDate) continue
    const classDayStr = formatDate(classDate)

    // この授業日から生成するタスクの期間チェック:
    // 授業日が7日以上前なら、来週分は生成しない
    const daysSinceClass = Math.floor((today - classDate) / (1000 * 60 * 60 * 24))
    if (daysSinceClass > 6) continue

    for (const subject of subjects) {
      const templates = HOMEWORK_TEMPLATES[subject]
      if (!templates) continue

      for (const template of templates) {
        // 毎日タスクは generateDailyHomework で先に処理済みなので skip
        if (template.isDaily) continue
        // SAPIX カリキュラムから「第N回」「単元名」「テキストコード」を解決
        const textType = textTypeForCategory(subject, template.studyCategory)
        const session = findSession(sessions, classDayStr, subject, textType)
        const textCode = session?.textCode || ''
        const lessonLabel = lessonLabelFromCode(textCode)
        const unitName = session?.name || ''
        const unitIds = session?.unitIds || []

        for (const offset of template.dayOffsets) {
          const dueDate = addDays(classDate, offset)
          const dueDateStr = formatDate(dueDate)

          allTasks.push({
            id: `hw-${subject}-${template.studyCategory}-${dueDateStr}`,
            subject,
            title: template.title,
            dueDate: dueDateStr,
            studyPriority: template.studyPriority,
            studyCategory: template.studyCategory,
            priority: template.priority,
            classDate: classDayStr,
            isHomework: true,
            textCode,
            lessonLabel,
            unitName,
            unitIds,
          })
        }
      }
    }
  }

  // 日付順 → 優先順位順でソート
  allTasks.sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    return a.studyPriority - b.studyPriority
  })

  return allTasks
}

/**
 * 特定の日の家庭学習タスクを取得
 * @param {Date} date - 対象日
 * @returns {Array} その日のタスク（優先順位順）
 */
export function getHomeworkForDate(date = new Date()) {
  const dateStr = formatDate(date)
  const all = generateWeeklyHomework(date)
  return all.filter(t => t.dueDate === dateStr)
}

/**
 * 今日〜指定日数分の家庭学習タスクを日付別にグループ化
 * @param {Date} today - 基準日
 * @param {number} days - 日数（デフォルト7）
 * @returns {Object} { 'YYYY-MM-DD': Task[] }
 */
export function getHomeworkByDate(today = new Date(), days = 7) {
  const all = generateWeeklyHomework(today)
  const result = {}

  for (let i = 0; i < days; i++) {
    const d = addDays(today, i)
    const dateStr = formatDate(d)
    result[dateStr] = all.filter(t => t.dueDate === dateStr)
  }

  return result
}
