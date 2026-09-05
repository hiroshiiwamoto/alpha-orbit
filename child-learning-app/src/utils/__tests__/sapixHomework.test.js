// 家庭学習タスク自動生成（持ち時間への割り付け方式）のテスト
//
// 過去に実際に起きたバグの回帰テストを含む:
// - 休講・テスト週に家庭学習が完全に空になる（基礎トレも消える）
// - 塾のある日（持ち時間ゼロ）に最重要の当日復習が置かれて間に合わない
// - 季節講習中にタスクが出ない

import { describe, it, expect } from 'vitest'
import {
  generateWeeklyHomework,
  getHomeworkForDate,
  getHomeworkByDate,
  getDayPlan,
  DEFAULT_AVAILABLE_MINUTES,
} from '../sapixHomework'
import { parseLocalDate, formatDate, addDays } from '../dateUtils'

// D22 の通常週: 水 9/16（算数・理科）、金 9/18（国語・社会）
const WED = '2026-09-16'
const THU = '2026-09-17'
const SAT = '2026-09-19'

describe('毎日タスク（算数 基礎力トレーニング）', () => {
  it('通常授業週に生成される', () => {
    const tasks = getHomeworkForDate(parseLocalDate('2026-05-14'))
    expect(tasks.some(t => t.studyCategory === 'basic-training' && t.subject === '算数')).toBe(true)
  })

  it('休講・テスト週でも生成される（2026-05-08 マンスリーテスト日の回帰テスト）', () => {
    const tasks = getHomeworkForDate(parseLocalDate('2026-05-08'))
    expect(tasks.some(t => t.studyCategory === 'basic-training')).toBe(true)
  })

  it('塾のある水・金にも生成される（持ち時間の枠外）', () => {
    for (const d of [WED, '2026-09-18']) {
      const tasks = getHomeworkForDate(parseLocalDate(d))
      expect(tasks.filter(t => t.isDaily)).toHaveLength(1)
      expect(tasks.filter(t => !t.isDaily)).toHaveLength(0)
    }
  })

  it('getDayPlan は基礎トレを requiredMinutes に含めず dailyMinutes に分ける', () => {
    const tasks = getHomeworkForDate(parseLocalDate(THU))
    const plan = getDayPlan(tasks, parseLocalDate(THU))
    expect(plan.dailyMinutes).toBe(10)
    expect(plan.requiredMinutes).toBe(60)
    expect(plan.availableMinutes).toBe(60)
  })
})

describe('持ち時間への割り付け（通常週 D22）', () => {
  const byDate = getHomeworkByDate(parseLocalDate(WED), 8)

  it('塾のある水・金には割り付けタスクを置かない', () => {
    expect(byDate[WED].filter(t => !t.isDaily)).toHaveLength(0)
    expect(byDate['2026-09-18'].filter(t => !t.isDaily)).toHaveLength(0)
  })

  it('木曜（授業翌日）は算数 Bテキスト 60分で埋まる', () => {
    const thu = byDate[THU].filter(t => !t.isDaily)
    expect(thu).toHaveLength(1)
    expect(thu[0].subject).toBe('算数')
    expect(thu[0].studyCategory).toBe('b-review')
    expect(thu[0].minutes).toBe(60)
    expect(thu[0].capMinutes).toBe(60)
    expect(thu[0].lessonLabel).toBe('第22回')
    expect(thu[0].overflow).toBe(false)
  })

  it('土曜に算数 A と国語・理科・社会の当日系 A タスクが入る', () => {
    const sat = byDate[SAT]
    const has = (subject, cat) => sat.some(t => t.subject === subject && t.studyCategory === cat && !t.overflow)
    expect(has('算数', 'a-review')).toBe(true)
    expect(has('国語', 'b-review')).toBe(true)
    expect(has('理科', 'b-review')).toBe(true)
    expect(has('社会', 'b-review')).toBe(true)
  })

  it('どの日も必須タスクの合計が持ち時間を超えない', () => {
    for (const [dateStr, tasks] of Object.entries(byDate)) {
      const plan = getDayPlan(tasks, parseLocalDate(dateStr))
      expect(plan.requiredMinutes, dateStr).toBeLessThanOrEqual(plan.availableMinutes)
    }
  })

  it('デフォルトの持ち時間では 1 サイクル分が全部収まり overflow が出ない', () => {
    const all = generateWeeklyHomework(parseLocalDate(SAT))
    const cycle = all.filter(t => t.classDate === WED || t.classDate === '2026-09-18')
    expect(cycle.length).toBeGreaterThan(20)
    expect(cycle.filter(t => t.overflow)).toHaveLength(0)
  })

  it('A タスクはすべて授業翌日〜3日以内に置かれる（当日復習が後回しにならない）', () => {
    const all = generateWeeklyHomework(parseLocalDate(SAT))
    for (const t of all.filter(t => t.priority === 'A' && t.classDate && !t.isDaily && t.studyCategory !== 'season-review')) {
      const gap = (parseLocalDate(t.dueDate) - parseLocalDate(t.classDate)) / 86400000
      expect(gap, `${t.subject} ${t.title}`).toBeLessThanOrEqual(3)
    }
  })
})

