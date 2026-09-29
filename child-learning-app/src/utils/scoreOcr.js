import { getStaticMasterUnits } from './importMasterUnits'
import { getCachedGeminiCount, recordGeminiCall } from './geminiUsage'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// ── Gemini API 使用量トラッキング ──────────────────
// 集計実体は src/utils/geminiUsage.js (Firestore + onSnapshot キャッシュ)
const MONTHLY_LIMIT = 50 // 月間上限（回数）
const WARNING_THRESHOLD = 40 // 警告を出す回数

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** 今月の使用状況を取得（同期。未ログイン・未ロード時は count=0） */
export function getGeminiUsage() {
  const count = getCachedGeminiCount()
  return {
    count,
    limit: MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - count),
    isWarning: count >= WARNING_THRESHOLD,
    isOverLimit: count >= MONTHLY_LIMIT,
    month: getCurrentMonthKey(),
  }
}

const PROMPT = `この画像はSAPIXなど塾のテスト成績表です。「総合成績表」と「設問内容別成績表」の両方から数値を読み取り、JSON形式で返してください。
該当する行がない場合はそのキーを省略してください。数値のみ返し、「位」「名」「点」などの文字は含めないでください。

テスト名（testName）と学年（grade、例: "3年生"）も画像から読み取れる場合は含めてください。

■ テスト形式
- 3年生: 2科目（算数・国語）のみ → twoSubjects を使用
- 4年生以上: 4科目（算数・国語・理科・社会）＋ 2科目 → fourSubjects と twoSubjects の両方

■ 総合成績表の列構成（よくあるパターン）
パターンA: 科目 | 得点/配点 | 偏差値 | 順位/受験者数 | 平均点 | 男女別順位/受験者数
→ 同じ行に男女別順位が含まれる場合、そのデータを対応するGenderキーのrank/totalStudentsに入れてください。

パターンB: 科目 | 得点 | 平均点 | 偏差値 | 順位/人数（男女別は別セクション）

■ 設問内容別成績表
科目ごとに分野・設問の内訳が記載されている表です。各行に番号・分野名・得点/配点・平均点があります。
棒グラフが含まれる場合、グラフの値は無視し、数値データのみ読み取ってください。
4科目（算数・国語・理科・社会）すべてに対応してください。

■ 出力JSON形式（該当するキーのみ）
{
  "testName": "テスト名",
  "grade": "X年生",
  "fourSubjects": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "fourSubjectsGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "sansu": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "kokugo": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "rika": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "shakai": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "twoSubjects": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "twoSubjectsGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "sansuGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "kokugoGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "rikaGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "shakaiGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "questionBreakdown": {
    "sansu": [
      { "number": 1, "name": "計算問題", "score": 54, "totalScore": 60, "average": 47.7 },
      { "number": 2, "name": "小問集合", "score": 24, "totalScore": 30, "average": 12.6 }
    ],
    "kokugo": [
      { "number": 1, "name": "漢字の読み書き", "score": 21, "totalScore": 30, "average": 23.3 }
    ],
    "rika": [...],
    "shakai": [...]
  }
}

■ 数値の型
- 偏差値(deviation)と平均点(average)は表に書かれた値を数値で返してください。
- 得点(score)、配点(totalScore)、順位(rank)、受験者数(totalStudents)は整数で返してください。

■ 科目名マッピング
- "2科目計" / "2科目合計" → twoSubjects
- "4科目計" / "4科目合計" → fourSubjects
- "算数" / "算 数" → sansu
- "国語" / "国 語" → kokugo
- "理科" / "理 科" → rika
- "社会" / "社 会" → shakai
- 上記に "男女別" が付く場合 → 対応するGenderキー
- 同じ行に「男女別順位/受験者数」列がある場合 → 対応するGenderキーのrank, totalStudentsに入れる

■ 設問内容別のマッピング
- 設問内容別成績表の科目見出し（算数/国語/理科/社会）→ questionBreakdown の sansu/kokugo/rika/shakai
- 各行: 番号(number), 分野名(name), 得点(score)/配点(totalScore), 平均点(average)

■ 例（総合成績表 パターンA: 同一行に男女別列がある場合）
「2科目計 190/300 57.0 1252/5159 161.9 697/2826」
→ twoSubjects: { score:190, totalScore:300, deviation:57.0, rank:1252, totalStudents:5159, average:161.9 }
→ twoSubjectsGender: { rank:697, totalStudents:2826 }

■ 例（設問内容別成績表）
算数 1 計算問題 54/60 47.7 → questionBreakdown.sansu: [{ number:1, name:"計算問題", score:54, totalScore:60, average:47.7 }]

得点欄が "190 / 300" の形式は score=190, totalScore=300。`

