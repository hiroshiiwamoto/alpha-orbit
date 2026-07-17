import { useState } from 'react'
import './DeviationChart.css'

const MODES = [
  { key: 'four', label: '4科目' },
  { key: 'two', label: '2科目' },
  { key: 'subjects', label: '各科目' },
]

const subjectKeys = ['sansu', 'kokugo', 'rika', 'shakai']
const subjectLabels = { sansu: '算数', kokugo: '国語', rika: '理科', shakai: '社会' }
const subjectColors = { sansu: '#ef4444', kokugo: '#10b981', rika: '#3b82f6', shakai: '#f59e0b' }
const subjectEmojis = { sansu: '🔢', kokugo: '📖', rika: '🔬', shakai: '🌏' }

// ── 単一ライン折れ線グラフ（共通描画）──────────────────────
// points: [{ val, index }] — index は data 配列上の位置
// 自身のデータ範囲で Y スケールを計算して 1 本のラインを描く
function SingleLineChart({ data, points, color, compact = false }) {
  if (points.length === 0) return null

  const values = points.map(p => p.val)
  const minVal = Math.floor(Math.min(...values) - 3)
  const maxVal = Math.ceil(Math.max(...values) + 3)
  const range = maxVal - minVal || 1

  const width = 600
  const height = compact ? 240 : 300
  const padding = { top: 26, right: 20, bottom: compact ? 46 : 60, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const xStep = chartWidth / (data.length - 1 || 1)
  const getY = (val) => padding.top + chartHeight - ((val - minVal) / range) * chartHeight

  const coords = points.map(p => ({
    ...p,
    x: padding.left + p.index * xStep,
    y: getY(p.val),
  }))

  const path = coords.length >= 2
    ? coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : ''

  const gridLines = []
  const gridStep = range > 20 ? 5 : range > 10 ? 2 : 1
  for (let v = Math.ceil(minVal / gridStep) * gridStep; v <= maxVal; v += gridStep) {
    gridLines.push(v)
  }

  const show50Line = minVal < 50 && maxVal > 50

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      {/* Grid */}
      {gridLines.map(v => (
        <g key={v}>
          <line
            x1={padding.left} y1={getY(v)}
            x2={width - padding.right} y2={getY(v)}
            stroke={v === 50 ? '#007AFF' : '#e5e7eb'}
            strokeWidth={v === 50 ? 1.5 : 0.5}
            strokeDasharray={v === 50 ? '6,3' : 'none'}
          />
          <text x={padding.left - 8} y={getY(v) + 4} textAnchor="end" fontSize="11" fill="#86868b">
            {v}
          </text>
        </g>
      ))}

      {show50Line && (
        <text x={width - padding.right + 4} y={getY(50) + 4} fontSize="10" fill="#007AFF" fontWeight="600">
          50
        </text>
      )}

      {/* X axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={padding.left + i * xStep}
          y={height - padding.bottom + 20}
          textAnchor="middle"
          fontSize="10"
          fill="#86868b"
          transform={`rotate(-30, ${padding.left + i * xStep}, ${height - padding.bottom + 20})`}
        >
          {new Date(d.testDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
        </text>
      ))}

      {/* Line */}
      {path && <path d={path} fill="none" stroke={color} strokeWidth={2.5} />}
      {coords.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={color} strokeWidth="2" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill={color} fontWeight="600">
            {p.val}
          </text>
        </g>
      ))}
    </svg>
  )
}

function DeviationChart({ data }) {
  const [mode, setMode] = useState(null)

  if (!data || data.length < 1) return null

  // 各ラインのポイントを構築
  const buildLine = (key) => {
    const points = []
    data.forEach((d, i) => {
      let val = null
      if (key === 'four') val = d.fourSubjects?.deviation ? parseFloat(d.fourSubjects.deviation) : null
      else if (key === 'two') val = d.twoSubjects?.deviation ? parseFloat(d.twoSubjects.deviation) : null
      else val = d[key]?.deviation ? parseFloat(d[key].deviation) : null
      if (val !== null && !isNaN(val)) {
        points.push({ val, index: i })
      }
    })
    return points
  }

  const fourLine = buildLine('four')
  const twoLine = buildLine('two')
  const subjectLines = {}
  subjectKeys.forEach(key => { subjectLines[key] = buildLine(key) })

  const hasSubjects = subjectKeys.some(key => subjectLines[key].length > 0)

  // データがあるモードを自動選択
  const effectiveMode = mode ||
    (fourLine.length > 0 ? 'four' : twoLine.length > 0 ? 'two' : hasSubjects ? 'subjects' : 'four')

  const hasActiveData =
    effectiveMode === 'four' ? fourLine.length > 0 :
    effectiveMode === 'two' ? twoLine.length > 0 :
    hasSubjects

  return (
    <div className="deviation-chart">
      <div className="chart-header">
        <h3>📈 偏差値推移</h3>
        <div className="chart-mode-tabs">
          {MODES.map(m => (
            <button
              key={m.key}
              className={`chart-mode-tab ${effectiveMode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {!hasActiveData ? (
        <div className="chart-no-data">このモードのデータはありません</div>
      ) : effectiveMode === 'subjects' ? (
        /* 各科目 — 科目ごとに独立したグラフを並べる */
        <div className="subject-charts-grid">
          {subjectKeys.map(key => {
            if (subjectLines[key].length < 1) return null
            return (
              <div key={key} className="subject-chart-cell">
                <h4 className="subject-chart-title" style={{ color: subjectColors[key] }}>
                  {subjectEmojis[key]} {subjectLabels[key]}
                </h4>
                <div className="chart-wrapper">
                  <SingleLineChart
                    data={data}
                    points={subjectLines[key]}
                    color={subjectColors[key]}
                    compact
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* 4科目 / 2科目 — 従来通り1つの大きなグラフ */
        <>
          <div className="chart-wrapper">
            <SingleLineChart
              data={data}
              points={effectiveMode === 'four' ? fourLine : twoLine}
              color={effectiveMode === 'four' ? '#3b82f6' : '#10b981'}
            />
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span
                className="legend-color"
                style={{ background: effectiveMode === 'four' ? '#3b82f6' : '#10b981' }}
              />
              <span>{effectiveMode === 'four' ? '4科目' : '2科目'}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DeviationChart
