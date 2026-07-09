// テスト復習スケジュール自動生成
//
// エビングハウス忘却曲線に基づく分散学習スケジュール:
//   翌日 / 1週間後 / 1ヶ月後
//
// 各テスト (testScores) ごとに上記 3 タイミングの復習タスクを生成。
// データは Firestore に保存せず、testScores から都度生成する。
// 完了状態は既存の homeworkDone マップに review-* キーで保持する。

import { formatDate, parseLocalDate, addDays } from './dateUtils'

export const REVIEW_INTERVALS = [
  { key: 'next-day',  label: '翌日',     daysAfter: 1,  priority: 'A' },
  { key: 'one-week',  label: '1週間後',  daysAfter: 7,  priority: 'A' },
  { key: 'one-month', label: '1ヶ月後',  daysAfter: 30, priority: 'B' },
]

/**
 * 単一テストから全復習タスクを生成
 */
function reviewsForTest(test) {
  if (!test?.testDate || !test?.id) return []
  // 予定登録のみで未実施のテストは復習対象外
  // （status なしの旧データは completed 扱いなので対象に含める）
  if (test.status === 'scheduled') return []
  const testDate = parseLocalDate(test.testDate)
  if (!testDate || isNaN(testDate.getTime())) return []
  return REVIEW_INTERVALS.map(interval => {
    const dueDate = addDays(testDate, interval.daysAfter)
    return {
      id: `review-${test.id}-${interval.key}`,
      testId: test.id,
      testName: test.testName || '(無題のテスト)',
      testDate: test.testDate,
      intervalKey: interval.key,
      intervalLabel: interval.label,
      dueDate: formatDate(dueDate),
      priority: interval.priority,
      isReview: true,
    }
  })
}

/**
 * すべての復習タスクを生成
 * @param {Array} tests testScores 配列
 * @returns {Array} 復習タスク配列
 */
export function generateTestReviews(tests = []) {
  const all = []
  for (const t of tests) all.push(...reviewsForTest(t))
  return all
}

/**
 * 指定日に該当する復習タスクを取得（優先度順）
 */
export function getTestReviewsForDate(tests, date = new Date()) {
  const dateStr = formatDate(date)
  return generateTestReviews(tests)
    .filter(r => r.dueDate === dateStr)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority.localeCompare(b.priority)
      return (a.testDate || '').localeCompare(b.testDate || '')
    })
}

/**
 * 今日 〜 today+days 日間の復習タスクを日付別に
 */
export function getTestReviewsByDate(tests, today = new Date(), days = 7) {
  const all = generateTestReviews(tests)
  const result = {}
  for (let i = 0; i < days; i++) {
    const d = addDays(today, i)
    const dateStr = formatDate(d)
    result[dateStr] = all
      .filter(r => r.dueDate === dateStr)
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority.localeCompare(b.priority)
        return (a.testDate || '').localeCompare(b.testDate || '')
      })
  }
  return result
}