// ── 総評生成プロンプト ────────────────────────────────────

const REVIEW_PROMPT = `あなたは中学受験専門の塾講師です。以下のテスト成績データを分析し、保護者向けの「総評」を日本語で書いてください。

■ 入力データ
1. 総合成績（科目別の得点・偏差値・順位・平均点）
2. 設問内容別成績（分野ごとの得点/配点と平均点）
3. 正答率一覧の誤答情報（間違えた問題の配点・正答率）

■ 総評に含めるべき内容（順番通りに書いてください）

【全体概況】（2-3文）
- 偏差値と順位から見た全体的な出来

【科目別分析】（各科目2-3文）
- 得点率と平均点との差
- 設問内容別で特に良かった分野と悪かった分野
- 「配点が大きいのに落とした分野」は特に指摘

【要注意問題】（箇条書き）
- 誤答一覧で【取れるはず】の付いた問題を「取れるはずの問題」として、失点とあわせて列挙

【今後の学習アドバイス】（3-5項目の箇条書き）
- 具体的に何を優先すべきか
- 分野名を明示して対策を提案

■ 文体
- 保護者が読みやすい丁寧語
- 具体的な数値を引用すること
- マークダウン形式（見出しは##、箇条書きは-）
- 全体で400-600字程度

■ テストデータ:
`

// 偏差値・平均点は小数第1位の文字列で保持する（57 → "57.0"）
const DECIMAL_FIELDS = ['deviation', 'average']

function normalizeDecimals(section) {
  if (!section || typeof section !== 'object') return section
  const out = { ...section }
  for (const field of DECIMAL_FIELDS) {
    const n = Number(out[field])
    if (out[field] != null && out[field] !== '' && Number.isFinite(n)) out[field] = n.toFixed(1)
  }
  return out
}

/**
 * Gemini API 呼び出しで発生しうる種別を区別するためのエラークラス。
 * code は機械可読、message は UI にそのまま出せる文言を入れる。
 */
export class GeminiError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'GeminiError'
    this.code = code
    this.status = details.status
    this.body = details.body
    this.cause = details.cause
  }
}

/**
 * Gemini API を呼び出し、テキスト応答を返す共通ヘルパー。
 * pre-flight チェック（APIキー / 月次上限）と HTTP ステータス分岐、
 * 使用量記録までを一元化する。エラーは GeminiError で正規化して throw。
 *
 * @param {object} body - Gemini API リクエスト body
 * @returns {Promise<string>} candidates[0].content.parts[0].text
 */
async function callGemini(body) {
  if (!GEMINI_API_KEY) {
    throw new GeminiError(
      'NO_API_KEY',
      'Gemini APIキーが設定されていません（VITE_GEMINI_API_KEY）'
    )
  }
  if (getGeminiUsage().isOverLimit) {
    throw new GeminiError(
      'OVER_LIMIT',
      `今月のGemini API使用上限（${MONTHLY_LIMIT}回）に達しました。来月まで利用できません`
    )
  }

  let response
  try {
    response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new GeminiError(
      'NETWORK',
      '通信エラーが発生しました。ネットワーク接続を確認してください',
      { cause: err }
    )
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    const status = response.status
    if (status === 401 || status === 403) {
      throw new GeminiError('AUTH', 'Gemini APIキーが無効、または権限がありません', { status, body: errBody })
    }
    if (status === 429) {
      throw new GeminiError(
        'RATE_LIMIT',
        'Gemini API の呼び出し頻度上限に達しました。少し待ってから再試行してください',
        { status, body: errBody }
      )
    }
    if (status >= 500) {
      throw new GeminiError(
        'TRANSIENT',
        'Gemini API の一時障害です。しばらくしてから再試行してください',
        { status, body: errBody }
      )
    }
    throw new GeminiError('UNKNOWN', `Gemini API エラー: ${status}`, { status, body: errBody })
  }

  // 課金対象として記録（API成功時点でカウント）
  recordGeminiCall()

  const data = await response.json().catch(() => null)
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function extractScoresFromImage(file) {
  const base64 = await fileToBase64(file)
  const mimeType = file.type || 'image/png'
  const text = await callGemini({
    contents: [{
      parts: [
        { text: PROMPT },
        { inline_data: { mime_type: mimeType, data: base64 } }
      ]
    }],
    generationConfig: { responseMimeType: 'application/json' },
  })

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    throw new GeminiError('INVALID_FORMAT', '成績データの解析に失敗しました', { cause: err })
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new GeminiError('INVALID_FORMAT', '成績データを読み取れませんでした。別の画像で試してください')
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (key !== 'testName' && key !== 'grade' && key !== 'questionBreakdown') {
      parsed[key] = normalizeDecimals(value)
    }
  }
  return parsed
}

