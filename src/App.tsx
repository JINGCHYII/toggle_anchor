import { usePlannerStore } from './state/usePlannerStore';
import { calcInnerCenterFromPoints, toArchPath } from './render/archRenderer';
import type { Anchor, BarType } from './domain/models';

const scoreLabels: Record<keyof Omit<ReturnType<typeof usePlannerStore.getState>['score'], 'total'>, string> = {
  cohesion: '聚拢',
  compactness: '紧凑',
  collision: '碰撞',
  balance: '平衡'
};

function App() {
  const {
    randomSeed,
    barLengths,
    arch,
    score,
    setRandomSeed,
    rerollArch,
    setBarLength,
    addAnchor,
    removeAnchor,
    toggleAnchor
  } = usePlannerStore();

  const archPath = toArchPath(arch.contour);
  const innerCenter = arch.innerCenter.x === 0 && arch.innerCenter.y === 0 ? calcInnerCenterFromPoints(arch.contour) : arch.innerCenter;

  return (
    <div className="layout">
      <section className="panel canvas-panel">
        <h2>牙弓画布区</h2>
        <svg viewBox={`0 0 ${arch.width} ${arch.height}`} className="arch-canvas" role="img" aria-label="dental arch canvas">
          <path d={archPath} className="arch-path" />
          <circle cx={innerCenter.x} cy={innerCenter.y} r={7} className="inner-center" />
          <text x={innerCenter.x} y={innerCenter.y - 12} textAnchor="middle" className="inner-center-label">
            内侧中心
          </text>
          {arch.anchors.map((anchor: Anchor) => (
            <g key={anchor.id} onClick={() => toggleAnchor(anchor.id)} className="anchor-group">
              <circle cx={anchor.x} cy={anchor.y} r={anchor.active ? 12 : 10} className={anchor.active ? 'anchor active' : 'anchor'} />
              <text x={anchor.x} y={anchor.y - 16} textAnchor="middle">
                {anchor.id}
              </text>
            </g>
          ))}
        </svg>
      </section>

      <section className="panel controls-panel">
        <h2>参数控制区</h2>
        <label>
          随机种子
          <input type="number" value={randomSeed} onChange={(e) => setRandomSeed(Number(e.target.value))} />
        </label>
        {(['short', 'medium', 'long'] as BarType[]).map((type) => (
          <label key={type}>
            {type} 扫描杆长度
            <input
              type="range"
              min={5}
              max={30}
              value={barLengths[type]}
              onChange={(e) => setBarLength(type, Number(e.target.value))}
            />
            <span>{barLengths[type]} mm</span>
          </label>
        ))}
        <div className="actions">
          <button type="button" onClick={rerollArch}>重新随机生成</button>
          <button type="button" onClick={addAnchor}>添加 Anchor</button>
          <button
            type="button"
            onClick={() => {
              const last = arch.anchors.at(-1);
              if (last) removeAnchor(last.id);
            }}
            disabled={arch.anchors.length === 0}
          >
            删除 Anchor
          </button>
        </div>
      </section>

      <section className="panel score-panel">
        <h2>评分面板</h2>
        <ul>
          {(Object.keys(scoreLabels) as (keyof typeof scoreLabels)[]).map((key) => (
            <li key={key}>
              <span>{scoreLabels[key]}</span>
              <strong>{score[key]}</strong>
            </li>
          ))}
        </ul>
        <p className="total">总分：{score.total}</p>
      </section>
    </div>
  );
}

export default App;
