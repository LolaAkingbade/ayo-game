import { useMemo, useRef, useState } from 'react'
import './App.css'
import {
  BOTTOM_ROW,
  PLAYER_NAMES,
  PLAYER_PODS,
  RULE_PRESETS,
  TOP_ROW,
  createInitialState,
  getRulePreset,
  isOwnedByPlayer,
  runMove,
  sumPods,
} from './gameLogic'

function App() {
  const [state, setState] = useState(createInitialState)
  const [history, setHistory] = useState([])
  const [rulePresetId, setRulePresetId] = useState(RULE_PRESETS[0].id)
  const [isAnimating, setIsAnimating] = useState(false)
  const [movingBall, setMovingBall] = useState(null)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const boardRef = useRef(null)
  const podRefs = useRef({})
  const activeRulePreset = useMemo(() => getRulePreset(rulePresetId), [rulePresetId])

  const topRowTotal = useMemo(() => sumPods(PLAYER_PODS[1], state.board), [state.board])
  const bottomRowTotal = useMemo(() => sumPods(PLAYER_PODS[0], state.board), [state.board])

  const animateSowing = async ({ selectedPod, sowSteps }) => {
    const boardRect = boardRef.current?.getBoundingClientRect()
    if (!boardRect) return

    let fromPod = selectedPod
    for (const targetPod of sowSteps) {
      const fromRect = podRefs.current[fromPod]?.getBoundingClientRect()
      const toRect = podRefs.current[targetPod]?.getBoundingClientRect()
      if (!fromRect || !toRect) continue

      setMovingBall({
        fromX: fromRect.left + fromRect.width / 2 - boardRect.left,
        fromY: fromRect.top + fromRect.height / 2 - boardRect.top,
        toX: toRect.left + toRect.width / 2 - boardRect.left,
        toY: toRect.top + toRect.height / 2 - boardRect.top,
      })

      // Keep the tempo readable for players and highlight each sow step.
      await new Promise((resolve) => {
        setTimeout(resolve, 220)
      })

      fromPod = targetPod
    }
  }

  const handlePodClick = async (podIndex) => {
    if (isAnimating || state.gameOver) return
    if (!isOwnedByPlayer(podIndex, state.currentPlayer)) return
    if (state.board[podIndex] === 0) return

    setIsAnimating(true)
    const move = runMove({
      state,
      selectedPod: podIndex,
      captureRule: activeRulePreset.captureRule,
    })
    await animateSowing({ selectedPod: podIndex, sowSteps: move.sowSteps })
    setMovingBall(null)
    setState(move.nextState)
    setHistory((prev) => [
      {
        turn: prev.length + 1,
        player: state.currentPlayer,
        selectedPod: podIndex,
        capturedCount: move.capturedCount,
        relayCount: move.relayPickups.length,
        capturedPods: move.capturedPods,
        ruleName: activeRulePreset.name,
        previousState: state,
      },
      ...prev,
    ])
    setIsAnimating(false)
  }

  const resetGame = () => {
    setState(createInitialState())
    setHistory([])
    setMovingBall(null)
    setIsAnimating(false)
  }

  const handleUndo = () => {
    if (isAnimating || history.length === 0) return
    const [lastMove, ...rest] = history
    setState(lastMove.previousState)
    setHistory(rest)
  }

  const handleRuleChange = (event) => {
    setRulePresetId(event.target.value)
    resetGame()
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>AYO Olopon</h1>
          <p className="subtitle">Traditional strategy, modern digital board.</p>
        </div>
        <div className="toolbar">
          <label className="rule-selector">
            Rule Preset
            <select value={rulePresetId} onChange={handleRuleChange}>
              {RULE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ui-button secondary"
            onClick={handleUndo}
            disabled={history.length === 0 || isAnimating}
          >
            Undo Move
          </button>
          <button type="button" className="ui-button" onClick={() => setShowHowToPlay(true)}>
            How to Play
          </button>
          <button type="button" className="ui-button secondary" onClick={resetGame}>
            New Game
          </button>
        </div>
      </header>

      <section className="scores">
        <article className={`score-card ${state.currentPlayer === 1 ? 'active' : ''}`}>
          <h2>{PLAYER_NAMES[1]}</h2>
          <strong>{state.scores[1]}</strong>
          <span>{topRowTotal} on board</span>
        </article>
        <article className="turn-pill">{state.message}</article>
        <article className={`score-card ${state.currentPlayer === 0 ? 'active' : ''}`}>
          <h2>{PLAYER_NAMES[0]}</h2>
          <strong>{state.scores[0]}</strong>
          <span>{bottomRowTotal} on board</span>
        </article>
      </section>

      <section className="board" ref={boardRef}>
        <div className="board-row top-row">
          {TOP_ROW.map((podIndex) => (
            <button
              key={podIndex}
              type="button"
              className={`pod ${isOwnedByPlayer(podIndex, state.currentPlayer) ? 'owner' : ''}`}
              onClick={() => handlePodClick(podIndex)}
              ref={(el) => {
                podRefs.current[podIndex] = el
              }}
              disabled={isAnimating || state.gameOver}
            >
              <span className="pod-index">{podIndex + 1}</span>
              <span className="pod-count">{state.board[podIndex]}</span>
            </button>
          ))}
        </div>
        <div className="board-row bottom-row">
          {BOTTOM_ROW.map((podIndex) => (
            <button
              key={podIndex}
              type="button"
              className={`pod ${isOwnedByPlayer(podIndex, state.currentPlayer) ? 'owner' : ''}`}
              onClick={() => handlePodClick(podIndex)}
              ref={(el) => {
                podRefs.current[podIndex] = el
              }}
              disabled={isAnimating || state.gameOver}
            >
              <span className="pod-index">{podIndex + 1}</span>
              <span className="pod-count">{state.board[podIndex]}</span>
            </button>
          ))}
        </div>

        {movingBall && (
          <span
            className="moving-ball"
            style={{
              '--from-x': `${movingBall.fromX}px`,
              '--from-y': `${movingBall.fromY}px`,
              '--to-x': `${movingBall.toX}px`,
              '--to-y': `${movingBall.toY}px`,
            }}
          />
        )}
      </section>

      <section className="history-panel">
        <h3>Move History</h3>
        {history.length === 0 ? (
          <p className="history-empty">No moves yet.</p>
        ) : (
          <ul className="history-list">
            {history.map((move) => (
              <li key={move.turn}>
                <strong>
                  Turn {move.turn}: {PLAYER_NAMES[move.player]}
                </strong>{' '}
                sowed from pod {move.selectedPod + 1}
                {move.relayCount > 0 ? ` with ${move.relayCount} relay pickup(s)` : ''}, captured{' '}
                {move.capturedCount} balls
                {move.capturedPods.length > 0
                  ? ` (pods ${move.capturedPods.map((pod) => pod + 1).join(', ')})`
                  : ''}.
              </li>
            ))}
          </ul>
        )}
      </section>

      {showHowToPlay && (
        <dialog open className="modal">
          <h3>How to Play AYO</h3>
          <p>Pick a pod from your row. Sow one-by-one counterclockwise.</p>
          <p>
            If your last ball lands in a pod that already had balls, pick them up and continue sowing
            (relay play). Your turn ends only when the last ball lands in an originally empty pod.
          </p>
          <p>Captures follow the selected preset. You can switch presets at any time for different play styles.</p>
          <p>The game ends when one side has no playable pods. Remaining balls are added to scores.</p>
          <button type="button" className="ui-button" onClick={() => setShowHowToPlay(false)}>
            Close
          </button>
        </dialog>
      )}

      {state.gameOver && (
        <dialog open className="modal win">
          <h3>{state.winner === null ? 'It is a draw!' : `${PLAYER_NAMES[state.winner]} wins!`}</h3>
          <p>
            Final Score: {PLAYER_NAMES[0]} {state.scores[0]} - {state.scores[1]} {PLAYER_NAMES[1]}
          </p>
          <button type="button" className="ui-button" onClick={resetGame}>
            Play Again
          </button>
        </dialog>
      )}
    </main>
  )
}

export default App