// ── 正答率一覧表から誤答を抽出 ──────────────────────────────

const WRONG_ANSWERS_PROMPT = `この画像はSAPIXなど塾のテストの「正答率一覧表」です。
正誤欄が「×」の問題（間違えた問題）をすべて抽出してJSON配列で返してください。
部分点がある場合（正誤欄に数値や「△」がある場合）も含めてください。

■ 表の構成（よくあるパターン）
- 科目の見出し（算数、国語、理科、社会など）が左端や上部にある
- 列: 設問No. | 配点 | 正誤(○/×/数値) | 正答率(%)
- 正誤が「○」の問題は除外してください
- 正誤が「×」の問題を抽出してください
- 正誤欄に数値がある場合は部分点として扱ってください（例: 4 → partialScore: 4）

■ 科目名マッピング
- 算数/算 数 → "算数"
- 国語/国 語 → "国語"
- 理科/理 科 → "理科"
- 社会/社 会 → "社会"

■ 出力JSON形式
[
  {
    "subject": "算数",
    "problemNumber": "2-(1)ねん土",
    "points": 2,
    "correctRate": 89.5,
    "partialScore": null
  },
  {
    "subject": "算数",
    "problemNumber": "7-(2)",
    "points": 8,
    "correctRate": 15.6,
    "partialScore": 4
  }
]

- partialScore: 部分点がある場合はその得点（数値）。完全不正解(×)の場合はnull。
- correctRate: 正答率（小数あり）
- points: 配点（整数）
- problemNumber: 設問No.をそのまま文字列で（例: "1-(3)", "3-問五", "2-(1)ねん土"）`

export async function extractWrongAnswersFromImage(file) {
  const base64 = await fileToBase64(file)
  const mimeType = file.type || 'image/png'
  const text = await callGemini({
    contents: [{
      parts: [
        { text: WRONG_ANSWERS_PROMPT },
        { inline_data: { mime_type: mimeType, data: base64 } }
      ]
    }],
    generationConfig: { responseMimeType: 'application/json' },
  })

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    throw new GeminiError('INVALID_FORMAT', '誤答データの解析に失敗しました', { cause: err })
  }
  if (!Array.isArray(parsed)) {
    throw new GeminiError('INVALID_FORMAT', '誤答データを読み取れませんでした。別の画像で試してください')
  }
  return parsed
}

// ── 総評生成 ──────────────────────────────────────────────

/**
 * テスト成績データから AI 総評を生成
 * @param {Object} scoreData - selectedScore (testScores ドキュメント)
 * @param {Array} wrongAnswers - 誤答の問題クリップ配列
 * @returns {Promise<string>} マークダウン形式の総評テキスト
 */
