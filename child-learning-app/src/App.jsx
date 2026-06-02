import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import './utils/toast.css'
import Auth from './components/Auth'
import TodayAndWeekView from './components/TodayAndWeekView'
import TaskForm from './components/TaskForm'
import ScheduleView from './components/ScheduleView'
import UnitAnalysisView from './components/UnitAnalysisView'
import PastPaperView from './components/PastPaperView'
import TestScoreView from './components/TestScoreView'
import GradesView from './components/GradesView'
import SapixTextView from './components/SapixTextView'
import {
  addTaskToFirestore,
  updateTaskInFirestore,
  deleteTaskFromFirestore,
  bulkDeleteTasksFromFirestore,
  subscribeToTasks,
  migrateLocalStorageToFirestore,
  loadHomeworkDone,
  saveHomeworkDone,
} from './utils/firestore'
import {
  getCustomUnits,
  addCustomUnit as addCustomUnitToFirestore,
} from './utils/customUnits'
import { subscribeSapixTexts } from './utils/sapixTexts'
import { subscribeTestScores } from './utils/testScores'
import { toast } from './utils/toast'

function App() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState(() => {
    // 未ログイン時は localStorage の sapixTasks を初期値として復元（マウント時 1 回のみ）
    const savedTasks = localStorage.getItem('sapixTasks')
    if (!savedTasks) return []
    try {
      return JSON.parse(savedTasks)
    } catch {
      console.error('localStorage data corrupted, clearing')
      localStorage.removeItem('sapixTasks')
      return []
    }
  })
  const [view, setView] = useState('schedule') // schedule, dashboard, pastpaper, testscore, sapixtext, edit
  const [previousView, setPreviousView] = useState('schedule') // Store previous view for returning after edit
  const [editingTask, setEditingTask] = useState(null)
  const [customUnits, setCustomUnits] = useState([]) // カスタム単元
  const [sapixTexts, setSapixTexts] = useState([]) // SAPIXテキスト（カレンダー表示用）
  const [testScores, setTestScores] = useState([]) // テスト日程（カレンダー表示用）
  const taskFormRef = useRef(null)
  const [pendingTestId, setPendingTestId] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  // 移行済みフラグは UI に影響しない単なるガードなので state ではなく ref で持つ
  // （effect 内 setState による不要な再実行を防ぐ）
  const migratedRef = useRef(false)
  const [homeworkDone, setHomeworkDone] = useState({}) // { hwId: true/false }


  // Firestore同期: ユーザーがログインしたら、タスクをリアルタイムで取得
  // 未ログイン時の初期復元は useState の lazy initializer で処理済み
  useEffect(() => {
    if (!user) return

    // localStorageからFirestoreへの移行（初回のみ）
    // CLEANUP_KEYがある場合はすでにクリーンアップ済みなので移行しない
    const CLEANUP_KEY = 'all_tasks_cleared_20260217'
    if (!migratedRef.current) {
      const hasLocalData = localStorage.getItem('sapixTasks') || localStorage.getItem('targetSchools')
      if (hasLocalData && !localStorage.getItem(CLEANUP_KEY)) {
        // まだクリーンアップ前の場合のみFirestoreへ移行し、移行後はlocalStorageを削除
        migrateLocalStorageToFirestore(user.uid).then(() => {
          localStorage.removeItem('sapixTasks')
          migratedRef.current = true
        })
      } else {
        // クリーンアップ済み、またはローカルデータなし → localStorageのタスクを削除して終了
        localStorage.removeItem('sapixTasks')
        migratedRef.current = true
      }
    }

    // カスタム単元を取得
    getCustomUnits(user.uid).then(result => {
      if (result.success) {
        setCustomUnits(result.data)
      }
    })

    // タスクのリアルタイム同期を開始
    const unsubscribe = subscribeToTasks(user.uid, (firestoreTasks) => {
      if (!localStorage.getItem(CLEANUP_KEY)) {
        localStorage.setItem(CLEANUP_KEY, 'true')
        if (firestoreTasks.length > 0) {
          const ids = firestoreTasks.map(t => t.id)
          bulkDeleteTasksFromFirestore(user.uid, ids)
        }
        return
      }
      setTasks(firestoreTasks)
    })

    return () => unsubscribe()
  }, [user])

  // SAPIXテキストをリアルタイム購読（カレンダー学習日表示用）
  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeSapixTexts(user.uid, setSapixTexts)
    return () => unsubscribe()
  }, [user])

  // テスト日程をリアルタイム購読（カレンダー表示用）
  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeTestScores(user.uid, setTestScores)
    return () => unsubscribe()
  }, [user])

  // 家庭学習の完了状態を読み込み
  useEffect(() => {
    if (!user) return
    loadHomeworkDone(user.uid).then(result => {
      if (result.success) {
        setHomeworkDone(result.data || {})
      }
    })
  }, [user])

  const toggleHomework = async (hwId) => {
    const updated = { ...homeworkDone, [hwId]: !homeworkDone[hwId] }
    setHomeworkDone(updated)
    if (user) {
      await saveHomeworkDone(user.uid, updated)
    }
  }

  const addTask = async (task) => {
    const newTask = {
      id: Date.now(),
      ...task,
      completed: false,
      createdAt: new Date().toISOString(),
    }

    if (user) {
      // Firestoreに保存
      await addTaskToFirestore(user.uid, newTask)
    } else {
      // ユーザーがログインしていない場合は、localStorageに保存
      const updatedTasks = [...tasks, newTask]
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
    setEditingTask(null)
  }

  const updateTask = async (id, updates) => {
    if (user) {
      // Firestoreで更新
      await updateTaskInFirestore(user.uid, id, updates)
    } else {
      // ユーザーがログインしていない場合は、localStorageで更新
      const updatedTasks = tasks.map(task =>
        task.id === id ? { ...task, ...updates } : task
      )
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
    setEditingTask(null)
    // Return to previous view after updating
    setView(previousView)
  }

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    if (user) {
      // Firestoreで更新
      await updateTaskInFirestore(user.uid, id, { completed: !task.completed })
    } else {
      // ユーザーがログインしていない場合は、localStorageで更新
      const updatedTasks = tasks.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
  }

  const deleteTask = async (id) => {
    if (user) {
      // Firestoreから削除
      await deleteTaskFromFirestore(user.uid, id)
    } else {
      // ユーザーがログインしていない場合は、localStorageから削除
      const updatedTasks = tasks.filter(task => task.id !== id)
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
  }

  const bulkDeleteTasks = async (ids) => {
    if (user) {
      // Firestoreから一括削除
      await bulkDeleteTasksFromFirestore(user.uid, ids)
    } else {
      // ユーザーがログインしていない場合は、localStorageから削除
      const updatedTasks = tasks.filter(task => !ids.includes(task.id))
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
  }

  const handleEditTask = (task) => {
    // Save current view to return to later
    setPreviousView(view)
    // Switch to edit view
    setView('edit')
    setEditingTask(task)
  }

  const handleCancelEdit = () => {
    setEditingTask(null)
    // Return to previous view
    setView(previousView)
  }

  const handleTestClick = (testId) => {
    setPendingTestId(testId)
    setView('testscore')
  }

  // TestScoreView の useEffect deps に渡すため安定参照にする
  const consumeInitialTestId = useCallback(() => setPendingTestId(null), [])

  const addCustomUnit = async (unitData) => {
    if (!user) {
      toast.error('カスタム単元を追加するにはログインが必要です')
      return { success: false }
    }

    const result = await addCustomUnitToFirestore(user.uid, unitData)

    if (result.success) {
      // カスタム単元リストを更新
      const newCustomUnits = [result.data, ...customUnits]
      setCustomUnits(newCustomUnits)
      return { success: true, data: result.data }
    } else {
      toast.error('カスタム単元の追加に失敗しました: ' + result.error)
      return { success: false, error: result.error }
    }
  }

  const handleAuthChange = (currentUser) => {
    setUser(currentUser)
  }

  // ログインしていない場合は、Authコンポーネントを表示
  if (!user) {
    return <Auth onAuthChange={handleAuthChange} />
  }

  return (
    <div className="app sapix-theme">
      <header className="app-header">
        <div className="header-content">
          <h1>🚀 Alpha Orbit</h1>
          <Auth onAuthChange={handleAuthChange} />
        </div>
      </header>

      <div className="container">
        {/* Edit view - show only the form */}
        {view === 'edit' ? (
          <div className="edit-view">
            <div className="edit-header">
              <h2>✏️ タスク編集</h2>
              <button onClick={handleCancelEdit} className="back-btn">
                ← 戻る
              </button>
            </div>
            <TaskForm
              onAddTask={addTask}
              onUpdateTask={updateTask}
              editingTask={editingTask}
              onCancelEdit={handleCancelEdit}
              customUnits={customUnits}
              onAddCustomUnit={addCustomUnit}
            />
          </div>
        ) : (
          <>
            {/* 1. 今日と今週のタスク（最優先） */}
            <TodayAndWeekView
              tasks={tasks}
              testScores={testScores}
              homeworkDone={homeworkDone}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onEditTask={handleEditTask}
              onToggleHomework={toggleHomework}
              onTestClick={handleTestClick}
              userId={user.uid}
            />

            {/* 2. ビュー切り替え */}
            <div className="view-switcher">
          <button
            className={view === 'schedule' ? 'active' : ''}
            onClick={() => setView('schedule')}
          >
            📅 スケジュール
          </button>
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => setView('dashboard')}
          >
            🗺️ 単元マップ
          </button>
          <button
            className={view === 'sapixtext' ? 'active' : ''}
            onClick={() => setView('sapixtext')}
          >
            📘 テキスト
          </button>
          <button
            className={view === 'testscore' ? 'active' : ''}
            onClick={() => setView('testscore')}
          >
            📋 テスト
          </button>
          <button
            className={view === 'pastpaper' ? 'active' : ''}
            onClick={() => setView('pastpaper')}
          >
            📄 過去問
          </button>
          <button
            className={view === 'grades' ? 'active' : ''}
            onClick={() => setView('grades')}
          >
            📈 成績
          </button>
        </div>

        {view === 'schedule' ? (
          <ScheduleView
            tasks={tasks}
            sapixTexts={sapixTexts}
            testScores={testScores}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onBulkDeleteTasks={bulkDeleteTasks}
            onEditTask={handleEditTask}
            onTestClick={handleTestClick}
            userId={user.uid}
          />
        ) : view === 'dashboard' ? (
          <UnitAnalysisView
            tasks={tasks}
            sapixTexts={sapixTexts}
            userId={user.uid}
          />
        ) : view === 'pastpaper' ? (
          <PastPaperView
            tasks={tasks}
            user={user}
            customUnits={customUnits}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        ) : view === 'grades' ? (
          <GradesView
            user={user}
          />
        ) : view === 'testscore' ? (
          <TestScoreView
            user={user}
            initialTestId={pendingTestId}
            onConsumeInitialTestId={consumeInitialTestId}
            sapixTexts={sapixTexts}
          />
        ) : view === 'sapixtext' ? (
          <SapixTextView
            user={user}
          />
        ) : null}
          </>
        )}

        {/* 3. タスク追加フォーム（一番下） - show only on schedule view */}
        {view === 'schedule' && (
          <div ref={taskFormRef}>
            {!showTaskForm ? (
              <button
                className="add-task-toggle-btn"
                onClick={() => setShowTaskForm(true)}
              >
                ＋ 学習タスクを追加
              </button>
            ) : (
              <>
                <button
                  className="add-task-toggle-btn close"
                  onClick={() => setShowTaskForm(false)}
                >
                  ✕ 閉じる
                </button>
                <TaskForm
                  onAddTask={(task) => {
                    addTask(task)
                    setShowTaskForm(false)
                  }}
                  onUpdateTask={updateTask}
                  editingTask={editingTask}
                  onCancelEdit={handleCancelEdit}
                  customUnits={customUnits}
                  onAddCustomUnit={addCustomUnit}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
