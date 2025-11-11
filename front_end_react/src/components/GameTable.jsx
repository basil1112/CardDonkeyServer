import React, { useState, useEffect } from 'react'
import PlayerHand from './PlayerHand'
import RoundIndicator from './RoundIndicator'
import Card from './Card'
import LoadingSpinner from './LoadingSpinner'
import GameTableCard from './GameTableCard'

const GameTable = ({ gameState, socket, onPlayCard, onStartGame, onBackToLobby }) => {
  const [tableCards, setTableCards] = useState([])
  const [players, setPlayers] = useState([])
  const [currentTurn, setCurrentTurn] = useState('')
  const [gameOver, setGameOver] = useState(null)
  const [showGameOverModal, setShowGameOverModal] = useState(false)
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false)
  const voiceChatIframeRef = React.useRef(null)
  const [isVoiceMinimized, setIsVoiceMinimized] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!socket) return

    const handleAddCardToTable = (data) => {
      console.log('🃏 Card added to table:', data)
      setTableCards(prev => [...prev, {
        cardId: data.card,
        playerId: data.playerId,
        playerName: data.playerName
      }])
    }

    const handleClearTable = (data) => {
      console.log('🧹 Table cleared:', data)
      setTableCards([])
    }

    const handlePlayersUpdated = (data) => {
      try {
        console.log('👥 Players state updated:', data)
        if (data.players) {
          setPlayers(data.players)

          // Find whose turn it is from the players data
          const currentTurnPlayer = data.players.find(p => p.isMyTurn)
          if (currentTurnPlayer) {
            setCurrentTurn(currentTurnPlayer.name)
          }
        }
      } catch (error) {
        console.error('Error updating players state:', error)
      }
    }

    const handleTurnChanged = (data) => {
      console.log('🔄 Turn changed:', data)
      setCurrentTurn(data.playerName)
    }

    const handleTurnUpdate = (isMyTurn) => {
      console.log('🔄 Turn update:', isMyTurn)
      // This event is for the current player only
      if (isMyTurn) {
        // Find current player's name
        const currentPlayer = players.find(p => p.id === socket.id)
        if (currentPlayer) {
          setCurrentTurn(currentPlayer.name)
        }
      }
    }

    const handleRoomUpdated = (roomData) => {
      try {
        const updatedRoom = JSON.parse(roomData)
        console.log('🔄 Room updated with players:', updatedRoom.player)

        // Update players state from room data
        if (updatedRoom && updatedRoom.player) {
          const playersData = updatedRoom.player.map(p => ({
            id: p.id,
            name: p.name,
            cardCount: p.card ? p.card.length : 0,
            isMyTurn: p.isMyTurn,
            hasWon: p.hasWon || false,
            cards: p.card || []
          }))
          setPlayers(playersData)

          // Update current turn from room data
          const currentTurnPlayer = updatedRoom.player.find(p => p.isMyTurn)
          if (currentTurnPlayer) {
            setCurrentTurn(currentTurnPlayer.name)
          }
        }
      } catch (error) {
        console.error('Error parsing room update:', error)
      }
    }

    const handleGameOver = (data) => {
      console.log('🏁 Game Over:', data)
      setGameOver(data)
      setShowGameOverModal(true)
    }

    const handlePlayerWon = (data) => {
      console.log('🎉 Player Won:', data)
      // Update players with winner information
      if (data.winners && players.length > 0) {
        const updatedPlayers = players.map(player => ({
          ...player,
          hasWon: data.winners.some(winner => winner.id === player.id)
        }))
        setPlayers(updatedPlayers)
      }
    }



    socket.on('ADD_CARD_TABLE', handleAddCardToTable)
    socket.on('CLEAR_TABLE', handleClearTable)
    socket.on('players_updated', handlePlayersUpdated)
    socket.on('turn_changed', handleTurnChanged)
    socket.on('TURN_UPDATE', handleTurnUpdate)
    socket.on('room_updated', handleRoomUpdated)
    socket.on('game_over', handleGameOver)
    socket.on('player_won', handlePlayerWon)

    return () => {
      socket.off('ADD_CARD_TABLE', handleAddCardToTable)
      socket.off('CLEAR_TABLE', handleClearTable)
      socket.off('players_updated', handlePlayersUpdated)
      socket.off('turn_changed', handleTurnChanged)
      socket.off('TURN_UPDATE', handleTurnUpdate)
      socket.off('room_updated', handleRoomUpdated)
      socket.off('game_over', handleGameOver)
      socket.off('player_won', handlePlayerWon)
    }
  }, [socket, gameState.room, players])

  // Initialize players from room data
  useEffect(() => {
    if (gameState.room && gameState.room.player) {
      console.log('🎯 Initializing players from room:', gameState.room.player)
      const playersData = gameState.room.player.map(p => ({
        id: p.id,
        name: p.name,
        cardCount: p.card ? p.card.length : 0,
        isMyTurn: p.isMyTurn,
        hasWon: p.hasWon || false,
        cards: p.card || []
      }))
      setPlayers(playersData)

      // Set initial turn
      const currentTurnPlayer = gameState.room.player.find(p => p.isMyTurn)
      if (currentTurnPlayer) {
        setCurrentTurn(currentTurnPlayer.name)
      }
    }
  }, [gameState.room])

  // Update players when game starts
  useEffect(() => {
    if (gameState.gameStarted && gameState.room) {
      console.log('🎲 Game started, updating players with cards')
      const playersData = gameState.room.player.map(p => ({
        id: p.id,
        name: p.name,
        cardCount: p.card ? p.card.length : 0,
        isMyTurn: p.isMyTurn,
        hasWon: p.hasWon || false,
        cards: p.card || []
      }))
      setPlayers(playersData)

      // Set initial turn after game start
      const currentTurnPlayer = gameState.room.player.find(p => p.isMyTurn)
      if (currentTurnPlayer) {
        setCurrentTurn(currentTurnPlayer.name)
      }
    }
  }, [gameState.gameStarted, gameState.room])

  const isRoomCreator = gameState.isHost
  const allPlayersJoined = gameState.room &&
    gameState.room.player.length === gameState.room.roomTotalCount

  const currentPlayers = gameState.room ? gameState.room.player.length : 0
  const maxPlayers = gameState.room ? gameState.room.roomTotalCount : 0

  // Get current player
  const currentPlayer = players.find(player => player.id === socket.id)

  // Determine turn display text
  const getTurnDisplayText = () => {
    if (gameState.isMyTurn) {
      return 'Your turn!'
    } else if (currentTurn) {
      return `${currentTurn}'s turn`
    } else {
      return 'Waiting for turn...'
    }
  }

  const handleRestartGame = () => {
    if (!socket) {
      console.warn('No socket connection')
      return
    }
    if (!isRoomCreator) {
      console.warn('Only room creator can restart the game')
      return
    }

    const payload = {
      roomId: gameState.room?.roomId
    }

    // Clear local UI state immediately to avoid accumulation while server restarts
    setTableCards([])
    setPlayers(prev => prev.map(p => ({ ...p, cards: [], cardCount: 0, hasWon: false })))
    setGameOver(null)
    setShowGameOverModal(false)

    try {
      socket.emit('RESTART_GAME', JSON.stringify(payload))
      console.log('🔄 Sent RESTART_GAME for room', payload.roomId)
    } catch (err) {
      console.error('Error emitting RESTART_GAME:', err)
    }
  }

  const handleLeaveRoom = () => {
    if (!socket) {
      console.warn('No socket connection')
      onBackToLobby()
      return
    }

    const payload = {
      roomId: gameState.room?.roomId
    }

    try {
      socket.emit('LEAVE_ROOM', JSON.stringify(payload))
      console.log('👋 Sent LEAVE_ROOM for room', payload.roomId)
    } catch (err) {
      console.error('Error emitting LEAVE_ROOM:', err)
    }

    // Navigate back to lobby after emitting
    setTimeout(() => {
      onBackToLobby()
    }, 100)
  }

  const getRandomLineColor = () => {
    const colors = ['bg-green-500', 'bg-red-500'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Game Over Modal Overlay */}
      {gameOver && showGameOverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b flex items-center justify-between p-6">
              <h2 className="text-3xl font-bold text-gray-800">🏁 Game Over!</h2>
              <button
                onClick={() => setShowGameOverModal(false)}
                className="text-gray-600 hover:text-gray-800 text-2xl font-bold"
                title="Close modal and view game table"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Game Over Message */}
              <div className={`text-center mb-6 p-4 rounded-lg ${gameOver.donkey?.id === socket.id ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'
                }`}>
                <div className={`text-2xl font-bold ${gameOver.donkey?.id === socket.id ? 'text-red-600' : 'text-green-600'
                  }`}>
                  {gameOver.message}
                </div>
              </div>

              {/* Donkey and Winners Sections */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Donkey Section */}
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <h3 className="text-lg font-bold text-red-800 mb-3">🐴 Donkey</h3>
                  {gameOver.donkey && (
                    <div className={`p-3 rounded-lg ${gameOver.donkey.id === socket.id ? 'bg-red-100 border-2 border-red-300' : 'bg-white'
                      }`}>
                      <p className="font-semibold text-red-700">{gameOver.donkey.name}</p>
                      <p className="text-xs text-red-600">Last player with cards</p>
                      {gameOver.donkey.id === socket.id && (
                        <p className="text-xs text-red-500 mt-2">That's you! Better luck next time!</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Winners Section */}
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <h3 className="text-lg font-bold text-green-800 mb-3">🏆 Winners</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {gameOver.winners?.map((winner) => (
                      <div
                        key={winner.id}
                        className={`p-2 rounded text-sm ${winner.id === socket.id ? 'bg-green-100 border-2 border-green-300' : 'bg-white'
                          }`}
                      >
                        <p className="font-semibold text-green-700">{winner.name}</p>
                        <p className="text-xs text-green-600">
                          {winner.id === socket.id ? '🎉 Congratulations!' : 'Successfully avoided being the donkey!'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Final Standings */}
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200 mb-6">
                <h3 className="font-bold text-blue-800 mb-3">Final Standings</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {players.map((player) => (
                    <div key={player.id} className="flex justify-between items-center p-2 bg-white rounded text-sm">
                      <span className="font-medium">
                        {player.name}
                        {player.id === socket.id && ' (You)'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${player.id === gameOver.donkey?.id
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {player.id === gameOver.donkey?.id ? 'Donkey 🐴' : 'Winner 🏆'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Close Button */}
                <button
                  onClick={() => setShowGameOverModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                >
                  View Game Table
                </button>

                {/* Create New Game Button (Host Only) */}
                {isRoomCreator && (
                  <button
                    onClick={handleRestartGame}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Create New Game
                  </button>
                )}

                {/* Leave Room Button */}
                <button
                  onClick={handleLeaveRoom}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Navbar (desktop + mobile) */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Room: {gameState.room?.roomName || '—'}</h1>
            {/* Desktop: show full info */}
            <p className="text-gray-600 text-xs hidden sm:block">ID: {gameState.room?.roomId || '—'} • Players: {currentPlayers}/{maxPlayers}{isRoomCreator ? ' • Host' : ''}</p>
            {/* Mobile: show room id and players directly in navbar for quick access */}
            <p className="text-gray-600 text-xs sm:hidden">ID: {gameState.room?.roomId || '—'} • {currentPlayers}/{maxPlayers} players</p>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center space-x-4">
            <RoundIndicator roundNumber={gameState.roundNumber || 1} currentTurn={currentTurn} isMyTurn={gameState.isMyTurn} />

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsVoiceChatActive(prev => !prev)}
                className={`px-4 py-2 text-sm ${isVoiceChatActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors flex items-center space-x-2`}
              >
                <span>{isVoiceChatActive ? '🔴' : '🎤'}</span>
                <span>Voice Chat {isVoiceChatActive ? 'On' : 'Off'}</span>
              </button>

              <button
                onClick={handleRestartGame}
                disabled={!isRoomCreator}
                title={!isRoomCreator ? 'Only the host can create a new game' : 'Create a new game with current players'}
                className={`px-4 py-2 text-sm rounded-lg font-semibold transition-colors ${isRoomCreator ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}
              >
                Create New Game
              </button>

              <button onClick={handleLeaveRoom} className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600">Leave Room</button>
            </div>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(prev => !prev)} className="p-2 rounded-md border" aria-label="Toggle menu">☰</button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="container mx-auto px-4 py-3 space-y-3">
              <div className="text-sm text-gray-600">Room ID: <strong className="font-mono">{gameState.room?.roomId || '—'}</strong></div>
              <RoundIndicator roundNumber={gameState.roundNumber || 1} currentTurn={currentTurn} isMyTurn={gameState.isMyTurn} />
              <div className="flex flex-col gap-2">
                <button onClick={() => setIsVoiceChatActive(prev => !prev)} className={`w-full text-left px-4 py-2 rounded-lg ${isVoiceChatActive ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>{isVoiceChatActive ? 'Disconnect Voice Chat' : 'Join Voice Chat'}</button>
                <button onClick={handleRestartGame} disabled={!isRoomCreator} className={`w-full text-left px-4 py-2 rounded-lg font-semibold ${isRoomCreator ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}>Create New Game</button>
                <button onClick={handleLeaveRoom} className="w-full text-left px-4 py-2 rounded-lg bg-gray-200 text-gray-800">Leave Room</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Game Area */}
      <div className="container mx-auto px-4 py-8">
        {!gameState.gameStarted ? (
          // Lobby View
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Waiting Room</h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  Players in Room ({currentPlayers}/{maxPlayers})
                </h3>
                <div className="grid gap-3">
                  {gameState.room?.player.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="font-medium">{player.name}</span>
                        {player.id === socket.id && (
                          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      {index === 0 && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isRoomCreator ? (
                <div className="space-y-4">
                  <button
                    onClick={onStartGame}
                    disabled={!allPlayersJoined}
                    className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${allPlayersJoined
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-105'
                      : 'bg-gray-400 cursor-not-allowed'
                      }`}
                  >
                    {allPlayersJoined ? '🎮 Start Game' : `Waiting for ${maxPlayers - currentPlayers} more player(s)...`}
                  </button>

                  {!allPlayersJoined && (
                    <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                      Share the Room ID:
                      <strong className="font-mono">{gameState.room?.roomId}</strong>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(gameState.room?.roomId);
                          // You could add a toast notification here if you want
                        }}
                        className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy Room ID"
                      >
                        📋
                      </button>
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-gray-600">
                  <LoadingSpinner size="small" text="Waiting for host to start the game..." />
                  <p className="text-sm mt-2 flex items-center justify-center gap-2">
                    Room ID:
                    <strong className="font-mono">{gameState.room?.roomId}</strong>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(gameState.room?.roomId);
                        // You could add a toast notification here if you want
                      }}
                      className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy Room ID"
                    >
                      📋
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Game View
          <div className="max-w-6xl mx-auto">
            {/* Table Area */}
            <div className="bg-emerald-600 rounded-2xl p-8 mb-8 relative min-h-64">
              <div className="absolute inset-0 rounded-2xl border-4 border-emerald-700"></div>

              <div className="text-center mb-4">
                <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-lg">
                  <div className={`w-2 h-2 rounded-full mr-2 ${gameState.isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {getTurnDisplayText()}
                  </span>
                </div>
              </div>

              {/* Table Cards */}
              <div className="flex justify-center items-center flex-wrap gap-4 min-h-32">
                {tableCards.length === 0 ? (
                  <div className="text-white text-center py-8">
                    <p className="text-lg opacity-75">Play cards to see them here</p>
                  </div>
                ) : (
                  tableCards.map((tableCard, index) => (
                    <div key={index} className="text-center">
                      <GameTableCard
                        cardId={tableCard.cardId}
                        className="transform hover:scale-105 transition-transform"
                      />
                      <p className="text-white text-xs mt-2 bg-black bg-opacity-30 px-2 py-1 rounded">
                        {tableCard.playerName}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Current Player's Hand Only */}
            {currentPlayer && (
              <>
                <PlayerHand
                  key={currentPlayer.id}
                  leadCard={tableCards[0]?.cardId}
                  player={currentPlayer}
                  isCurrentPlayer={true}
                  onPlayCard={onPlayCard}
                  isMyTurn={gameState.isMyTurn}
                />

                <div className="rounded-lg shadow-lg mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-max">
                    {/* Player Information */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="text-sm font-semibold text-gray-800 mb-4">Players</h3>

                      {/* The grid is maintained, but the inner content is changed to vertical flex */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2">
                        {players.map((player) => {

                          const randomColorClass = getRandomLineColor();

                          return (
                            <div
                              key={player.id}
                              // Use flex-col and text-center for the new vertical layout
                              className={`flex flex-col items-center justify-center p-3 rounded-lg border relative
              ${player.id === socket.id ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:shadow-sm'}`}
                            >
                              {/* 1. Avatar (Rounded) - Placed at the top */}
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-base font-bold mb-2 
                ${player.id === socket.id ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-gray-500'}`}
                              >
                                {player.name ? player.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'P'}
                              </div>

                              {/* 2. Name */}
                              <div className="text-sm font-semibold truncate max-w-full px-1">
                                {player.name}
                                {player.id === socket.id && <span className="text-blue-600"> (You)</span>}
                              </div>

                              {/* 3. Card Count */}
                              <div className="text-xs text-gray-500 mt-0.5">
                                {player.cardCount} cards
                              </div>

                              {/* Turn Indicator (Optional placement, but good for visibility) */}
                              {player.isMyTurn && (
                                <div className="absolute top-1 right-1 text-base text-green-600 font-extrabold" title="It's their turn">
                                  ★
                                </div>
                              )}

                              {/* 4. The Random Colored Line - Placed at the very bottom */}
                              <div className={`w-full h-1 mt-3 rounded-b-lg ${randomColorClass}`}></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Voice Chat Panel */}
                    <div className={`bg-white rounded-lg shadow-lg p-6 transition-all ${isVoiceChatActive ? '' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white ${isVoiceChatActive ? 'bg-red-500' : 'bg-gray-400'}`}>
                            🎤
                          </div>
                          <div>
                            <div className="text-sm font-medium">Voice Chat</div>
                            <div className="text-xs text-gray-500">{isVoiceChatActive ? 'Live' : 'Not connected'}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setIsVoiceMinimized(!isVoiceMinimized)}
                            className="text-gray-600 hover:text-gray-800 px-2 py-1 rounded"
                            title="Minimize"
                          >
                            {isVoiceMinimized ? '▢' : '▁'}
                          </button>
                          <button
                            onClick={() => {
                              if (!isVoiceChatActive) {
                                setIsVoiceChatActive(true)
                              } else {
                                setIsVoiceChatActive(false)
                                if (voiceChatIframeRef.current) voiceChatIframeRef.current = null
                              }
                            }}
                            className={`px-3 py-1 text-sm rounded ${isVoiceChatActive ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
                          >
                            {isVoiceChatActive ? 'Disconnect' : 'Join'}
                          </button>
                        </div>
                      </div>

                      <div className={`${isVoiceMinimized ? 'h-0 overflow-hidden' : 'h-64'} transition-all`}>
                        {isVoiceChatActive && (
                          <iframe
                            ref={voiceChatIframeRef}
                            src={`https://vdo.ninja/beta/?voice&room=${gameState.room?.roomId}&miconly&webcam&novideo&cleanoutput`}
                            title="Voice Chat"
                            className="w-full h-full"
                            allow="microphone"
                            style={{ border: 'none' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default GameTable