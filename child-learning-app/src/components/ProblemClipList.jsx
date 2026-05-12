// 問題クリップ — 3タブ共通の問題記録コンポーネント
//
// sourceType ごとの差分は props で吸収:
//   'textbook' — 教材タブ (SapixTextView)
//   'test'     — テスト分析タブ (TestScoreView)
//   'pastPaper' — 過去問タブ (PastPaperView)

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { nowISO } from '../utils/dateUtils'
import {
  addProblem,
  updateProblem,
  deleteProblem,
  reviewStatusInfo,
  missTypeLabel,
} from '../utils/problems'
import { addTaskToFirestore } from '../utils/firestore'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import { toast } from '../utils/toast'
import { LABELS, TOAST } from '../utils/messages'
import UnitTagPicker from './UnitTagPicker'
import PdfCropper from './PdfCropper'
import './ProblemClipList.css'

const DIFFICULTY_LABELS = { 1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★' }
const MISS_TYPE_OPTIONS = [
  { value: 'understanding', label: '理解不足' },
  { value: 'careless',      label: 'ケアレス' },
  { value: 'not_studied',   label: '未習' },
]

const EMPTY_FORM = {
  problemNumber: '',
  unitIds: [],
  isCorrect: false,
  missType: 'understanding',
  difficulty: null,
  imageUrls: [],
  correctRate: '',
  points: '',
  partialScore: '',
  subject: '',
}

/**
 * ProblemClipList — 問題クリップ一覧（共通）
 *
 * @param {string}   userId
 * @param {object[]} problems       - 問題一覧
 * @param {Function} onReload       - 問題リロード関数
 * @param {string}   sourceType     - 'textbook' | 'task' | 'test' | 'pastPaper'
 * @param {string}   sourceId       - テキストID / テストスコアID / タスクID
 * @param {string}   subject        - 科目（教材・過去問は親が確定）
 * @param {string[]} defaultUnitIds - デフォルトの単元IDs
 * @param {object}   pdfInfo        - { driveFileId, fileName } or null
 * @param {object}   taskGenInfo    - タスク生成用情報 { title, grade?, fileUrl?, fileName?, sourceRef }
 * @param {boolean}  showDifficulty - 難易度表示（過去問のみ）
 * @param {boolean}  showCorrectRate - 正答率表示（テストのみ）
 * @param {boolean}  showPoints     - 配点表示（テストのみ）
 * @param {boolean}  multiSubject   - 複数科目対応（テストのみ）
 * @param {string[]} subjects       - 科目一覧（multiSubject時）
 * @param {Function} getSubjectPdf  - (subject) => { driveFileId, fileName } | null（テスト用）
 * @param {boolean}  defaultExpanded - 初期展開状態
 * @param {boolean}  collapsible    - 折りたたみ可能か
 * @param {Function} onAfterAdd    - 問題追加後のコールバック (problemData, result) => void
 * @param {Function} onUpdateStatus - カスタムステータス更新 (problemId, reviewStatus, problem) => void
 * @param {Function} onDelete       - カスタム削除 (problemId, problem) => void
 */
export default function ProblemClipList({
  userId,
  problems = [],
  onReload,
  sourceType,
  sourceId,
  subject,
  defaultUnitIds = [],
  pdfInfo = null,
  taskGenInfo = null,
  showDifficulty = false,
  showCorrectRate = false,
  showPoints = false,
  multiSubject = false,
  subjects = [],
  getSubjectPdf = null,
  defaultExpanded = false,
  collapsible = true,
  onAfterAdd = null,
  onUpdateStatus = null,
  onDelete = null,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [selectedProblem, setSelectedProblem] = useState(null) // 詳細表示中の問題
  const [showForm, setShowForm] = useState(false)
  const defaultSubject = subject || (multiSubject && subjects.length > 0 ? subjects[0] : '')
  const [form, setForm] = useState({ ...EMPTY_FORM, subject: defaultSubject, unitIds: defaultUnitIds })
  const [showCropper, setShowCropper] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [taskDueDate, setTaskDueDate] = useState(null) // null=非表示, string=日付選択中
  const [detailCropper, setDetailCropper] = useState(false) // 詳細モーダルからのPDFクロッパー

  const unitNameMap = useMemo(() => {
    const map = {}
    getStaticMasterUnits().forEach(u => { map[u.id] = u.name })
    return map
  }, [])

  const wrongProblems = problems.filter(p => !p.isCorrect)

  // ── 問題追加 ──────────────────────────────────────────
  const handleAdd = async () => {
    const problemData = {
      sourceType,
      sourceId,
      subject: multiSubject ? form.subject : subject,
      problemNumber: form.problemNumber.trim(),
      unitIds: form.unitIds.length ? form.unitIds : defaultUnitIds,
      isCorrect: form.isCorrect,
      missType: form.isCorrect ? null : form.missType,
      difficulty: showDifficulty ? form.difficulty : null,
      imageUrls: form.imageUrls,
    }
    if (showCorrectRate) problemData.correctRate = parseFloat(form.correctRate) || 0
    if (showPoints) problemData.points = parseInt(form.points) || null
    if (showPoints && !form.isCorrect && form.partialScore !== '') problemData.partialScore = parseInt(form.partialScore)

    const result = await addProblem(userId, problemData)
    if (result.success) {
      if (onAfterAdd) await onAfterAdd(problemData, result)
      await onReload()
      resetForm()
      setShowForm(false)
      toast.success(TOAST.ADD_SUCCESS)
    } else {
      toast.error(TOAST.SAVE_FAILED)
    }
    return result
  }

  // ── ステータス更新 ────────────────────────────────────
  const handleUpdateStatus = async (problemId, reviewStatus) => {
    const problem = problems.find(p => (p.id || p.id) === problemId)
    if (onUpdateStatus) {
      await onUpdateStatus(problemId, reviewStatus, problem)
    } else {
      await updateProblem(userId, problemId, { reviewStatus })
    }
    await onReload()
  }

  // ── ミス種別更新 ──────────────────────────────────────
  const handleUpdateMissType = async (problemId, missType) => {
    const problem = problems.find(p => (p.id || p.id) === problemId)
    if (onUpdateStatus) {
      await onUpdateStatus(problemId, { missType }, problem)
    } else {
      await updateProblem(userId, problemId, { missType })
    }
    await onReload()
    setSelectedProblem(prev => prev ? { ...prev, missType } : null)
  }

  // ── 削除 ──────────────────────────────────────────────
  const handleDelete = async (problemId) => {
    const problem = problems.find(p => (p.id || p.id) === problemId)
    if (onDelete) {
      await onDelete(problemId, problem)
    } else {
      await deleteProblem(userId, problemId)
    }
    setSelectedProblem(null)
    await onReload()
    toast.success(TOAST.DELETE_SUCCESS)
  }

  // ── 個別問題のタスク生成（詳細モーダル用）────
  const handleCreateTaskForProblem = async (problem, dueDate) => {
    if (!taskGenInfo) return
    setCreatingTask(true)
    const isPastPaper = sourceType === 'pastPaper'
    const taskType = isPastPaper ? 'pastpaper' : 'review'
    const taskLabel = isPastPaper ? '過去問' : '解き直し'
    try {
      await addTaskToFirestore(userId, {
        id: Date.now() + Math.random(),
        title: `【${taskLabel}】${taskGenInfo.title} 第${problem.problemNumber}問`,
        subject: problem.subject || subject || '',
        grade: taskGenInfo.grade || '',
        unitIds: problem.unitIds?.length ? problem.unitIds : defaultUnitIds,
        taskType,
        priority: 'A',
        dueDate: dueDate || null,
        fileUrl: taskGenInfo.fileUrl || '',
        fileName: taskGenInfo.fileName || '',
        ...(taskGenInfo.schoolName && { schoolName: taskGenInfo.schoolName }),
        ...(taskGenInfo.year && { year: taskGenInfo.year }),
        problemImageUrls: problem.imageUrls || [],
        completed: false,
        problemIds: [problem.id || problem.id],
        generatedFrom: taskGenInfo.sourceRef || { type: sourceType, id: sourceId },
        createdAt: nowISO(),
      })
      setTaskDueDate(null)
      toast.success(`${taskLabel}タスクを作成しました`)
    } catch {
      toast.error(TOAST.SAVE_FAILED)
    } finally {
      setCreatingTask(false)
    }
  }

  // ── PDF切り出し完了（クロッパーは閉じず、画像だけ追加）───
  const handleCropComplete = (imageUrl) => {
    setForm(prev => ({
      ...prev,
      imageUrls: [...prev.imageUrls, imageUrl],
      ...(typeof showCropper === 'string' && showCropper !== prev.subject
        ? { subject: showCropper, unitIds: [] }
        : {})
    }))
    toast.success('画像を追加しました')
  }

  // ── クロッパーを閉じる（完了ボタン）→ フォームを表示 ──
  const handleCropperClose = () => {
    setShowCropper(false)
    setShowForm(true)
  }

  // ── 詳細モーダルから画像を追加 ──────────────────────────
  const handleDetailCropComplete = async (imageUrl) => {
    if (!selectedProblem) return
    const newUrls = [...(selectedProblem.imageUrls || []), imageUrl]
    await updateProblem(userId, selectedProblem.id, { imageUrls: newUrls })
    setSelectedProblem(prev => prev ? { ...prev, imageUrls: newUrls } : null)
    await onReload()
    toast.success('画像を追加しました')
  }

  const handleDetailImageDelete = async (index) => {
    if (!selectedProblem) return
    const newUrls = (selectedProblem.imageUrls || []).filter((_, i) => i !== index)
    await updateProblem(userId, selectedProblem.id, { imageUrls: newUrls })
    setSelectedProblem(prev => prev ? { ...prev, imageUrls: newUrls } : null)
    await onReload()
    toast.success('画像を削除しました')
  }

  const handleDetailCropperClose = () => {
    setDetailCropper(false)
  }

  const resolveDetailPdfInfo = () => {
    if (!selectedProblem) return null
    if (typeof detailCropper === 'string' && getSubjectPdf) {
      const pdf = getSubjectPdf(detailCropper)
      if (!pdf) return null
      const id = pdf.driveFileId || extractDriveFileId(pdf.fileUrl)
      return id ? { driveFileId: id, fileName: pdf.fileName, id: null } : null
    }
    if (multiSubject && getSubjectPdf && selectedProblem.subject) {
      const pdf = getSubjectPdf(selectedProblem.subject)
      if (pdf) {
        const id = pdf.driveFileId || extractDriveFileId(pdf.fileUrl)
        return id ? { driveFileId: id, fileName: pdf.fileName, id: null } : null
      }
    }
    if (!pdfInfo) return null
    return { driveFileId: pdfInfo.driveFileId, fileName: pdfInfo.fileName, id: null }
  }

  // ── PDF情報解決 ───────────────────────────────────────
  const resolvePdfInfo = () => {
    if (typeof showCropper === 'string' && getSubjectPdf) {
      const pdf = getSubjectPdf(showCropper)
      if (!pdf) return null
      const id = pdf.driveFileId || extractDriveFileId(pdf.fileUrl)
      return id ? { driveFileId: id, fileName: pdf.fileName, id: null } : null
    }
    if (!pdfInfo) return null
    return { driveFileId: pdfInfo.driveFileId, fileName: pdfInfo.fileName, id: null }
  }

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, subject: defaultSubject, unitIds: defaultUnitIds })
  }

  const hasPdf = pdfInfo || (getSubjectPdf && subjects.some(s => getSubjectPdf(s)))

  const openAddFlow = () => {
    resetForm()
    if (hasPdf) {
      // PDFがある場合は先に切り出し → フォームの順
      if (multiSubject && getSubjectPdf) {
        const defaultSubj = subjects.find(s => getSubjectPdf(s)) || subjects[0]
        setShowCropper(defaultSubj)
      } else {
        setShowCropper(true)
      }
    } else {
      setShowForm(true)
    }
  }

  // ── 問題リストの並び替え ──────────────────────────────
  const sortedProblems = [...problems].sort((a, b) => {
    const numA = parseInt(a.problemNumber) || 0
    const numB = parseInt(b.problemNumber) || 0
    return numA - numB
  })

  // ── 教科別グループ化（複数教科の場合） ──────────────
  const subjectGroups = (() => {
    if (!multiSubject) return null
    const subjectOrder = ['算数', '国語', '理科', '社会']
    const grouped = {}
    for (const p of sortedProblems) {
      const subj = p.subject || 'その他'
      if (!grouped[subj]) grouped[subj] = []
      grouped[subj].push(p)
    }
    const sortedSubjects = Object.keys(grouped).sort((a, b) => {
      const ia = subjectOrder.indexOf(a)
      const ib = subjectOrder.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    return sortedSubjects.map(subj => ({ subject: subj, problems: grouped[subj] }))
  })()

  // ============================================================
  // RENDER
  // ============================================================

  // ── プレビュー風の行表示（教科グループ時） ──────────
  const renderGroupedItem = (problem) => {
    const rate = parseFloat(problem.correctRate) || 0
    const rateClass = problem.correctRate != null
      ? (rate > 50 ? 'clip-g-rate-high' : rate >= 20 ? 'clip-g-rate-mid' : 'clip-g-rate-low')
      : ''
    return (
      <div
        key={problem.id}
        className={`clip-g-item ${rateClass}`}
        onClick={() => setSelectedProblem(problem)}
        role="button"
        tabIndex={0}
      >
        <span className="clip-g-number">{problem.problemNumber}</span>
        {showPoints && <span className="clip-g-points">{problem.points != null ? `${problem.points}点` : ''}</span>}
        <span className="clip-g-rate">{problem.correctRate != null ? `${parseFloat(problem.correctRate).toFixed(1)}%` : '-'}</span>
        {problem.partialScore != null && (
          <span className="clip-g-partial">部分点{problem.partialScore}</span>
        )}
        {problem.unitIds?.length > 0 && (
          <div className="clip-g-units" title={problem.unitIds.map(id => unitNameMap[id] || id).join('、')}>
            {problem.unitIds.map(id => (
              <span key={id} className="clip-g-unit">
                {unitNameMap[id] || id}
              </span>
            ))}
          </div>
        )}
        {rate > 50 && <span className="clip-g-warn" title="正答率が高いのに間違えた問題">⚠️</span>}
        {problem.imageUrls?.length > 0 && <span className="clip-g-has-image" title="画像あり">📷</span>}
      </div>
    )
  }

  // ── 通常の行表示 ──────────────────────────────────
  const renderProblemItem = (problem) => {
    const st = reviewStatusInfo(problem.reviewStatus)
    return (
      <div
        key={problem.id || problem.id}
        className={`clip-item ${problem.isCorrect ? 'correct' : 'incorrect'}`}
        onClick={() => setSelectedProblem(problem)}
        role="button"
        tabIndex={0}
      >
        <div className="clip-item-left">
          <span className="clip-correctness">
            {problem.isCorrect ? '○' : '✗'}
          </span>
          <span className="clip-number">第{problem.problemNumber}問</span>
          {showDifficulty && problem.difficulty && (
            <span className="clip-difficulty">{DIFFICULTY_LABELS[problem.difficulty]}</span>
          )}
          {!problem.isCorrect && problem.missType && (
            <span className={`clip-miss-type miss-${problem.missType}`}>
              {missTypeLabel(problem.missType)}
            </span>
          )}
          {showCorrectRate && problem.correctRate != null && (
            <span className={`clip-rate ${parseFloat(problem.correctRate) >= 60 ? 'high' : 'low'}`}>
              {parseFloat(problem.correctRate).toFixed(1)}%
            </span>
          )}
          {!problem.isCorrect && problem.correctRate != null && parseFloat(problem.correctRate) >= 50 && (
            <span className="clip-rate-warning" title="正答率50%以上で不正解 — 取るべき問題">
              🔺要注意
            </span>
          )}
          {multiSubject && problem.subject && (
            <span className={`clip-subject subject-${problem.subject}`}>{problem.subject}</span>
          )}
        </div>
        <div className="clip-item-right">
          {problem.unitIds?.length > 0 && (
            <div className="clip-units" title={problem.unitIds.map(id => unitNameMap[id] || id).join('、')}>
              {problem.unitIds.map(id => (
                <span key={id} className="unit-tag">{unitNameMap[id] || id}</span>
              ))}
            </div>
          )}
          {problem.imageUrls?.length > 0 && <span className="clip-has-image" title="画像あり">📷{problem.imageUrls.length > 1 ? problem.imageUrls.length : ''}</span>}
          {!problem.isCorrect && (
            <span
              className="clip-review-badge"
              style={{ background: st.bg, color: st.color }}
            >
              {st.label}
            </span>
          )}
        </div>
      </div>
    )
  }

  const renderDetailModal = () => {
    if (!selectedProblem) return null
    const p = selectedProblem
    const st = reviewStatusInfo(p.reviewStatus)
    return createPortal(
      <div className="clip-detail-overlay" onClick={() => { setSelectedProblem(null); setTaskDueDate(null) }}>
        <div className="clip-detail-modal" onClick={e => e.stopPropagation()}>
          <div className="clip-detail-header">
            <h3>
              <span className={`clip-correctness-lg ${p.isCorrect ? 'correct' : 'incorrect'}`}>
                {p.isCorrect ? '○' : '✗'}
              </span>
              第{p.problemNumber}問
            </h3>
            <button className="clip-detail-close" onClick={() => { setSelectedProblem(null); setTaskDueDate(null) }}>&times;</button>
          </div>

          <div className="clip-detail-body">
            {/* 画像 */}
            <div className="clip-detail-images">
              {p.imageUrls?.map((url, i) => (
                <div key={url} className="clip-detail-image">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="問題画像" />
                  </a>
                  <button
                    type="button"
                    className="clip-detail-image-delete"
                    onClick={() => handleDetailImageDelete(i)}
                    title="画像を削除"
                  >&times;</button>
                </div>
              ))}
              {hasPdf && (
                <button
                  type="button"
                  className="clip-detail-add-image-btn"
                  onClick={() => {
                    if (multiSubject && getSubjectPdf && p.subject) {
                      setDetailCropper(getSubjectPdf(p.subject) ? p.subject : subjects.find(s => getSubjectPdf(s)) || true)
                    } else {
                      setDetailCropper(true)
                    }
                  }}
                >
                  + 画像を追加
                </button>
              )}
            </div>

            <div className="clip-detail-fields">
              {/* 科目 */}
              {(multiSubject || p.subject) && (
                <div className="clip-field">
                  <span className="clip-field-label">科目</span>
                  <span className="clip-field-value">{p.subject}</span>
                </div>
              )}

              {/* 単元 */}
              <div className="clip-field">
                <span className="clip-field-label">単元</span>
                <div className="clip-field-value clip-field-unit-picker">
                  <UnitTagPicker
                    subject={multiSubject ? p.subject : subject}
                    value={p.unitIds || []}
                    onChange={async (unitIds) => {
                      await updateProblem(userId, p.id, { unitIds })
                      setSelectedProblem(prev => prev ? { ...prev, unitIds } : null)
                      await onReload()
                    }}
                  />
                </div>
              </div>

              {/* 正答率（テストのみ） */}
              {showCorrectRate && p.correctRate != null && (
                <div className="clip-field">
                  <span className="clip-field-label">全体正答率</span>
                  <span className="clip-field-value">{parseFloat(p.correctRate).toFixed(1)}%</span>
                </div>
              )}

              {/* 配点（テストのみ） */}
              {showPoints && p.points != null && (
                <div className="clip-field">
                  <span className="clip-field-label">配点</span>
                  <span className="clip-field-value">{p.points}点</span>
                </div>
              )}

              {/* 部分点（テストのみ・不正解時） */}
              {showPoints && !p.isCorrect && (
                <div className="clip-field">
                  <span className="clip-field-label">部分点</span>
                  <span className="clip-field-value">
                    <input
                      type="number"
                      min="0"
                      className="clip-inline-input"
                      placeholder="なし"
                      value={p.partialScore ?? ''}
                      onChange={async (e) => {
                        const val = e.target.value === '' ? null : parseInt(e.target.value)
                        await updateProblem(userId, p.id, { partialScore: val })
                        setSelectedProblem(prev => prev ? { ...prev, partialScore: val } : null)
                        await onReload()
                      }}
                    />
                  </span>
                </div>
              )}

              {/* 難易度（過去問のみ） */}
              {showDifficulty && p.difficulty && (
                <div className="clip-field">
                  <span className="clip-field-label">難易度</span>
                  <span className="clip-field-value">{DIFFICULTY_LABELS[p.difficulty]}</span>
                </div>
              )}

              {/* ミス種別（不正解時） */}
              {!p.isCorrect && (
                <div className="clip-field">
                  <span className="clip-field-label">ミス種別</span>
                  <div className="clip-field-value">
                    <div className="clip-miss-type-btns">
                      {MISS_TYPE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`clip-miss-btn ${p.missType === opt.value ? 'active' : ''}`}
                          onClick={() => handleUpdateMissType(p.id || p.id, opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 解き直しステータス（不正解時） */}
              {!p.isCorrect && (
                <div className="clip-field">
                  <span className="clip-field-label">解き直し</span>
                  <select
                    className="clip-status-select"
                    value={p.reviewStatus || 'pending'}
                    style={{ background: st.bg, color: st.color }}
                    onChange={(e) => {
                      handleUpdateStatus(p.id || p.id, e.target.value)
                      setSelectedProblem(prev => ({ ...prev, reviewStatus: e.target.value }))
                    }}
                  >
                    <option value="pending">未完了</option>
                    <option value="retry">要再挑戦</option>
                    <option value="done">解き直し済</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="clip-detail-actions">
            {taskGenInfo && !p.isCorrect && (
              taskDueDate !== null ? (
                <div className="clip-task-date-picker">
                  <label>📅 実施日（任意）</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="clip-task-date-input"
                  />
                  <div className="clip-task-date-actions">
                    <button
                      className="clip-task-btn"
                      disabled={creatingTask}
                      onClick={() => handleCreateTaskForProblem(p, taskDueDate)}
                    >
                      {creatingTask ? '作成中...' : '✓ タスクを作成'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setTaskDueDate(null)}
                    >
                      {LABELS.CANCEL}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="clip-task-btn"
                  onClick={() => setTaskDueDate('')}
                >
                  → {sourceType === 'pastPaper' ? '過去問タスクを追加' : '解き直しタスクを追加'}
                </button>
              )
            )}
            <button
              className="clip-delete-btn"
              onClick={() => {
                if (window.confirm('この問題を削除しますか？')) {
                  handleDelete(p.id || p.id)
                }
              }}
            >
              削除
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  const renderAddForm = () => {
    if (!showForm) return null
    const currentSubject = multiSubject ? form.subject : subject
    return (
      <div className="clip-form">
        <h4>問題を追加</h4>

        {/* 科目（テストのみ） */}
        {multiSubject && (
          <div className="clip-form-field">
            <label>教科</label>
            <select
              value={form.subject}
              onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value, unitIds: [] }))}
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div className="clip-form-row">
          <div className="clip-form-field">
            <label>問題番号</label>
            <input
              type="text"
              placeholder="例: 1, 2(1), 大問3"
              value={form.problemNumber}
              onChange={(e) => setForm(prev => ({ ...prev, problemNumber: e.target.value }))}
            />
          </div>

          {showCorrectRate && (
            <div className="clip-form-field">
              <label>全体正答率（%）</label>
              <input
                type="number"
                min="0" max="100"
                placeholder="例: 72"
                value={form.correctRate}
                onChange={(e) => setForm(prev => ({ ...prev, correctRate: e.target.value }))}
              />
            </div>
          )}

          {showPoints && (
            <div className="clip-form-field">
              <label>配点</label>
              <input
                type="number"
                min="0"
                placeholder="例: 6"
                value={form.points}
                onChange={(e) => setForm(prev => ({ ...prev, points: e.target.value }))}
              />
            </div>
          )}
          {showPoints && !form.isCorrect && (
            <div className="clip-form-field">
              <label>部分点</label>
              <input
                type="number"
                min="0"
                placeholder="なし"
                value={form.partialScore}
                onChange={(e) => setForm(prev => ({ ...prev, partialScore: e.target.value }))}
              />
            </div>
          )}
        </div>

        {/* 正誤 */}
        <div className="clip-form-field">
          <label>正誤</label>
          <div className="clip-correctness-toggle">
            <button
              type="button"
              className={`correct-btn ${form.isCorrect ? 'active' : ''}`}
              onClick={() => setForm(prev => ({ ...prev, isCorrect: true }))}
            >
              ○ 正解
            </button>
            <button
              type="button"
              className={`incorrect-btn ${!form.isCorrect ? 'active' : ''}`}
              onClick={() => setForm(prev => ({ ...prev, isCorrect: false }))}
            >
              ✗ 不正解
            </button>
          </div>
        </div>

        {/* ミスタイプ */}
        {!form.isCorrect && (
          <div className="clip-form-field">
            <label>ミスの種類</label>
            <div className="clip-miss-type-btns">
              {MISS_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`clip-miss-btn ${form.missType === opt.value ? 'active' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, missType: opt.value }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 難易度（過去問のみ） */}
        {showDifficulty && (
          <div className="clip-form-field">
            <label>難易度（任意）</label>
            <div className="clip-difficulty-btns">
              {[1, 2, 3, 4, 5].map(d => (
                <button
                  key={d}
                  type="button"
                  className={`clip-diff-btn ${form.difficulty === d ? 'active' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, difficulty: prev.difficulty === d ? null : d }))}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 単元タグ */}
        <div className="clip-form-field">
          <label>単元タグ（任意）</label>
          <UnitTagPicker
            subject={currentSubject}
            value={form.unitIds}
            onChange={(unitIds) => setForm(prev => ({ ...prev, unitIds }))}
          />
        </div>

        {/* 画像プレビュー */}
        {form.imageUrls.length > 0 && (
          <div className="clip-form-field">
            <label>問題画像（{form.imageUrls.length}枚）</label>
            <div className="clip-image-previews">
              {form.imageUrls.map((url, i) => (
                <div key={url} className="clip-image-preview">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`問題プレビュー ${i + 1}`} />
                  </a>
                  <button type="button" className="btn-secondary"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      imageUrls: prev.imageUrls.filter((_, idx) => idx !== i),
                    }))}>削除</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 画像追加ボタン（PDFがある場合） */}
        {hasPdf && (
          <div className="clip-form-field">
            <button type="button" className="btn-secondary clip-add-image-btn" onClick={() => {
              if (multiSubject && getSubjectPdf) {
                const subj = subjects.find(s => getSubjectPdf(s)) || subjects[0]
                setShowCropper(subj)
              } else {
                setShowCropper(true)
              }
            }}>
              + 画像を追加
            </button>
          </div>
        )}

        <div className="clip-form-actions">
          <button className="btn-secondary" onClick={() => { setShowForm(false); resetForm() }}>
            {LABELS.CANCEL}
          </button>
          <button className="btn-primary" onClick={handleAdd}>
            追加する
          </button>
        </div>
      </div>
    )
  }

  // ── メインレンダー ────────────────────────────────────
  const isExpanded = collapsible ? expanded : true

  return (
    <div className="problem-clip-section">
      {/* ヘッダー / トグル */}
      {collapsible ? (
        <button
          className="clip-toggle-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '▼' : '▶'} 問題クリップ
          {problems.length > 0 && (
            <span className="clip-count-badge">
              {problems.length}問
              {wrongProblems.length > 0 && (
                <span className="clip-wrong-count"> / 不正解{wrongProblems.length}</span>
              )}
            </span>
          )}
        </button>
      ) : (
        <div className="clip-section-header">
          <h3 className="clip-section-title">問題クリップ</h3>
          <span className="clip-count-inline">
            {problems.length}問
            {wrongProblems.length > 0 && ` / 不正解${wrongProblems.length}`}
          </span>
        </div>
      )}

      {isExpanded && (
        <div className="clip-body">
          {/* 問題リスト */}
          {sortedProblems.length === 0 ? (
            <p className="clip-empty">まだ問題が記録されていません</p>
          ) : subjectGroups ? (
            <div className="clip-list clip-list-grouped">
              {subjectGroups.map(({ subject, problems: grpProblems }) => (
                <div key={subject} className="clip-subject-group">
                  <h5 className="clip-subject-group-title">
                    {subject}（{grpProblems.length}問）
                  </h5>
                  <div className="clip-g-items">
                    {grpProblems.map(renderGroupedItem)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="clip-list">
              {sortedProblems.map(renderProblemItem)}
            </div>
          )}

          {/* アクションバー */}
          {!showForm && (
            <div className="clip-actions">
              <button className="clip-add-btn" onClick={openAddFlow}>
                + 問題を追加
              </button>
            </div>
          )}

          {/* 追加フォーム */}
          {renderAddForm()}
        </div>
      )}

      {/* 詳細モーダル */}
      {renderDetailModal()}

      {/* PDF切り出し（問題追加フロー用） */}
      {showCropper && (
        <PdfCropper
          key={typeof showCropper === 'string' ? showCropper : 'crop'}
          userId={userId}
          attachedPdf={resolvePdfInfo()}
          onCropComplete={handleCropComplete}
          onClose={handleCropperClose}
          headerSlot={
            multiSubject && getSubjectPdf ? (
              <div className="clip-cropper-subject-tabs">
                {subjects.map(s => {
                  const has = !!getSubjectPdf(s)
                  return (
                    <button
                      key={s}
                      className={`clip-cropper-tab ${showCropper === s ? 'active' : ''} ${!has ? 'no-pdf' : ''}`}
                      onClick={() => has && setShowCropper(s)}
                      disabled={!has}
                    >
                      {s}{!has && '（未添付）'}
                    </button>
                  )
                })}
              </div>
            ) : undefined
          }
        />
      )}

      {/* PDF切り出し（詳細モーダルから画像追加） */}
      {detailCropper && (
        <PdfCropper
          key={typeof detailCropper === 'string' ? `detail-${detailCropper}` : 'detail-crop'}
          userId={userId}
          attachedPdf={resolveDetailPdfInfo()}
          onCropComplete={handleDetailCropComplete}
          onClose={handleDetailCropperClose}
          headerSlot={
            multiSubject && getSubjectPdf ? (
              <div className="clip-cropper-subject-tabs">
                {subjects.map(s => {
                  const has = !!getSubjectPdf(s)
                  return (
                    <button
                      key={s}
                      className={`clip-cropper-tab ${detailCropper === s ? 'active' : ''} ${!has ? 'no-pdf' : ''}`}
                      onClick={() => has && setDetailCropper(s)}
                      disabled={!has}
                    >
                      {s}{!has && '（未添付）'}
                    </button>
                  )
                })}
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  )
}

// ── ヘルパー ────────────────────────────────────────────
function extractDriveFileId(fileUrl) {
  if (!fileUrl) return null
  const match = fileUrl.match(/\/file\/d\/([^/?]+)/)
  return match ? match[1] : null
}