export async function generateTestReview(scoreData, wrongAnswers = []) {
  // テストデータを構造化テキストに変換
  const subjectKeys = [
    { key: 'sansu', label: '算数' },
    { key: 'kokugo', label: '国語' },
    { key: 'rika', label: '理科' },
    { key: 'shakai', label: '社会' },
  ]

  let dataText = `テスト名: ${scoreData.testName || '不明'}\n`
  dataText += `学年: ${scoreData.grade || '不明'}\n\n`

  // 総合成績
  dataText += '【総合成績】\n'
  if (scoreData.fourSubjects) {
    const s = scoreData.fourSubjects
    dataText += `4科目計: ${s.score}/${s.totalScore} 偏差値${s.deviation} 順位${s.rank}/${s.totalStudents} 平均${s.average}\n`
  }
  if (scoreData.twoSubjects) {
    const s = scoreData.twoSubjects
    dataText += `2科目計: ${s.score}/${s.totalScore} 偏差値${s.deviation} 順位${s.rank}/${s.totalStudents} 平均${s.average}\n`
  }
  for (const { key, label } of subjectKeys) {
    if (scoreData[key]) {
      const s = scoreData[key]
      dataText += `${label}: ${s.score}/${s.totalScore} 偏差値${s.deviation} 順位${s.rank}/${s.totalStudents} 平均${s.average}\n`
    }
  }

  // 設問内容別
  if (scoreData.questionBreakdown) {
    dataText += '\n【設問内容別成績】\n'
    for (const { key, label } of subjectKeys) {
      const breakdown = scoreData.questionBreakdown[key]
      if (breakdown?.length) {
        dataText += `\n${label}:\n`
        for (const item of breakdown) {
          const pct = item.totalScore > 0 ? Math.round(item.score / item.totalScore * 100) : 0
          dataText += `  ${item.number}. ${item.name}: ${item.score}/${item.totalScore}（得点率${pct}%）平均${item.average}\n`
        }
      }
    }
  }

  // 誤答情報
  if (wrongAnswers.length > 0) {
    dataText += '\n【誤答一覧（正答率一覧表より）】\n'
    for (const p of wrongAnswers) {
      const partial = p.partialScore != null ? `部分点${p.partialScore}` : '×'
      const lost = Number(p.points || 0) - Number(p.partialScore || 0)
      const shouldGet = Number(p.correctRate) >= 50 ? ' 【取れるはず】' : ''
      dataText += `  ${p.subject} ${p.problemNumber} 配点${p.points}点 正答率${p.correctRate ?? '?'}% ${partial} 失点${lost}点${shouldGet}\n`
    }
  }

  const prompt = REVIEW_PROMPT + dataText
  const reviewText = await callGemini({
    contents: [{ parts: [{ text: prompt }] }]
  })

  if (!reviewText.trim()) {
    throw new GeminiError('EMPTY_RESPONSE', '総評を生成できませんでした。再試行してください')
  }
  return reviewText.trim()
}

// ── 問題番号 → 分野 → unitIds マッピング ─────────────────

// 科目名 → questionBreakdown キー
const SUBJECT_TO_BREAKDOWN_KEY = {
  '算数': 'sansu',
  '国語': 'kokugo',
  '理科': 'rika',
  '社会': 'shakai',
}