describe('持ち時間が足りないとき', () => {
  // 土日を 60 分に絞る（合計 300 分 < 必要 ≈ 500 分）
  const tight = { ...DEFAULT_AVAILABLE_MINUTES, 6: 60, 0: 60 }
  const all = generateWeeklyHomework(parseLocalDate(SAT), tight)
  const cycle = all.filter(t => t.classDate === WED || t.classDate === '2026-09-18')

  it('入りきらないタスクは overflow=true で「余裕があれば」に回る', () => {
    expect(cycle.filter(t => t.overflow).length).toBeGreaterThan(0)
  })

  it('溢れるのは優先度の低いものから（A が溢れる前に C が全部溢れる）', () => {
    const overflowA = cycle.filter(t => t.overflow && t.priority === 'A')
    const placedC = cycle.filter(t => !t.overflow && t.priority === 'C')
    if (overflowA.length > 0) {
      expect(placedC, 'A が溢れているのに C が配置されている').toHaveLength(0)
    }
  })

  it('必須タスクの合計は持ち時間を超えない', () => {
    const byDate = getHomeworkByDate(parseLocalDate(WED), 8, tight)
    for (const [dateStr, tasks] of Object.entries(byDate)) {
      const plan = getDayPlan(tasks, parseLocalDate(dateStr), tight)
      expect(plan.requiredMinutes, dateStr).toBeLessThanOrEqual(plan.availableMinutes)
    }
  })

  it('overflow タスクも実施可能期間（授業翌日〜期限）内の日付を持つ', () => {
    for (const t of cycle.filter(t => t.overflow)) {
      const due = parseLocalDate(t.dueDate)
      expect(due >= addDays(parseLocalDate(t.classDate), 1), t.id).toBe(true)
      expect(due <= addDays(parseLocalDate(t.classDate), 6), t.id).toBe(true)
    }
  })
})

describe('割り付け結果の安定性', () => {
  it('タスク ID は授業日ベースで、基準日を変えても同じ ID が出る', () => {
    const fromWed = generateWeeklyHomework(parseLocalDate(WED))
    const fromSun = generateWeeklyHomework(parseLocalDate('2026-09-20'))
    const pick = list => list.filter(t => t.classDate === WED).map(t => `${t.id}@${t.dueDate}`).sort()
    expect(pick(fromWed)).toEqual(pick(fromSun))
  })

  const dates = ['2026-05-13', '2026-07-31', '2026-08-19', '2026-09-19', '2026-12-27']
  for (const dateStr of dates) {
    it(`${dateStr} 起点の生成で ID が重複しない`, () => {
      const tasks = generateWeeklyHomework(parseLocalDate(dateStr))
      const ids = tasks.map(t => t.id)
      expect(new Set(ids).size, `重複: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`).toBe(ids.length)
    })
  }
})

describe('回情報と休講週', () => {
  it('回に紐づかないカテゴリ（基礎トレ等）には回情報が付かない', () => {
    const tasks = getHomeworkForDate(parseLocalDate(THU))
    const basic = tasks.find(t => t.studyCategory === 'basic-training')
    expect(basic.textCode).toBe('')
    expect(basic.lessonLabel).toBe('')
  })

  it('最終授業から 7 日以上経つと通常タスクは生成されない', () => {
    // D19 (7/15 水) の 8 日後
    const tasks = getHomeworkForDate(parseLocalDate('2026-07-23'))
    expect(tasks.filter(t => t.studyCategory !== 'basic-training')).toHaveLength(0)
  })

  it('休講で次の授業が 2 週間先でも期限は授業日 + 6 日（9/23 休講週の回帰テスト）', () => {
    // D22 水 9/16 → 次の水曜授業は 9/30 だが、タスクは 9/22 までに置かれる
    const all = generateWeeklyHomework(parseLocalDate(SAT))
    for (const t of all.filter(t => t.classDate === WED && !t.isDaily)) {
      expect(t.dueDate <= '2026-09-22', t.id).toBe(true)
    }
  })
})

describe('季節講習の家庭学習', () => {
  it('夏期講習日の翌日に「テキスト 復習」が教科ごとに出る', () => {
    // 7/30 は 算数1・国語1・社会1 → 7/31 に3教科の復習
    const tasks = getHomeworkForDate(parseLocalDate('2026-07-31'))
    const season = tasks.filter(t => t.studyCategory === 'season-review')
    expect(season.map(t => t.subject).sort()).toEqual(['国語', '社会', '算数'])
    for (const t of season) {
      expect(t.classDate).toBe('2026-07-30')
      expect(t.textCode).toMatch(/^N4\d-/)
      expect(t.priority).toBe('A')
      expect(t.minutes).toBeGreaterThan(0)
    }
  })

  it('冬期講習日の翌日にも同様に出る', () => {
    // 12/26 は F41-01(算数)・F42-01(国語)・F44-01(社会)
    const tasks = getHomeworkForDate(parseLocalDate('2026-12-27'))
    const season = tasks.filter(t => t.studyCategory === 'season-review')
    expect(season.map(t => t.subject).sort()).toEqual(['国語', '社会', '算数'])
  })
})

describe('getHomeworkByDate', () => {
  it('指定日数分の日付キーを返し、各日のタスクは dueDate が一致する', () => {
    const byDate = getHomeworkByDate(parseLocalDate('2026-05-13'), 7)
    expect(Object.keys(byDate)).toHaveLength(7)
    for (const [dateStr, tasks] of Object.entries(byDate)) {
      for (const t of tasks) {
        expect(t.dueDate, t.id).toBe(dateStr)
      }
    }
  })

  it('formatDate/addDays との整合（横断チェック）', () => {
    const start = parseLocalDate('2026-09-16')
    const byDate = getHomeworkByDate(start, 3)
    expect(Object.keys(byDate)).toEqual([0, 1, 2].map(i => formatDate(addDays(start, i))))
  })
})
