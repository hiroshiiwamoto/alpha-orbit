import { useState, useMemo, useEffect } from 'react'
import './TodayAndWeekView.css'
import { subjectEmojis, subjectColors, weekDayNames } from '../utils/constants'
import { formatDate, parseLocalDate } from '../utils/dateUtils'
import { getHomeworkForDate, getHomeworkByDate, getDayPlan } from '../utils/sapixHomework'
import { getTestReviewsForDate, getTestReviewsByDate } from '../utils/testReviews'
import TaskDetailModal from './TaskDetailModal'

// 優先度のラベルと色
const priorityStyles = {
  A: { label: 'A', color: '#ef4444' },
  B: { label: 'B', color: '#f59e0b' },
  C: { label: 'C', color: '#3b82f6' },
}

function TodayAndWeekView({ tasks, testScores = [], homeworkDone, onToggleTask, onDeleteTask, onEditTask, onToggleHomework, onTestClick, userId }) {
  const [expandedSection, setExpandedSection] = useState('today') // 'today', 'homework', 'week'
  const [detailTask, setDetailTask] = useState(null)
  const [todayStr, setTodayStr] = useState(() => formatDate(new Date()))

  // 日付変化を1分ごとに検知（アプリを開きっぱなしでも翌日に更新される）
  useEffect(() => {
    const interval = setInterval(() => {
      const next = formatDate(new Date())
      setTodayStr(prev => (prev === next ? prev : next))
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const todayTasks = useMemo(
    () => tasks.filter(task => task.dueDate === todayStr),
    [tasks, todayStr]
  )

  const todayHomework = useMemo(() => getHomeworkForDate(parseLocalDate(todayStr)), [todayStr])

  const weekHomework = useMemo(() => getHomeworkByDate(parseLocalDate(todayStr), 7), [todayStr])

  // テスト復習タスク（翌日 / 1週間後 / 1ヶ月後）
  const todayReviews = useMemo(
    () => getTestReviewsForDate(testScores, parseLocalDate(todayStr)),
    [testScores, todayStr]
  )
  const weekReviewsByDate = useMemo(
    () => getTestReviewsByDate(testScores, parseLocalDate(todayStr), 7),
    [testScores, todayStr]
  )

  // 家庭学習の完了チェック（復習タスクも homeworkDone に同居している）
  const isHomeworkDone = (hwId) => {
    return homeworkDone && homeworkDone[hwId] === true
  }

  // 今日のプラン: 持ち時間に収まる「必須」と、入りきらない「余裕があれば」に分ける
  const todayPlan = useMemo(
    () => getDayPlan(todayHomework, parseLocalDate(todayStr)),
    [todayHomework, todayStr]
  )

  const todayHomeworkCount = todayHomework.length + todayReviews.length
  const todayHomeworkDoneCount =
    todayHomework.filter(hw => isHomeworkDone(hw.id)).length +
    todayReviews.filter(r => isHomeworkDone(r.id)).length

  // 家庭学習 1 件の描画（今日リスト用）。必須 / 余裕があれば で共通。
  const renderHomeworkItem = (hw) => {
    const subjectColor = subjectColors[hw.subject] || '#64748b'
    const done = isHomeworkDone(hw.id)
    const pStyle = priorityStyles[hw.priority]
    return (
      <div
        key={hw.id}
        className={`priority-task ${done ? 'completed' : ''} ${hw.overflow ? 'optional' : ''}`}
        style={{
          borderColor: subjectColor,
          backgroundColor: `${subjectColor}15`,
          boxShadow: `0 2px 8px ${subjectColor}25`
        }}
      >
        <input
          type="checkbox"
          checked={done}
          onChange={() => onToggleHomework && onToggleHomework(hw.id)}
          className="task-checkbox"
        />
        <span className="hw-priority-num" style={{ color: pStyle.color }}>
          {hw.studyPriority}
        </span>
        <span className="subject-emoji">{subjectEmojis[hw.subject]}</span>
        <span
          className="subject-badge"
          style={{ color: subjectColor }}
        >{hw.subject}</span>
        <span className="task-title">
          {hw.title}
          {(hw.lessonLabel || hw.unitName) && (
            <span className="hw-lesson-info">
              {hw.lessonLabel}{hw.lessonLabel && hw.unitName ? ' ' : ''}{hw.unitName}
            </span>
          )}
        </span>
        {hw.minutes > 0 && (
          <span className="hw-minutes-badge" title="所要時間の目安">
            ⏱ {hw.minutes}分
          </span>
        )}
        {hw.capMinutes && (
          <span className="hw-cap-badge" title="この時間を超えたら解答を見て切り上げる">
            上限{hw.capMinutes}分
          </span>
        )}
        {pStyle && (
          <span
            className="task-priority-badge"
            style={{ color: pStyle.color, borderColor: `${pStyle.color}40` }}
          >{pStyle.label}</span>
        )}
      </div>
    )
  }

  const undoneReviewCount = todayReviews.filter(r => !isHomeworkDone(r.id)).length

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleTaskClick = (task) => {
    if (userId) {
      setDetailTask(task)
    } else if (onEditTask) {
      onEditTask(task)
    }
  }

  return (
    <div className="today-week-view">
      {/* テスト復習のバナー通知 */}
      {undoneReviewCount > 0 && (
        <div className="review-banner" role="status">
          <span className="review-banner-icon">🔁</span>
          <span className="review-banner-text">
            今日は <strong>テスト復習が{undoneReviewCount}件</strong> あります
          </span>
        </div>
      )}

      {/* 今日の家庭学習 */}
      <div className="priority-section homework-section">
        <div
          className="section-header"
          onClick={() => toggleSection('today')}
        >
          <h2>
            今日の家庭学習
            <span className="task-count">
              {todayHomeworkDoneCount} / {todayHomeworkCount}
            </span>
            {todayPlan.availableMinutes > 0 && (
              <span
                className={`plan-minutes ${todayPlan.requiredMinutes > todayPlan.availableMinutes ? 'over' : ''}`}
                title="必須タスクの所要時間 / 今日の持ち時間（基礎トレは別枠）"
              >
                ⏱ {todayPlan.requiredMinutes} / {todayPlan.availableMinutes}分
              </span>
            )}
          </h2>
          <span className="toggle-icon">{expandedSection === 'today' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'today' && (
          <div className="task-grid">
            {/* テスト復習タスク（家庭学習の上に配置） */}
            {todayReviews.map(r => {
              const done = isHomeworkDone(r.id)
              return (
                <div
                  key={r.id}
                  className={`priority-task review-task ${done ? 'completed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => onToggleHomework && onToggleHomework(r.id)}
                    className="task-checkbox"
                  />
                  <span className="review-badge">🔁 復習</span>
                  <button
                    type="button"
                    className="review-task-title"
                    onClick={() => onTestClick && onTestClick(r.testId)}
                  >
                    {r.testName}
                    <span className="review-interval">{r.intervalLabel}</span>
                  </button>
                </div>
              )
            })}
            {todayHomework.length === 0 && todayReviews.length === 0 ? (
              <div className="no-tasks-message">今日の家庭学習はありません</div>
            ) : (
              <>
                {todayPlan.required.map(renderHomeworkItem)}
                {todayPlan.optional.length > 0 && (
                  <>
                    <div className="optional-header">
                      💤 余裕があれば
                      <span className="optional-note">
                        持ち時間に入りきらない分（{todayPlan.optionalMinutes}分）。落としてもOK
                      </span>
                    </div>
                    {todayPlan.optional.map(renderHomeworkItem)}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 今週の家庭学習スケジュール */}
      <div className="priority-section week-homework-section">
        <div
          className="section-header"
          onClick={() => toggleSection('homework')}
        >
          <h2>
            今週の学習スケジュール
          </h2>
          <span className="toggle-icon">{expandedSection === 'homework' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'homework' && (
          <div className="week-homework-grid">
            {Object.entries(weekHomework).map(([dateStr, hwTasks]) => {
              const d = parseLocalDate(dateStr)
              const dayName = weekDayNames[d.getDay()]
              const isToday = dateStr === formatDate(new Date())
              const reviewsForDay = weekReviewsByDate[dateStr] || []
              const totalCount = hwTasks.length + reviewsForDay.length
              const doneCount =
                hwTasks.filter(hw => isHomeworkDone(hw.id)).length +
                reviewsForDay.filter(r => isHomeworkDone(r.id)).length
              const dayPlan = getDayPlan(hwTasks, d)

              return (
                <div key={dateStr} className={`week-day-block ${isToday ? 'is-today' : ''}`}>
                  <div className="week-day-header">
                    <span className="week-day-label">
                      {d.getMonth() + 1}/{d.getDate()}({dayName})
                      {isToday && <span className="today-badge">TODAY</span>}
                    </span>
                    <span className="week-day-meta">
                      {dayPlan.availableMinutes > 0 && (
                        <span className={`week-day-minutes ${dayPlan.requiredMinutes > dayPlan.availableMinutes ? 'over' : ''}`}>
                          {dayPlan.requiredMinutes}/{dayPlan.availableMinutes}分
                        </span>
                      )}
                      {totalCount > 0 && (
                        <span className="week-day-count">{doneCount}/{totalCount}</span>
                      )}
                    </span>
                  </div>
                  {totalCount === 0 ? (
                    <div className="week-day-empty">-</div>
                  ) : (
                    <div className="week-day-tasks">
                      {reviewsForDay.map(r => {
                        const done = isHomeworkDone(r.id)
                        return (
                          <div
                            key={r.id}
                            className={`week-hw-item week-review-item ${done ? 'completed' : ''}`}
                            onClick={() => onToggleHomework && onToggleHomework(r.id)}
                          >
                            <span className="week-hw-check">{done ? '✓' : '○'}</span>
                            <span className="week-review-badge">🔁</span>
                            <span className="week-hw-title">
                              {r.testName}
                              <span className="hw-lesson-info">{r.intervalLabel}</span>
                            </span>
                          </div>
                        )
                      })}
                      {hwTasks.map(hw => {
                        const subjectColor = subjectColors[hw.subject] || '#64748b'
                        const done = isHomeworkDone(hw.id)
                        return (
                          <div
                            key={hw.id}
                            className={`week-hw-item ${done ? 'completed' : ''} ${hw.overflow ? 'overflow' : ''}`}
                            onClick={() => onToggleHomework && onToggleHomework(hw.id)}
                            title={hw.overflow ? '余裕があれば（持ち時間に入りきらない分）' : `${hw.minutes}分`}
                          >
                            <span className="week-hw-check">{done ? '✓' : hw.overflow ? '💤' : '○'}</span>
                            <span className="week-hw-priority">{hw.studyPriority}</span>
                            <span
                              className="week-hw-subject"
                              style={{ color: subjectColor }}
                            >{subjectEmojis[hw.subject]}</span>
                            <span className="week-hw-title">
                              {hw.title}
                              {(hw.lessonLabel || hw.unitName) && (
                                <span className="hw-lesson-info">
                                  {hw.lessonLabel}{hw.lessonLabel && hw.unitName ? ' ' : ''}{hw.unitName}
                                </span>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 手動タスク */}
      {todayTasks.length > 0 && (
        <div className="priority-section today-section">
          <div
            className="section-header"
            onClick={() => toggleSection('manual')}
          >
            <h2>
              その他のタスク
              <span className="task-count">
                {todayTasks.filter(t => !t.completed).length} / {todayTasks.length}
              </span>
            </h2>
            <span className="toggle-icon">{expandedSection === 'manual' ? '▼' : '▶'}</span>
          </div>

          {expandedSection === 'manual' && (
            <div className="task-grid">
              {todayTasks.map(task => {
                const subjectColor = subjectColors[task.subject] || '#64748b'
                return (
                  <div
                    key={task.id}
                    className={`priority-task ${task.completed ? 'completed' : ''} ${userId ? 'clickable-row' : ''}`}
                    style={{
                      borderColor: subjectColor,
                      backgroundColor: `${subjectColor}15`,
                      boxShadow: `0 2px 8px ${subjectColor}25`
                    }}
                    onClick={() => handleTaskClick(task)}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      onClick={e => e.stopPropagation()}
                      className="task-checkbox"
                    />
                    <span className="subject-emoji">{subjectEmojis[task.subject]}</span>
                    <span
                      className="subject-badge"
                      style={{
                        color: subjectColor
                      }}
                    >{task.subject}</span>
                    <span className="task-title">{task.title}</span>
                    {task.priority && (
                      <span className="task-priority-badge">{task.priority}</span>
                    )}
                    <div className="task-actions" onClick={e => e.stopPropagation()}>
                      {onEditTask && (
                        <button
                          className="edit-btn"
                          onClick={() => onEditTask(task)}
                          title="編集"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        className="delete-btn"
                        onClick={() => onDeleteTask(task.id)}
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* タスク詳細モーダル */}
      {detailTask && userId && (
        <TaskDetailModal
          task={detailTask}
          userId={userId}
          onEdit={onEditTask}
          onClose={() => setDetailTask(null)}
        />
      )}
    </div>
  )
}

export default TodayAndWeekView