// 分野名のキーワードと master unit のマッチングルール
const FIELD_TO_UNIT_KEYWORDS = {
  // 算数
  '計算': ['SAN_CALC_BASIC'],
  '基本問題': ['SAN_CALC_BASIC'],
  '規則': ['SAN_PATTERN_SEQ'],
  '数列': ['SAN_PATTERN_SEQ'],
  '周期': ['SAN_PATTERN_CYCLE'],
  '場合の数': ['SAN_COMB_COUNT'],
  '和差': ['SAN_SPEC_WACHA'],
  'つるかめ': ['SAN_SPEC_TSURU'],
  '植木': ['SAN_SPEC_TREE'],
  '方陣': ['SAN_SPEC_SQUARE'],
  '平均': ['SAN_SPEC_AVG'],
  '仕事': ['SAN_SPEC_WORK'],
  '速さ': ['SAN_SPEED_BASIC'],
  '旅人': ['SAN_SPEED_TRAVEL'],
  '通過': ['SAN_SPEED_PASS'],
  '流水': ['SAN_SPEED_RIVER'],
  '時計': ['SAN_SPEED_CLOCK'],
  '割合': ['SAN_RATIO_BASIC'],
  '売買': ['SAN_RATIO_PROFIT'],
  '食塩': ['SAN_RATIO_CONC'],
  '比': ['SAN_PROP_BASIC'],
  '比例': ['SAN_PROP_RATIO'],
  '角度': ['SAN_PLANE_ANGLE'],
  '面積': ['SAN_PLANE_AREA'],
  '円': ['SAN_PLANE_CIRCLE'],
  'おうぎ': ['SAN_PLANE_CIRCLE'],
  '図形の移動': ['SAN_PLANE_MOVE'],
  '相似': ['SAN_PLANE_SIMILAR'],
  '立体': ['SAN_SOLID_BASIC', 'SAN_SOLID_VOLUME'],
  'ねん土': ['SAN_SOLID_BASIC'],
  '展開図': ['SAN_SOLID_BASIC'],
  '体積': ['SAN_SOLID_VOLUME'],
  '表面積': ['SAN_SOLID_VOLUME'],
  '切断': ['SAN_SOLID_CUT'],
  '回転': ['SAN_SOLID_ROTATE'],
  '水位': ['SAN_SOLID_WATER'],
  'ブラックボックス': ['SAN_LOGIC_COND'],
  'グラフ': ['SAN_LOGIC_GRAPH'],
  '条件': ['SAN_LOGIC_COND'],
  '論理': ['SAN_LOGIC_COND'],
  'つみ木': ['SAN_SOLID_BASIC'],
  '積み木': ['SAN_SOLID_BASIC'],
  '重ね': ['SAN_PLANE_AREA'],
  '時計ばん': ['SAN_SPEED_CLOCK'],
  '約数': ['SAN_NUM_DIVISOR'],
  '倍数': ['SAN_NUM_DIVISOR'],
  '単位': ['SAN_CALC_UNIT'],
  // 国語
  '漢字': ['KOK_KNJ_WRITE', 'KOK_KNJ_READ'],
  '読み書き': ['KOK_KNJ_WRITE', 'KOK_KNJ_READ'],
  '熟語': ['KOK_KNJ_COMPOUND'],
  '組み立て': ['KOK_KNJ_COMPOUND'],
  '物語': ['KOK_GEN_STORY'],
  '読みとり': ['KOK_GEN_STORY', 'KOK_LOG_EMOTION'],
  '読み取り': ['KOK_GEN_STORY', 'KOK_LOG_EMOTION'],
  '説明文': ['KOK_GEN_EXPLAIN'],
  '論説': ['KOK_GEN_THESIS'],
  '随筆': ['KOK_GEN_ESSAY'],
  '詩': ['KOK_GEN_POEM'],
  '俳句': ['KOK_GEN_HAIKU'],
  '短歌': ['KOK_GEN_HAIKU'],
  'ことわざ': ['KOK_KNJ_PROVERB'],
  '慣用句': ['KOK_KNJ_IDIOM'],
  '敬語': ['KOK_KNJ_KEIGO'],
  '文法': ['KOK_GRAM_STRUCT'],
  '品詞': ['KOK_GRAM_PARTS'],
  '接続': ['KOK_LOG_CONJ'],
  '指示語': ['KOK_LOG_DEMONST'],
  '心情': ['KOK_LOG_EMOTION'],
  '記述': ['KOK_SKL_SHORT'],
}

/**
 * 問題番号から設問内容別の分野名を取得し、対応する unitIds を返す
 * @param {string} problemNumber - "2-(1)" のような問題番号
 * @param {string} subject - "算数" | "国語" | "理科" | "社会"
 * @param {Object} questionBreakdown - scoreData.questionBreakdown
 * @returns {string[]} マッチした unitIds
 */
export function mapProblemToUnitIds(problemNumber, subject, questionBreakdown) {
  if (!problemNumber || !subject || !questionBreakdown) return []

  const breakdownKey = SUBJECT_TO_BREAKDOWN_KEY[subject]
  if (!breakdownKey) return []

  const breakdown = questionBreakdown[breakdownKey]
  if (!breakdown?.length) return []

  // 問題番号の先頭の数字を抽出（例: "2-(1)ねん土" → 2, "7-(2)" → 7）
  const numMatch = problemNumber.match(/^(\d+)/)
  if (!numMatch) return []
  const problemNum = parseInt(numMatch[1], 10)

  // questionBreakdown から該当する分野名を取得
  const field = breakdown.find(b => b.number === problemNum)
  if (!field?.name) return []

  const fieldName = field.name

  // キーワードマッチで unitIds を検索
  const matchedIds = new Set()

  for (const [keyword, unitIds] of Object.entries(FIELD_TO_UNIT_KEYWORDS)) {
    if (fieldName.includes(keyword)) {
      for (const id of unitIds) matchedIds.add(id)
    }
  }

  // キーワードマッチが無い場合は master units の name/category で部分一致検索
  if (matchedIds.size === 0) {
    const units = getStaticMasterUnits(subject)
    for (const unit of units) {
      if (unit.name.includes(fieldName) || fieldName.includes(unit.name) ||
          unit.category.includes(fieldName) || fieldName.includes(unit.category)) {
        matchedIds.add(unit.id)
      }
    }
  }

  return [...matchedIds]
}
