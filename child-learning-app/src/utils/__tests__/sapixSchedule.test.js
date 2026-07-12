// sapixSchedule のカレンダー整合性テスト
//
// カレンダー定数（D01〜D36 / 季節講習）はモジュール内 const のため、
// 公開 API（generateSapixSessions / getStudyDateFromCode）経由で検証する。
// スケジュール追加・修正時の曜日ミス / コード重複 / 欠番を回帰的に検出する。

import { describe, it, expect } from 'vitest'
import {
  generateSapixSessions,
  getStudyDateFromCode,
  extractSapixCode,
  gradeFromCode,
  SAPIX_SUMMER_4_2026,
  SAPIX_WINTER_4_2026,
  SAPIX_SPRING_4_2026,
} from '../sapixSchedule'
import { parseLocalDate } from '../dateUtils'

const WED = 3
const FRI = 5

const sessions = generateSapixSessions()
const regular = sessions.filter(s => s.dNumber.startsWith('D'))
const summer = sessions.filter(s => s.dNumber === '夏期')
const winter = sessions.filter(s => s.dNumber === '冬期')
const spring = sessions.filter(s => s.dNumber === '春期')

describe('通常授業カレンダー（D01〜D36）', () => {
  it('算数・理科の授業日はすべて水曜', () => {
    for (const s of regular.filter(s => s.subject === '算数' || s.subject === '理科')) {
      expect(parseLocalDate(s.date).getDay(), `${s.dNumber} ${s.textCode} (${s.date})`).toBe(WED)
    }
  })

  it('国語・社会の授業日はすべて金曜', () => {
    for (const s of regular.filter(s => s.subject === '国語' || s.subject === '社会')) {
      expect(parseLocalDate(s.date).getDay(), `${s.dNumber} ${s.textCode} (${s.date})`).toBe(FRI)
    }
  })

  it('全セッションが subject / textCode / name を持つ', () => {
    for (const s of sessions) {
      expect(s.subject, `${s.date} ${s.textCode}`).toBeTruthy()
      expect(s.textCode, `${s.date} ${s.subject}`).toBeTruthy()
      expect(s.name, `${s.date} ${s.textCode}`).toBeTruthy()
    }
  })

  it('セッションは日付昇順にソートされている', () => {
    for (let i = 1; i < sessions.length; i++) {
      expect(sessions[i].date >= sessions[i - 1].date).toBe(true)
    }
  })
})

describe('夏期講習カレンダー（4α）', () => {
  it('全42コマ（算数14 / 国語12 / 理科8 / 社会8）', () => {
    expect(summer).toHaveLength(42)
    const count = subj => summer.filter(s => s.subject === subj).length
    expect(count('算数')).toBe(14)
    expect(count('国語')).toBe(12)
    expect(count('理科')).toBe(8)
    expect(count('社会')).toBe(8)
  })

  it('テキストコードに重複・欠番がない', () => {
    const codes = summer.map(s => s.textCode)
    expect(new Set(codes).size).toBe(codes.length)
    const nums = prefix =>
      codes.filter(c => c.startsWith(prefix)).map(c => parseInt(c.slice(4))).sort((a, b) => a - b)
    expect(nums('N41')).toEqual([...Array(14)].map((_, i) => i + 1))
    expect(nums('N42')).toEqual([...Array(12)].map((_, i) => i + 1))
    expect(nums('N43')).toEqual([...Array(8)].map((_, i) => i + 1))
    expect(nums('N44')).toEqual([...Array(8)].map((_, i) => i + 1))
  })

  it('日程リスト（全14日）と一致し、各日ちょうど3コマ', () => {
    const listDates = SAPIX_SUMMER_4_2026.map(d => d.date)
    expect(listDates).toHaveLength(14)
    const byDate = {}
    for (const s of summer) byDate[s.date] = (byDate[s.date] || 0) + 1
    expect(Object.keys(byDate).sort()).toEqual([...listDates].sort())
    for (const [date, n] of Object.entries(byDate)) {
      expect(n, date).toBe(3)
    }
  })

  it('日程リストの曜日表記が実際の曜日と一致', () => {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土']
    for (const { date, day } of SAPIX_SUMMER_4_2026) {
      expect(dayNames[parseLocalDate(date).getDay()], date).toBe(day)
    }
  })
})

describe('冬期・春期講習カレンダー', () => {
  it('冬期: 全6日 × 3コマ = 18セッション、曜日表記が正しい', () => {
    expect(winter).toHaveLength(18)
    const dayNames = ['日', '月', '火', '水', '木', '金', '土']
    for (const { date, day } of SAPIX_WINTER_4_2026) {
      expect(dayNames[parseLocalDate(date).getDay()], date).toBe(day)
    }
  })

  it('春期: 全5日 × 3コマ = 15セッション、曜日表記が正しい', () => {
    expect(spring).toHaveLength(15)
    const dayNames = ['日', '月', '火', '水', '木', '金', '土']
    for (const { date, day } of SAPIX_SPRING_4_2026) {
      expect(dayNames[parseLocalDate(date).getDay()], date).toBe(day)
    }
  })
})

describe('getStudyDateFromCode', () => {
  it('通常コード: 算数B・理科は水曜日、国語B・社会は金曜日を返す', () => {
    expect(getStudyDateFromCode('41A-01')).toBe('2026-02-11')
    expect(getStudyDateFromCode('41B-25')).toBe('2026-10-14')
    expect(getStudyDateFromCode('430-20')).toBe('2026-09-02')
    expect(getStudyDateFromCode('42B-19')).toBe('2026-07-10')
    expect(getStudyDateFromCode('440-36')).toBe('2027-01-22')
  })

  it('季節講習コード (H/N/F) はカレンダーから逆引き', () => {
    expect(getStudyDateFromCode('H41-01')).toBe('2026-03-28')
    expect(getStudyDateFromCode('N41-05')).toBe('2026-08-06')
    expect(getStudyDateFromCode('N44-08')).toBe('2026-08-22')
    expect(getStudyDateFromCode('F41-01')).toBe('2026-12-26')
    expect(getStudyDateFromCode('F43-03')).toBe('2027-01-05')
  })

  it('不正・範囲外のコードは null', () => {
    expect(getStudyDateFromCode('41B-37')).toBeNull()
    expect(getStudyDateFromCode('41B-00')).toBeNull()
    expect(getStudyDateFromCode('99X-01')).toBeNull()
    expect(getStudyDateFromCode('N41-99')).toBeNull()
  })
})

describe('extractSapixCode / gradeFromCode', () => {
  it('ファイル名からコードを抽出できる', () => {
    expect(extractSapixCode('41B-02.pdf')).toBe('41B-02')
    expect(extractSapixCode('スキャン_430-15 (1).pdf')).toBe('430-15')
    expect(extractSapixCode('N41-03.pdf')).toBe('N41-03')
    expect(extractSapixCode('memo.pdf')).toBeNull()
  })

  it('コードから学年を推定できる（季節講習は2文字目）', () => {
    expect(gradeFromCode('41B-02')).toBe('4年生')
    expect(gradeFromCode('N41-01')).toBe('4年生')
    expect(gradeFromCode('H51-01')).toBe('5年生')
  })
})
