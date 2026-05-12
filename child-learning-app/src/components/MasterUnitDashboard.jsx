import { useState, useEffect, useMemo, useCallback } from 'react'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import {
  getLessonLogs,
  computeAllProficiencies,
  getProficiencyLevel,
  addLessonLogWithStats,
  deleteLessonLog,
  resetUnitLessonData,
  EVALUATION_SCORES,
  EVALUATION_LABELS,
  EVALUATION_COLORS,
} from '../utils/lessonLogs'
import { subjectEmojis, subjectColors } from '../utils/constants'
import { getAllProblems, reviewStatusInfo, missTypeLabel } from '../utils/problems'
import { getAllTestScores } from '../utils/testScores'
import TextDetailModal from './TextDetailModal'
import Loading from './Loading'
import './MasterUnitDashboard.css'

const SUBJECTS = ['算数', '国語', '理科', '社会']
const SUBJECT_ICONS = { 算数: '🔢', 国語: '📖', 理科: '🔬', 社会: '🌏' }

function MasterUnitDashboard({ sapixTexts = [], userId }) {
  const [loading, setLoading] = useState(true)
  const [masterUnits, setMasterUnits] = useState([])
  // stats: { unitId: { currentScore, statusLevel, logCount } }
  const [stats, setStats] = useState({})
  // allLogs: キャッシュ済み lessonLogs（ドリルダウンにも使用）
  const [allLogs, setAllLogs] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('算数')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // ドリルダウンモーダル
  const [drillUnit, setDrillUnit] = useState(null)
  const [drillLogs, setDrillLogs] = useState([])
  const [drillProblems, setDrillProblems] = useState([])
  const [allProblems, setAllProblems] = useState(null) // null = 未ロード
  const [testNameMap, setTestNameMap] = useState({}) // sourceId → testName

  // テキスト詳細モーダル
  const [detailText, setDetailText] = useState(null)

  // 練習記録モーダル
  const [practiceUnit, setPracticeUnit] = useState(null)
  const [practiceEval, setPracticeEval] = useState(null)
  const [saving, setSaving] = useState(false)

  // テキスト個別評価
  const [evaluatingTextId, setEvaluatingTextId] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (!userId) return

      const [units, logsResult] = await Promise.all([
        Promise.resolve(getStaticMasterUnits()),
        getLessonLogs(userId),
      ])

      setMasterUnits(units)

      if (!logsResult.success) {
        console.error('lessonLogs 読み取り失敗:', logsResult.error)
      }
      const logs = logsResult.success ? logsResult.data : []
      setAllLogs(logs)  // stats は useEffect[allLogs] で自動再計算
    } catch (err) {
      console.error('データ取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // allLogs が変わったら stats を再計算
  useEffect(() => {
    const profMap = computeAllProficiencies(allLogs)
    const statsData = {}
    for (const [unitId, data] of Object.entries(profMap)) {
      statsData[unitId] = {
        currentScore: data.score,
        statusLevel: data.level,
        logCount: data.logCount,
        directCount: data.directCount || 0,
        indirectCount: data.indirectCount || 0,
      }
    }
    setStats(statsData)
  }, [allLogs])

  // allLogs または drillUnit が変わったらドリルログを自動更新
  useEffect(() => {
    if (!drillUnit) return
    const unitLogs = allLogs
      .filter(log => log.unitIds?.includes(drillUnit.id))
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? new Date(a.createdAt ?? 0).getTime()
        const tb = b.createdAt?.toMillis?.() ?? new Date(b.createdAt ?? 0).getTime()
        return tb - ta
      })
    setDrillLogs(unitLogs)
  }, [allLogs, drillUnit])

  // drillUnit が開かれたとき、problems を取得してフィルタ
  useEffect(() => {
    if (!drillUnit || !userId) {
      setDrillProblems([])
      return
    }
    async function loadProblems() {
      // 全 problems を一度だけ取得（キャッシュ）
      let problems = allProblems
      if (!problems) {
        const [probResult, scoresResult] = await Promise.all([
          getAllProblems(userId),
          getAllTestScores(userId),
        ])
        problems = probResult.success ? probResult.data : []
        setAllProblems(problems)
        // sourceId → testName マップを構築
        if (scoresResult.success) {
          const map = {}
          for (const s of scoresResult.data) map[s.id] = s.testName
          setTestNameMap(map)
        }
      }
      // この単元に関連する不正解問題をフィルタ
      const unitProblems = problems.filter(
        p => !p.isCorrect && p.unitIds?.includes(drillUnit.id)
      )
      setDrillProblems(unitProblems)
    }
    loadProblems()
  }, [drillUnit, userId, allProblems])

  // ドリルダウン：メイン単元として評価されたログに共起するサブ単元を集計
  const coOccurringUnits = drillUnit
    ? (() => {
        const subCount = {}
        for (const log of allLogs) {
          const mainId = log.mainUnitId || (log.unitIds || [])[0]
          if (mainId !== drillUnit.id) continue
          for (const id of (log.unitIds || [])) {
            if (id !== drillUnit.id) subCount[id] = (subCount[id] || 0) + 1
          }
        }
        return Object.entries(subCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => ({
            id, count,
            name: masterUnits.find(u => u.id === id)?.name || id,
          }))
      })()
    : []

  // ドリルダウン：単元セルをタップ（同期処理。allLogsから即時フィルタ）
  const handleDrillDown = (unit) => {
    setDrillUnit(unit)
    // useEffect が drillUnit の変化を検知して drillLogs を更新する
  }

  // 練習記録
  const handleSavePractice = async () => {
    if (!practiceEval || !userId) return

    setSaving(true)
    try {
      const result = await addLessonLogWithStats(userId, {
        unitIds: [practiceUnit.id],
        subject: practiceUnit.subject,
        sourceType: 'practice',
        sourceName: practiceUnit.name,
        date: new Date(),
        performance: EVALUATION_SCORES[practiceEval],
        evaluationKey: practiceEval,
      })
      if (!result.success) {
        console.error('練習記録エラー:', result.error)
        return
      }
      setPracticeUnit(null)
      setPracticeEval(null)
      await loadData()
    } catch (err) {
      console.error('記録エラー:', err)
    } finally {
      setSaving(false)
    }
  }

  // テキスト個別評価
  const handleEvaluateText = async (text, evalKey) => {
    if (!text.unitIds?.length || !userId) return
    setEvaluatingTextId(text.id)
    try {
      const result = await addLessonLogWithStats(userId, {
        unitIds: text.unitIds,
        subject: text.subject,
        sourceType: 'sapixTask',
        sourceId: text.id,
        sourceName: `${text.textName}${text.textNumber ? ' ' + text.textNumber : ''}`,
        date: new Date(),
        performance: EVALUATION_SCORES[evalKey],
        evaluationKey: evalKey,
      })
      if (result.success) {
        setAllLogs(prev => [result.data, ...prev])
      }
    } finally {
      setEvaluatingTextId(null)
    }
  }

  // 個別ログ削除
  const [deletingLogId, setDeletingLogId] = useState(null)
  const handleDeleteLog = async (log) => {
    if (!window.confirm(`この評価記録を削除しますか？\n${getSourceLabel(log)} (${formatLogDate(log.date || log.createdAt)})`)) return
    if (!userId) return
    setDeletingLogId(log.id)
    try {
      const result = await deleteLessonLog(userId, log.id, log.unitIds || [])
      if (result.success) {
        // ローカルstate から削除して即時反映
        setAllLogs(prev => prev.filter(l => l.id !== log.id))
      }
    } finally {
      setDeletingLogId(null)
    }
  }

  // 単元別データリセット
  const [resetting, setResetting] = useState(false)
  const handleResetUnit = async (unitId, unitName) => {
    if (!window.confirm(`「${unitName}」の学習記録をすべて削除しますか？\nこの操作は取り消せません。`)) return
    if (!userId) return
    setResetting(true)
    try {
      const result = await resetUnitLessonData(userId, unitId)
      if (result.success) {
        setDrillUnit(null)
        await loadData()
      }
    } finally {
      setResetting(false)
    }
  }

  // ログのフォーマット
  const formatLogDate = (ts) => {
    if (!ts) return '-'
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  const getEvalEmoji = (log) => {
    if (log.evaluationKey === 'blue') return '🔵'
    if (log.evaluationKey === 'yellow') return '🟡'
    if (log.evaluationKey === 'red') return '🔴'
    if (log.performance >= 90) return '🔵'
    if (log.performance >= 60) return '🟡'
    return '🔴'
  }

  const getSourceLabel = (log) => {
    const type = log.sourceType === 'sapixTask' ? '📘 SAPIXテキスト'
      : log.sourceType === 'pastPaper' ? '📄 過去問'
      : log.sourceType === 'test' || log.sourceType === 'testScore' ? '📝 テスト'
      : '✏️ 練習'
    return `${type}${log.sourceName ? ': ' + log.sourceName : ''}`
  }

  // 単元ごとのテキスト数マップ: { unitId: [text, ...] }
  const textsByUnit = useMemo(() => {
    const map = {}
    for (const text of sapixTexts) {
      for (const uid of (text.unitIds || [])) {
        if (!map[uid]) map[uid] = []
        map[uid].push(text)
      }
    }
    return map
  }, [sapixTexts])

  // テキスト別の最新評価: { textId: { evaluationKey, date, performance } }
  const latestEvalByTextId = useMemo(() => {
    const map = {}
    for (const log of allLogs) {
      if (log.sourceType !== 'sapixTask' || !log.sourceId) continue
      const existing = map[log.sourceId]
      if (!existing) {
        map[log.sourceId] = log
      } else {
        const tNew = log.createdAt?.toMillis?.() ?? new Date(log.createdAt ?? 0).getTime()
        const tOld = existing.createdAt?.toMillis?.() ?? new Date(existing.createdAt ?? 0).getTime()
        if (tNew > tOld) map[log.sourceId] = log
      }
    }
    return map
  }, [allLogs])

  const subjectUnits = masterUnits.filter(u => (u.subject || '算数') === selectedSubject)

  // 教科ごとのカテゴリ順序を動的に取得（order_index順で単元を並べた結果から）
  const categoryOrder = [...new Set(subjectUnits.map(u => u.category))]

  const filteredUnits = subjectUnits.filter(u =>
    selectedCategory === 'all' || u.category === selectedCategory
  )

  const groupedUnits = categoryOrder.reduce((acc, cat) => {
    const units = filteredUnits.filter(u => u.category === cat)
    if (units.length > 0) acc[cat] = units
    return acc
  }, {})

  // サマリー統計
  const totalUnits = subjectUnits.length
  const studiedUnits = subjectUnits.filter(u => stats[u.id]).length
  const avgScore = studiedUnits > 0
    ? Math.round(
        subjectUnits
          .filter(u => stats[u.id])
          .reduce((s, u) => s + (stats[u.id].currentScore || 0), 0) / studiedUnits
      )
    : 0
  const levelCounts = [0, 1, 2, 3, 4, 5].map(lv =>
    subjectUnits.filter(u => (stats[u.id]?.statusLevel ?? 0) === lv).length
  )

  if (loading) {
    return <Loading message="📊 単元データを読み込み中..." />
  }

  return (
    <div className="master-unit-dashboard">
      {/* 教科タブ */}
      <div className="mud-header-row">
        <div className="mud-subject-tabs">
          {SUBJECTS.map(subj => (
            <button
              key={subj}
              className={`mud-subject-btn ${selectedSubject === subj ? 'active' : ''}`}
              style={{ '--subject-color': subjectColors[subj] }}
              onClick={() => { setSelectedSubject(subj); setSelectedCategory('all') }}
            >
              {SUBJECT_ICONS[subj]} {subj}
            </button>
          ))}
        </div>
      </div>

      {/* サマリー＋グリッド */}
      {<>
      {/* サマリー */}
      <div className="mud-summary">
        <div className="mud-summary-card">
          <div className="mud-summary-value">{studiedUnits}<span className="mud-summary-total">/{totalUnits}</span></div>
          <div className="mud-summary-label">学習済み単元</div>
        </div>
        <div className="mud-summary-card">
          <div className="mud-summary-value">{studiedUnits > 0 ? avgScore : '-'}</div>
          <div className="mud-summary-label">平均習熟度</div>
        </div>
        <div className="mud-level-bar">
          {[
            { lv: 5, label: '得意',   color: '#16a34a' },
            { lv: 4, label: '良好',   color: '#2563eb' },
            { lv: 3, label: '普通',   color: '#ca8a04' },
            { lv: 2, label: '要復習', color: '#ea580c' },
            { lv: 1, label: '苦手',   color: '#dc2626' },
          ].map(({ lv, label, color }) => (
            <div key={lv} className="mud-level-item">
              <div className="mud-level-dot" style={{ background: color }} />
              <span>{label}: {levelCounts[lv]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* カテゴリフィルター */}
      <div className="mud-category-filter">
        {['all', ...categoryOrder].map(cat => (
          <button
            key={cat}
            className={`mud-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? '全て' : cat}
          </button>
        ))}
      </div>

      {/* 単元グリッド */}
      <div className="mud-categories">
        {Object.entries(groupedUnits).map(([cat, units]) => (
          <div key={cat} className="mud-category-section" style={{ '--subject-color': subjectColors[selectedSubject] }}>
            <h3 className="mud-cat-title">{cat}</h3>
            <div className="mud-unit-grid">
              {units.map(unit => {
                const unitStat = stats[unit.id]
                const score = unitStat?.currentScore ?? -1
                const level = getProficiencyLevel(score)
                const textCount = textsByUnit[unit.id]?.length || 0
                return (
                  <button
                    key={unit.id}
                    className="mud-unit-cell"
                    style={{
                      '--prof-color': level.color,
                      '--prof-bg': level.bgColor,
                    }}
                    onClick={() => handleDrillDown(unit)}
                    title={`${unit.name}\n${unitStat?.directCount > 0 ? `習熟度: ${score}点 (${level.label}) / 直接${unitStat.directCount}回` : '未学習'}${textCount > 0 ? `\nテキスト: ${textCount}件` : ''}`}
                  >
                    <div className="mud-unit-indicator" style={{ background: level.color }} />
                    <div className="mud-unit-name">{unit.name}</div>
                    {unitStat?.directCount > 0 ? (
                      <>
                        <div className="mud-unit-score">{score}点</div>
                        <div className="mud-unit-level" style={{ color: level.color }}>{level.label}</div>
                        <div className="mud-unit-counts">
                          <span className="mud-direct-count">直{unitStat.directCount}</span>
                          {unitStat.indirectCount > 0 && (
                            <span className="mud-indirect-count">間{unitStat.indirectCount}</span>
                          )}
                          {textCount > 0 && (
                            <span className="mud-text-count">📘{textCount}</span>
                          )}
                        </div>
                      </>
                    ) : unitStat?.indirectCount > 0 ? (
                      <>
                        <div className="mud-unit-level" style={{ color: level.color }}>未学習</div>
                        <div className="mud-unit-counts">
                          <span className="mud-indirect-count">間{unitStat.indirectCount}</span>
                          {textCount > 0 && (
                            <span className="mud-text-count">📘{textCount}</span>
                          )}
                        </div>
                      </>
                    ) : textCount > 0 ? (
                      <>
                        <div className="mud-unit-level" style={{ color: level.color }}>未学習</div>
                        <div className="mud-unit-counts">
                          <span className="mud-text-count">📘{textCount}</span>
                        </div>
                      </>
                    ) : (
                      <div className="mud-unit-level" style={{ color: level.color }}>未学習</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      </>}

      {/* ドリルダウンモーダル */}
      {drillUnit && (
        <div className="modal-overlay-common" onClick={() => setDrillUnit(null)}>
          <div className="mud-modal mud-drill-modal" onClick={e => e.stopPropagation()}>
            <div className="mud-drill-header">
              <div>
                <h3>{drillUnit.name}</h3>
                <p className="mud-drill-cat">{drillUnit.category} / 難易度 {'★'.repeat(drillUnit.difficultyLevel || 1)}</p>
                {stats[drillUnit.id] && (
                  <p className="mud-drill-score" style={{ color: getProficiencyLevel(stats[drillUnit.id].currentScore).color }}>
                    習熟度: {stats[drillUnit.id].currentScore}点 ({getProficiencyLevel(stats[drillUnit.id].currentScore).label})
                  </p>
                )}
              </div>
              <button className="mud-drill-close" onClick={() => setDrillUnit(null)}>×</button>
            </div>

            {/* 共起サブ単元 */}
            {coOccurringUnits.length > 0 && (
              <div className="mud-cooccurring">
                <span className="mud-cooccurring-label">よく一緒に出てくる単元:</span>
                <div className="mud-cooccurring-tags">
                  {coOccurringUnits.map(u => (
                    <span key={u.id} className="mud-cooccurring-tag">
                      {u.name}
                      <span className="mud-cooccurring-count">×{u.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 関連テキスト */}
            {(textsByUnit[drillUnit.id]?.length > 0) && (
              <div className="mud-drill-texts">
                <h4>📘 関連テキスト ({textsByUnit[drillUnit.id].length}件)</h4>
                <div className="mud-drill-text-list">
                  {textsByUnit[drillUnit.id].map(text => (
                    <div key={text.id} className="mud-drill-text-item-wrap">
                      <div
                        className="mud-drill-text-item clickable"
                        onClick={() => setDetailText(text)}
                      >
                        <span className="mud-drill-text-icon">{subjectEmojis[text.subject] || '📘'}</span>
                        <div className="mud-drill-text-info">
                          <span className="mud-drill-text-name">
                            {text.textName}
                            {text.textNumber && ` ${text.textNumber}`}
                          </span>
                          {text.studyDate && (
                            <span className="mud-drill-text-date">📅 {text.studyDate}</span>
                          )}
                        </div>
                        {latestEvalByTextId[text.id] ? (
                          <span className="mud-drill-text-current-eval" title={`最新: ${EVALUATION_LABELS[latestEvalByTextId[text.id].evaluationKey]} (${formatLogDate(latestEvalByTextId[text.id].createdAt)})`}>
                            {getEvalEmoji(latestEvalByTextId[text.id])}
                          </span>
                        ) : (
                          <span className="mud-drill-text-no-eval" title="未評価">−</span>
                        )}
                        <span className="mud-drill-text-arrow">›</span>
                      </div>
                      {text.unitIds?.length > 0 && (
                        <div className="mud-drill-text-eval">
                          <span className="mud-drill-text-eval-label">評価:</span>
                          {['blue', 'yellow', 'red'].map(key => (
                            <button
                              key={key}
                              className={`mud-drill-text-eval-btn ${latestEvalByTextId[text.id]?.evaluationKey === key ? 'current' : ''}`}
                              style={{ '--eval-color': EVALUATION_COLORS[key] }}
                              onClick={() => handleEvaluateText(text, key)}
                              disabled={evaluatingTextId === text.id}
                              title={EVALUATION_LABELS[key]}
                            >
                              {key === 'blue' ? '🔵' : key === 'yellow' ? '🟡' : '🔴'}
                            </button>
                          ))}
                          {evaluatingTextId === text.id && (
                            <span className="mud-drill-text-eval-saving">記録中...</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 練習記録ボタン */}
            <div className="mud-drill-practice">
              <span className="mud-drill-practice-label">練習を記録:</span>
              {['blue', 'yellow', 'red'].map(key => (
                <button
                  key={key}
                  className={`mud-drill-eval-btn ${practiceEval === key ? 'selected' : ''}`}
                  style={{ '--eval-color': EVALUATION_COLORS[key] }}
                  onClick={() => { setPracticeUnit(drillUnit); setPracticeEval(key) }}
                  title={EVALUATION_LABELS[key]}
                >
                  {key === 'blue' ? '🔵' : key === 'yellow' ? '🟡' : '🔴'}
                </button>
              ))}
              {practiceEval && practiceUnit?.id === drillUnit.id && (
                <button
                  className="mud-drill-save-btn"
                  onClick={handleSavePractice}
                  disabled={saving}
                >
                  {saving ? '記録中...' : '記録する'}
                </button>
              )}
            </div>

            {/* この単元の間違い問題 */}
            {drillProblems.length > 0 && (
              <div className="mud-drill-problems">
                <h4>✗ この単元の間違い問題 ({drillProblems.length}件)</h4>
                <div className="mud-drill-problem-list">
                  {drillProblems.map(problem => {
                    const st = reviewStatusInfo(problem.reviewStatus)
                    return (
                      <div key={problem.id} className="mud-drill-problem-item">
                        <span className="mud-problem-number">第{problem.problemNumber}問</span>
                        {problem.sourceType === 'test' && testNameMap[problem.sourceId] && (
                          <span className="mud-problem-source">{testNameMap[problem.sourceId]}</span>
                        )}
                        {problem.missType && (
                          <span className={`mud-problem-miss-type miss-${problem.missType}`}>
                            {missTypeLabel(problem.missType)}
                          </span>
                        )}
                        <span
                          className="mud-problem-review-badge"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                        {problem.correctRate != null && (
                          <span className="mud-problem-correct-rate">
                            正答率{problem.correctRate}%
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 履歴リスト */}
            <div className="mud-drill-history">
              <h4>📋 評価履歴 ({drillLogs.length}件)</h4>
              {drillLogs.length === 0 ? (
                <div className="mud-drill-empty">まだ評価がありません。上のボタンで記録してください。</div>
              ) : (
                <div className="mud-drill-log-list">
                  {drillLogs.map(log => (
                    <div key={log.id} className="mud-drill-log-item">
                      <span className="mud-log-emoji">{getEvalEmoji(log)}</span>
                      <div className="mud-log-info">
                        <span className="mud-log-source">{getSourceLabel(log)}</span>
                        <span className="mud-log-score">{log.performance}点</span>
                      </div>
                      <span className="mud-log-date">{formatLogDate(log.date || log.createdAt)}</span>
                      <button
                        className="mud-log-delete"
                        onClick={() => handleDeleteLog(log)}
                        disabled={deletingLogId === log.id}
                        title="この評価を削除"
                      >
                        {deletingLogId === log.id ? '...' : '×'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 単元データ初期化 */}
            <div className="mud-drill-reset">
              <button
                className="mud-drill-reset-btn"
                onClick={() => handleResetUnit(drillUnit.id, drillUnit.name)}
                disabled={resetting || drillLogs.length === 0}
              >
                {resetting ? 'リセット中...' : 'この単元のデータを初期化'}
              </button>
            </div>

            <div className="mud-drill-footer">
              <button className="mud-drill-done-btn" onClick={() => setDrillUnit(null)}>
                ✓ 完了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* テキスト詳細モーダル */}
      {detailText && userId && (
        <TextDetailModal
          text={detailText}
          userId={userId}
          onClose={() => setDetailText(null)}
          onEvaluated={(newLog) => setAllLogs(prev => [newLog, ...prev])}
          latestEval={latestEvalByTextId[detailText.id] || null}
        />
      )}
    </div>
  )
}

export default MasterUnitDashboard
