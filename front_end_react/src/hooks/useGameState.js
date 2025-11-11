import { useState, useCallback } from 'react'

const initialGameState = {
  room: null,
  currentPlayer: null,
  gameStarted: false,
  isMyTurn: false,
  isHost: false,
  players: [],
  tableCards: [],
  roundNumber: 1
}

export const useGameState = () => {
  const [gameState, setGameState] = useState(initialGameState)

  const updateGameState = useCallback((updates) => {
    setGameState(prev => ({
      ...prev,
      ...updates
    }))
  }, [])

  const clearGameState = useCallback(() => {
    setGameState(initialGameState)
  }, [])

  return {
    gameState,
    updateGameState,
    clearGameState
  }
}