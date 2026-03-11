import { useState, type PointerEventHandler, type MouseEventHandler } from 'react';
import { usePlannerStore } from './state/usePlannerStore';
import { BAR_TYPES, getDragAngle } from './domain/placement';
import type { Anchor, BarType } from './domain/models';
import { calcInnerCenterFromPoints, toArchPath } from './render/archRenderer';
import { getBarRect } from './render/barRenderer';
import { usePlannerStore } from './state/usePlannerStore';

const scoreLabels: Record<'convergence' | 'compactness' | 'collision' | 'balance', string> = {
  convergence: '聚拢',
  compactness: '紧凑',
  collision: '碰撞',
  balance: '平衡'
};

function App() {
  const {
    randomSeed,
    barLengths,
    arch,
    cubic,
    score,
    selectedAnchorId,
    setRandomSeed,
    rerollArch,
    setBarLength,
    setCubicCoefficient,
    addAnchor,
    addAnchorAtPoint,
    removeAnchor,
    selectAnchor,
    placeBar,
    setBarAngle
  } = usePlannerStore();

  const [draggingBar, setDraggingBar] = useState<{ anchorId: string; type: BarType } | null>(null);
  const [draggingAnchorId, setDraggingAnchorId] = useState<string | null>(null);

  const archPath = toArchPath(arch.contour);
  const innerCenter =
    arch.innerCenter.x === 0 && arch.innerCenter.y === 0 ? calcInnerCenterFromPoints(arch.contour) : arch.innerCenter;

  const mapEventToCanvas = (event: { clientX: number; clientY: number }, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * arch.width,
      y: ((event.clientY - rect.top) / rect.height) * arch.height
    };
  };

  const mapEventToCanvas = (event: { clientX: number; clientY: number }, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * arch.width,
      y: ((event.clientY - rect.top) / rect.height) * arch.height
    };
  };

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = (event) => {
    const { x, y } = mapEventToCanvas(event, event.currentTarget);

    if (draggingBar) {
      const anchor = arch.anchors.find((item) => item.id === draggingBar.anchorId);
      if (!anchor) {
        return;
      }
      setBarAngle(anchor.id, draggingBar.type, getDragAngle(anchor, { x, y }));
      return;
    }
    const { x, y } = mapEventToCanvas(event, event.currentTarget);
    const anchor = arch.anchors.find((item) => item.id === dragging.anchorId);
    if (!anchor) {
      return;
    }
    const clickedAnchor = (event.target as HTMLElement).closest('[data-anchor-id]');
    if (clickedAnchor) {
      return;
    }
    const { x, y } = mapEventToCanvas(event, event.currentTarget);
    addAnchorAtPoint(x, y);
  };

  const stopDragging = () => {
    setDraggingBar(null);
    setDraggingAnchorId(null);
  };

  const handleCanvasClick: MouseEventHandler<SVGSVGElement> = (event) => {
    if (dragging) {
      return;
    }
    const clickedAnchor = (event.target as HTMLElement).closest('[data-anchor-id]');
    if (clickedAnchor) {
      return;
    }
    const { x, y } = mapEventToCanvas(event, event.currentTarget);
    addAnchorAtPoint(x, y);
  };

  return (
    <div className="layout">
      <section className="panel canvas-panel">
        <h2>牙弓画布区</h2>
        <svg
          viewBox={`0 0 ${arch.width} ${arch.height}`}
          className="arch-canvas"
          role="img"
          aria-label="dental arch canvas"
          onClick={handleCanvasClick}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerLeave={stopDragging}
        >
          <path d={archPath} className="arch-path" />
          <circle cx={innerCenter.x} cy={innerCenter.y} r={7} className="inner-center" />
          <text x={innerCenter.x} y={innerCenter.y - 12} textAnchor="middle" className="inner-center-label">
            内侧中心
          </text>
          {arch.anchors.map((anchor: Anchor) => (
            <g key={anchor.id}>
              {BAR_TYPES.map((type) => {
                const bar = anchor.bars[type];
                if (!bar.placed) {
                  return null;
                }
                const rect = getBarRect(anchor, bar);
                return (
                  <rect
                    key={`${anchor.id}-${type}`}
                    className={`bar bar-${type}`}
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    transform={`rotate(${rect.angleDeg} ${anchor.x} ${anchor.y})`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setDraggingBar({ anchorId: anchor.id, type });
                    }}
                  />
                );
              })}
              <g
                key={anchor.id}
                data-anchor-id={anchor.id}
                onClick={(event) => {
                  event.stopPropagation();
                  selectAnchor(anchor.id);
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  removeAnchor(anchor.id);
                }}
                className="anchor-group"
              >
                <circle
                  cx={anchor.x}
                  cy={anchor.y}
                  r={selectedAnchorId === anchor.id ? 12 : 10}
                  className={selectedAnchorId === anchor.id ? 'anchor active' : 'anchor'}
                />
                <text x={anchor.x} y={anchor.y - 16} textAnchor="middle">
                  {anchor.id}
                </text>
              </g>
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

        {(['a', 'b', 'c', 'd'] as const).map((key) => (
          <label key={key}>
            {key} = {cubic[key].toFixed(5)}
            <input
              type="range"
              min={CUBIC_RANGES[key].min}
              max={CUBIC_RANGES[key].max}
              step={key === 'a' ? 0.00001 : key === 'b' ? 0.0001 : 0.0001}
              value={cubic[key]}
              onChange={(event) => setCubicCoefficient(key, Number(event.target.value))}
            />
          </label>
        ))}

        {(['short', 'medium', 'long'] as BarType[]).map((type) => (
          <label key={type}>
            {type} 扫描杆长度(mm)
            <input
              type="number"
              min={5}
              max={30}
              value={barLengths[type]}
              onChange={(e) => setBarLength(type, Number(e.target.value))}
            />
          </label>
        ))}

        <div className="actions place-actions">
          {(BAR_TYPES as BarType[]).map((type) => (
            <button
              key={type}
              type="button"
              disabled={!selectedAnchorId}
              onClick={() => {
                if (selectedAnchorId) {
                  placeBar(selectedAnchorId, type);
                }
              }}
            >
              放置 {type}
            </button>
          ))}
        </div>

        <div className="actions">
          <button type="button" onClick={rerollArch}>
            重新随机生成
          </button>
          <button type="button" onClick={addAnchor}>
            添加 Anchor
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedAnchorId) removeAnchor(selectedAnchorId);
            }}
            disabled={!selectedAnchorId}
          >
            删除选中 Anchor
          </button>
        </div>
        <p className="tips">点击曲线或画布可添加点；双击已添加点可删除。</p>
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
