export const PLAYER_NAMES = ['Player 1', 'Player 2']
export const POD_COUNT = 12
export const INITIAL_BALLS_PER_POD = 4
export const PLAYER_PODS = {
  0: [0, 1, 2, 3, 4, 5],
  1: [6, 7, 8, 9, 10, 11],
}

export const TOP_ROW = [11, 10, 9, 8, 7, 6]
export const BOTTOM_ROW = [0, 1, 2, 3, 4, 5]

export const isOwnedByPlayer = (podIndex, player) => PLAYER_PODS[player].includes(podIndex)

export const sumPods = (pods, board) => pods.reduce((acc, pod) => acc + board[pod], 0)

const getNextPod = (index) => (index + 1) % POD_COUNT

// Capture rules are centralized here so variants can be swapped without UI rewrites.
export const defaultCaptureRule = ({ board, currentPlayer, lastPod }) => {
  const opponent = currentPlayer === 0 ? 1 : 0
  if (!isOwnedByPlayer(lastPod, opponent)) return []

  const capturedPods = []
  let cursor = lastPod

  while (isOwnedByPlayer(cursor, opponent)) {
    const seeds = board[cursor]
    if (seeds !== 2 && seeds !== 3) break
    capturedPods.push(cursor)
    cursor = (cursor - 1 + POD_COUNT) % POD_COUNT
  }

  return capturedPods
}

export const noCaptureRule = () => []

export const singlePodCaptureRule = ({ board, currentPlayer, lastPod }) => {
  const opponent = currentPlayer === 0 ? 1 : 0
  if (!isOwnedByPlayer(lastPod, opponent)) return []
  const seeds = board[lastPod]
  return seeds === 2 || seeds === 3 ? [lastPod] : []
}

export const RULE_PRESETS = [
  {
    id: 'classic-chain',
    name: 'Classic Chain Capture',
    description: 'Capture backward on opponent pods while each has 2 or 3 balls.',
    captureRule: defaultCaptureRule,
  },
  {
    id: 'single-pod',
    name: 'Single Pod Capture',
    description: 'Only capture the final pod when it ends on 2 or 3 balls.',
    captureRule: singlePodCaptureRule,
  },
  {
    id: 'no-capture',
    name: 'Practice (No Capture)',
    description: 'Disable captures for learning and faster practice games.',
    captureRule: noCaptureRule,
  },
]

export const getRulePreset = (ruleId) =>
  RULE_PRESETS.find((preset) => preset.id === ruleId) ?? RULE_PRESETS[0]

export const createInitialState = () => ({
  board: Array.from({ length: POD_COUNT }, () => INITIAL_BALLS_PER_POD),
  scores: [0, 0],
  currentPlayer: 0,
  gameOver: false,
  winner: null,
  message: `${PLAYER_NAMES[0]}'s turn`,
})

const resolveEndgame = (state) => {
  const board = [...state.board]
  const scores = [...state.scores]

  const p0Remaining = sumPods(PLAYER_PODS[0], board)
  const p1Remaining = sumPods(PLAYER_PODS[1], board)

  if (p0Remaining === 0 || p1Remaining === 0) {
    scores[0] += p0Remaining
    scores[1] += p1Remaining
    PLAYER_PODS[0].forEach((pod) => {
      board[pod] = 0
    })
    PLAYER_PODS[1].forEach((pod) => {
      board[pod] = 0
    })

    let winner = null
    if (scores[0] > scores[1]) winner = 0
    if (scores[1] > scores[0]) winner = 1

    return {
      ...state,
      board,
      scores,
      gameOver: true,
      winner,
      message: winner === null ? 'Draw game!' : `${PLAYER_NAMES[winner]} wins!`,
    }
  }

  return state
}

export const runMove = ({ state, selectedPod, captureRule = defaultCaptureRule }) => {
  const board = [...state.board]
  const scores = [...state.scores]
  let ballsInHand = board[selectedPod]
  board[selectedPod] = 0

  const sowSteps = []
  const relayPickups = []
  let cursor = selectedPod

  // Relay sowing (Ayo): continue from the landing pod if it was not empty before landing.
  while (ballsInHand > 0) {
    cursor = getNextPod(cursor)
    const previousCount = board[cursor]
    board[cursor] += 1
    sowSteps.push(cursor)

    ballsInHand -= 1

    if (ballsInHand === 0 && previousCount > 0) {
      relayPickups.push(cursor)
      ballsInHand = board[cursor]
      board[cursor] = 0
    }
  }

  const capturedPods = captureRule({
    board,
    currentPlayer: state.currentPlayer,
    lastPod: cursor,
  })

  let capturedCount = 0
  capturedPods.forEach((pod) => {
    capturedCount += board[pod]
    board[pod] = 0
  })
  scores[state.currentPlayer] += capturedCount

  const nextPlayer = state.currentPlayer === 0 ? 1 : 0
  let nextState = {
    ...state,
    board,
    scores,
    currentPlayer: nextPlayer,
    message: `${PLAYER_NAMES[nextPlayer]}'s turn`,
  }

  nextState = resolveEndgame(nextState)

  return {
    sowSteps,
    relayPickups,
    capturedPods,
    capturedCount,
    nextState,
  }
}
