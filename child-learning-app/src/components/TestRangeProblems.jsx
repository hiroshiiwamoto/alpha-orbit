import { useState, useEffect } from 'react'
import { getProblemsBySource } from '../utils/problems'
import './TestRangeProblems.css'

const subjectOrder = ['算数', '国語', '理科', '社会']
const subjectEmojis = { 算数: '🔢', 国語: '📖', 理科: '🔬', 社会: '🌍' }

function TestRangeProblems({ userId, sapixRange, testName, sapixTexts, onClose, onResolveProblem }) {
  const [problems, setProblems] = useState({}) // { subject: { textCode: [problem, ...] } }
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [zoomedImage, setZoomedImage] = useState(null)

  useEffect(() => {
    if (!sapixRange || !sapixTexts) return

    async function load() {
      setLoading(true)
      const result = {}

      for (const subject of subjectOrder) {
        const codes = sapixRange[subject]
        if (!codes || codes.length === 0) continue

        result[subject] = {}

        for (const code of codes) {
          // sapixTexts の textNumber でマッチ
          const text = sapixTexts.find(t => t.textNumber === code)
          if (!text) continue

          const res = await getProblemsBySource(userId, 'textbook', text.id)
          if (!res.success || !res.data) continue

          // 不正解の問題だけ
          const wrongProblems = res.data.filter(p => !p.isCorrect)
          if (wrongProblems.length > 0) {
            result[subject][code] = wrongProblems.map(p => ({
              ...p,
              textName: text.title || text.textNumber,
            }))
          }
        }
      }

      setProblems(result)
      setLoading(false)
    }

    load()
  }, [userId, sapixRange, sapixTexts])

  const handleResolve = async (problemId) => {
    await onResolveProblem(problemId)
    // ローカル state を更新
    setProblems(prev => {
      const updated = {}
      for (const [subject, texts] of Object.entries(prev)) {
        updated[subject] = {}
        for (const [code, probs] of Object.entries(texts)) {
          updated[subject][code] = probs.map(p =>
            p.id === problemId ? { ...p, reviewStatus: 'done' } : p
          )
        }
      }
      return updated
    })
  }

  // 問題をunresolved/resolvedに分ける
  const categorized = {}
  let totalUnresolved = 0
  let totalResolved = 0

  for (const [subject, texts] of Object.entries(problems)) {
    categorized[subject] = { unresolved: {}, resolved: {} }
    for (const [code, probs] of Object.entries(texts)) {
      const unresolved = probs.filter(p => p.reviewStatus !== 'done')
      const resolved = probs.filter(p => p.reviewStatus === 'done')
      if (unresolved.length > 0) categorized[subject].unresolved[code] = unresolved
      if (resolved.length > 0) categorized[subject].resolved[code] = resolved
      totalUnresolved += unresolved.length
      totalResolved += resolved.length
    }
  }

  const hasAnyProblems = totalUnresolved > 0 || totalResolved > 0

  return (
    <div className="range-problems-overlay" onClick={onClose}>
      <div className="range-problems-modal" onClick={e => e.stopPropagation()}>
        <div className="range-problems-header">
          <div>
            <h3>{testName}</h3>
            <span className="range-problems-subtitle">この範囲の間違い問題</span>
          </div>
          <button className="range-problems-close" onClick={onClose}>&times;</button>
        </div>

        <div className="range-problems-body">
          {loading ? (
            <div className="range-problems-loading">読み込み中...</div>
          ) : !hasAnyProblems ? (
            <div className="range-problems-empty">この範囲の間違い問題はありません 🎉</div>
          ) : (
            <>
              {subjectOrder.map(subject => {
                const cat = categorized[subject]
                if (!cat) return null
                const unresolvedCodes = Object.entries(cat.unresolved)
                const resolvedCodes = Object.entries(cat.resolved)
                if (unresolvedCodes.length === 0 && resolvedCodes.length === 0) return null

                const unresolvedCount = unresolvedCodes.reduce((sum, [, ps]) => sum + ps.length, 0)

                return (
                  <div key={subject} className="range-subject-section">
                    <div className="range-subject-header">
                      <span>{subjectEmojis[subject]} {subject}</span>
                      <span className="range-subject-count">{unresolvedCount}問</span>
                    </div>

                    {unresolvedCodes.map(([code, probs]) => (
                      <div key={code} className="range-text-group">
                        <div className="range-text-label">{code} {probs[0]?.textName || ''}</div>
                        {probs.map(p => (
                          <div key={p.id} className="range-problem-item">
                            <div className="range-problem-info">
                              <span className="range-problem-num">{p.problemNumber}</span>
                              {p.missType && (
                                <span className={`range-miss-badge miss-${p.missType}`}>
                                  {p.missType === 'understanding' ? '理解不足' : p.missType === 'careless' ? 'ケアレス' : '未習'}
                                </span>
                              )}
                            </div>
                            {p.imageUrls?.length > 0 && (
                              <img
                                src={p.imageUrls[0]}
                                alt={p.problemNumber}
                                className="range-problem-image"
                                onClick={() => setZoomedImage(p.imageUrls[0])}
                              />
                            )}
                            <button
                              className="range-resolve-btn"
                              onClick={() => handleResolve(p.id)}
                            >
                              ✅ できた
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}

                    {resolvedCodes.length > 0 && (
                      <div className="range-resolved-section">
                        <button
                          className="range-resolved-toggle"
                          onClick={() => setShowResolved(prev => !prev)}
                        >
                          解き直し済み ({resolvedCodes.reduce((sum, [, ps]) => sum + ps.length, 0)}問)
                          {showResolved ? ' ▼' : ' ▶'}
                        </button>
                        {showResolved && resolvedCodes.map(([code, probs]) => (
                          <div key={code} className="range-text-group range-resolved">
                            <div className="range-text-label">{code} {probs[0]?.textName || ''}</div>
                            {probs.map(p => (
                              <div key={p.id} className="range-problem-item range-done">
                                <div className="range-problem-info">
                                  <span className="range-problem-num">{p.problemNumber}</span>
                                  <span className="range-done-badge">✅ 解き直し済み</span>
                                </div>
                                {p.imageUrls?.length > 0 && (
                                  <img
                                    src={p.imageUrls[0]}
                                    alt={p.problemNumber}
                                    className="range-problem-image"
                                    onClick={() => setZoomedImage(p.imageUrls[0])}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className="range-problems-footer">
          <button className="range-problems-done-btn" onClick={onClose}>
            ✓ 完了
          </button>
        </div>
      </div>

      {zoomedImage && (
        <div className="range-zoom-overlay" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="" className="range-zoom-image" />
        </div>
      )}
    </div>
  )
}

export default TestRangeProblems
