// テスト復習スケジュール生成のテスト
//
// エビングハウス間隔（翌日/1週間後/1ヶ月後）の日付計算と、
// 予定テスト（status: 'scheduled'）を除外するガードを回帰的に検証する。

import { describe, it, expect } from 'vitest'
import {
  REVIEW_INTERVALS,
  generateTestReviews,
  getTestReviewsForDate,
  getTestReviewsByDate,
} from '../testReviews'
import { parseLocalDate } from '../dateUtils'

const completedTest = {
  id: 'test-1',
  testName: '5月度マンスリー確認テスト',
  testDate: '2026-05-08',
  status: 'completed',
}

describe('generateTestReviews', () => {
  it('completed テストには 翌日/1週間後/1ヶ月後 の3件が生成される', () => {
    const reviews = generateTestReviews([completedTest])
    expect(reviews).toHaveLength(3)
    expect(reviews.map(r => r.dueDate).sort()).toEqual([
      '2026-05-09', // 翌日
      '2026-05-15', // 1週間後
      '2026-06-07', // 1ヶ月後 (30日)
    ])
  })

  it('id は review-{testId}-{intervalKey} 形式（homeworkDone のキーとして安定）', () => {
    const reviews = generateTestReviews([completedTest])
    const ids = reviews.map(r => r.id).sort()
    expect(ids).toEqual([
      'review-test-1-next-day',
      'review-test-1-one-month',
      'review-test-1-one-week',
    ])
  })

  it('scheduled（予定登録のみ・未実施）のテストは復習対象外', () => {
    const scheduled = { ...completedTest, id: 'test-2', status: 'scheduled' }
    expect(generateTestReviews([scheduled])).toHaveLength(0)
  })

  it('status なしの旧データは completed 扱いで復習対象に含める', () => {
    const legacy = { id: 'test-3', testName: '旧テスト', testDate: '2026-03-08' }
    expect(generateTestReviews([legacy])).toHaveLength(3)
  })

  it('testDate や id を欠くデータはスキップ（クラッシュしない）', () => {
    expect(generateTestReviews([{ id: 'x' }, { testDate: '2026-05-08' }, null, undefined])).toHaveLength(0)
    expect(generateTestReviews([{ id: 'y', testDate: 'invalid-date' }])).toHaveLength(0)
  })

  it('複数テストの復習が混在生成される', () => {
    const tests = [
      completedTest,
      { id: 'test-4', testName: '組分け', testDate: '2026-06-28' },
      { id: 'test-5', testName: '予定', testDate: '2026-07-17', status: 'scheduled' },
    ]
    const reviews = generateTestReviews(tests)
    expect(reviews).toHaveLength(6) // completed 2件 × 3 interval（scheduled は除外）
  })
})

describe('getTestReviewsForDate', () => {
  it('dueDate が一致する復習だけを返す', () => {
    const reviews = getTestReviewsForDate([completedTest], parseLocalDate('2026-05-09'))
    expect(reviews).toHaveLength(1)
    expect(reviews[0].intervalKey).toBe('next-day')
    expect(reviews[0].testName).toBe('5月度マンスリー確認テスト')
  })

  it('該当なしの日は空配列', () => {
    expect(getTestReviewsForDate([completedTest], parseLocalDate('2026-05-10'))).toHaveLength(0)
  })
})

describe('getTestReviewsByDate', () => {
  it('指定日数分の日付キーを持ち、該当日に復習が入る', () => {
    const byDate = getTestReviewsByDate([completedTest], parseLocalDate('2026-05-09'), 7)
    expect(Object.keys(byDate)).toHaveLength(7)
    expect(byDate['2026-05-09']).toHaveLength(1) // 翌日復習
    expect(byDate['2026-05-15']).toHaveLength(1) // 1週間後復習
    expect(byDate['2026-05-10']).toHaveLength(0)
  })
})

describe('REVIEW_INTERVALS 定義', () => {
  it('翌日(1) / 1週間後(7) / 1ヶ月後(30) の3段階', () => {
    expect(REVIEW_INTERVALS.map(i => i.daysAfter)).toEqual([1, 7, 30])
  })
})
