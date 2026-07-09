import { useState } from 'react'
import { generateTestReview, getGeminiUsage } from '../utils/scoreOcr'
import { updateTestScore, getProblemsForTestScore } from '../utils/testScores'
import { toast } from '../utils/toast'
import './TestScoreView.css'

// AI総評（Gemini 出力 / Firestore 保存値）は信頼できない入力として扱う。
// Markdown 変換の前に HTML特殊文字をエスケープすることで、変換後の HTML には
// この関数自身が挿入する固定タグ (h4/h5/ul/li/strong/br) しか存在しなくなり、
// スクリプト注入の経路が構造的に閉じる。
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatReviewHtml(text) {
  return escapeHtml(text)
    .replace(/^## (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

function ScoreCard({ score, userId, onEdit, onDelete, onDeleteRequest, onDeleteCancel, isPendingDelete, onReload }) {
  const rows = [
    { key: 'fourSubjects', genderKey: 'fourSubjectsGender', label: '4科目合計' },
    { key: 'twoSubjects', genderKey: 'twoSubjectsGender', label: '2科目合計' },
    { key: 'sansu', genderKey: 'sansuGender', label: '算数' },
    { key: 'kokugo', genderKey: 'kokugoGender', label: '国語' },
    { key: 'rika', genderKey: 'rikaGender', label: '理科' },
    { key: 'shakai', genderKey: 'shakaiGender', label: '社会' },
  ]

  const hasAnyData = rows.some(({ key }) => score[key]?.score || score[key]?.deviation)

  // 4科目偏差値 → なければ2科目偏差値
  const mainDeviation = score.fourSubjects?.deviation || score.twoSubjects?.deviation
  const mainDeviationLabel = score.fourSubjects?.deviation ? '4科' : '2科'

  return (
    <div className="score-card">
      <div className="card-header">
        <div className="card-header-left">
          <h3 className="test-name">{score.testName}</h3>
          <span className="test-date">
            {new Date(score.testDate).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
        <div className="card-header-center">
          {mainDeviation && (
            <span className="card-deviation-badge">
              {mainDeviationLabel} {mainDeviation}
            </span>
          )}
        </div>
        <div className="card-actions">
          <button className="edit-btn" onClick={() => onEdit(score)} title="編集">
            ✏️
          </button>
          {isPendingDelete ? (
            <span className="delete-confirm-inline">
              <button className="delete-confirm-yes" onClick={() => onDelete(score)}>削除</button>
              <button className="delete-confirm-no" onClick={onDeleteCancel}>戻す</button>
            </span>
          ) : (
            <button className="delete-btn" onClick={() => onDeleteRequest(score.id)} title="削除">
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* 成績テーブル */}
      {hasAnyData && (
        <div className="grades-table-wrapper">
          <table className="grades-table scorecard-table">
            <thead>
              <tr>
                <th rowSpan="2"></th>
                <th colSpan="4">全体</th>
                <th colSpan="3">男女別</th>
              </tr>
              <tr>
                <th>得点</th>
                <th>平均</th>
                <th>偏差値</th>
                <th>順位</th>
                <th>平均</th>
                <th>偏差値</th>
                <th>順位</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, genderKey, label }) => {
                const data = score[key]
                const gData = score[genderKey]
                if (!data?.score && !data?.deviation) return null
                return (
                  <tr key={key}>
                    <th className="grades-table-label">{label}</th>
                    <td>{data.score && `${data.score}${data.totalScore ? `/${data.totalScore}` : ''}`}</td>
                    <td>{data.average || ''}</td>
                    <td>{data.deviation || ''}</td>
                    <td>{data.rank && `${data.rank}${data.totalStudents ? `/${data.totalStudents}` : ''}`}</td>
                    <td>{gData?.average || ''}</td>
                    <td>{gData?.deviation || ''}</td>
                    <td>{gData?.rank && `${gData.rank}${gData.totalStudents ? `/${gData.totalStudents}` : ''}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 成績表PDF */}
      {score.pdfUrl && (
        <div className="additional-info">
          <span className="task-file-icon">📎</span>
          <a href={score.pdfUrl} target="_blank" rel="noopener noreferrer" className="task-file-link">
            {score.pdfFileName || '成績表PDF'}
          </a>
        </div>
      )}

      {/* コース・クラス・メモ */}
      {(score.course || score.className || score.notes) && (
        <div className="additional-info">
          {score.course && <span className="course">コース: {score.course}</span>}
          {score.className && <span className="class">クラス: {score.className}</span>}
          {score.notes && <p className="notes">{score.notes}</p>}
        </div>
      )}

      {/* AI総評 */}
      <AiReviewSection score={score} userId={userId} onReload={onReload} />
    </div>
  )
}

function AiReviewSection({ score, userId, onReload }) {
  const [generating, setGenerating] = useState(false)
  const [showReview, setShowReview] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const problems = await getProblemsForTestScore(userId, score)
      const wrongAnswers = problems.filter(p => !p.isCorrect)
      const reviewText = await generateTestReview(score, wrongAnswers)
      await updateTestScore(userId, score.id, { aiReview: reviewText })
      if (onReload) await onReload()
      setShowReview(true)
    } catch (err) {
      console.error('Review generation error:', err)
      toast.error(err.message || '総評の生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  if (score.aiReview) {
    return (
      <div className="test-review-section">
        <button
          className="review-toggle-btn"
          onClick={() => setShowReview(!showReview)}
        >
          {showReview ? '▼ AI総評を閉じる' : '▶ AI総評を見る'}
        </button>
        {showReview && (
          <div className="review-text-container">
            <div className="review-text-content" dangerouslySetInnerHTML={{
              __html: formatReviewHtml(score.aiReview)
            }} />
            <button
              className="review-regenerate-btn"
              onClick={handleGenerate}
              disabled={generating || getGeminiUsage().isOverLimit}
            >
              {generating ? '再生成中...' : '🔄 再生成'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="test-review-section">
      <button
        className="review-generate-btn"
        onClick={handleGenerate}
        disabled={generating || getGeminiUsage().isOverLimit}
      >
        {generating ? '総評を生成中...' : '📝 AI総評を生成'}
      </button>
    </div>
  )
}

export default ScoreCard
