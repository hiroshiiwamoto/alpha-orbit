// 家庭学習タスク自動生成のテスト
//
// 過去に実際に起きたバグの回帰テストを含む:
// - 休講・テスト週に家庭学習が完全に空になる（基礎トレも消える）
// - D15→D16 境界週で回情報が欠落する
// - 季節講習中にタスクが出ない

import { describe, it, expect } from 'vitest'
import {
  generateWeeklyHomework,
  getHomeworkForDate,
  getHomeworkByDate,
} from '../sapixHomework'
import { parseLocalDate } from '../dateUtils'

describe('毎日タスク（算数 基礎力トレーニング）', () => {
  it('通常授業週に生成される', () => {
    const tasks = getHomeworkForDate(parseLocalDate('2026-05-14')) // D11 木曜
    expect(tasks.some(t => t.studyCategory === 'basic-training' && t.subject === '算数')).toBe(true)
  })

  it('休講・テスト週でも生成される（2026-05-08 マンスリーテスト日の回帰テスト）', () => {
    const tasks = getHomeworkForDate(parseLocalDate('2026-05-08'))
    expect(tasks.some(t => t.studyCategory === 'basic-training')).toBe(true)
  })

  it('夏期講習期間の谷間（お盆休み等）でも生成される', () => {
    const tasks = getHomeworkForDate(parseLocalDate('2026-08-12')) // 8/9〜8/14 は講習なし
    expect(tasks.some(t => t.studyCategory === 'basic-training')).toBe(true)
  })
})

describe('通常授業の家庭学習', () => {
  it('授業当日に A優先度の復習タスクが出る（D11 水曜: 算数）', () => {
    const tasks = getHomeworkForDate(parseLocalDate('2026-05-13'))
    const sansuB = tasks.find(t => t.subject === '算数' && t.studyCategory === 'b-review')
    expect(sansuB).toBeTruthy()
    expect(sansuB.priority).toBe('A')
    expect(sansuB.textCode).toMatch(/^41B-/)
    expect(sansuB.lessonLabel).toBe('第11回')
  })

  it('回に紐づかないカテゴリ（基礎トレ等）には回情報が付かない', () => {
    const tasks = getHomeworkForDate(parseLocalDate('2026-05-13'))
    const basic = tasks.find(t => t.studyCategory === 'basic-training')
    expect(basic.textCode).toBe('')
    expect(basic.lessonLabel).toBe('')
  })

  it('最終授業から7日以上経つと通常タスクは生成されない', () => {
    // D19 (7/15 水) の 8 日後
    const tasks = getHomeworkForDate(parseLocalDate('2026-07-23'))
    expect(tasks.filter(t => t.studyCategory !== 'basic-training')).toHaveLength(0)
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
    }
  })

  it('冬期講習日の翌日にも同様に出る', () => {
    // 12/26 は F41-01(算数)・F42-01(国語)・F44-01(社会)
    const tasks = getHomeworkForDate(parseLocalDate('2026-12-27'))
    const season = tasks.filter(t => t.studyCategory === 'season-review')
    expect(season.map(t => t.subject).sort()).toEqual(['国語', '社会', '算数'])
  })
})

describe('タスク ID の一意性', () => {
  const dates = ['2026-05-13', '2026-07-31', '2026-08-19', '2026-12-27']
  for (const dateStr of dates) {
    it(`${dateStr} 起点の生成で ID が重複しない`, () => {
      const tasks = generateWeeklyHomework(parseLocalDate(dateStr))
      const ids = tasks.map(t => t.id)
      expect(new Set(ids).size, `重複: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`).toBe(ids.length)
    })
  }
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
})
