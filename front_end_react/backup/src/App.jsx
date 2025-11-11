import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import RoomCreation from './components/RoomCreation'
import RoomJoin from './components/RoomJoin'
import GameTable from './components/GameTable'
import MessageSystem from './components/MessageSystem'
import LoadingSpinner from './components/LoadingSpinner'
import { useSocket } from './hooks/useSocket'
import { useGameState } from './hooks/useGameState'

const APP_STATES = {
  ROOM_CREATION: 'room_creation',
  ROOM_JOIN: 'room_join',
  GAME_TABLE: 'game_table',
  LOADING: 'loading'
}

function App() {
  const [appState, setAppState] = useState(APP_STATES.ROOM_CREATION)
  const [messages, setMessages] = useState([])
  const [isConnected, setIsConnected] = useState(false)

  const { socket, connectSocket, disconnectSocket } = useSocket()
  const { gameState, updateGameState, clearGameState } = useGameState()

  useEffect(() => {
    connectSocket('https://apidonkey.contactbasil.com')
    
    return () => {
      disconnectSocket()
    }
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleConnection = (data) => {
      setIsConnected(true)
      addMessage('Connected to server', 'success')
    }

    const handleError = (error) => {
      addMessage(error.message || 'An error occurred', 'error')
    }

    const handleGameCreated = (roomData) => {
      try {
        const room = JSON.parse(roomData)
        console.log('🎮 Room created:', room)
        const currentPlayer = room.player.find(p => p.id === socket.id)
        updateGameState({ 
          room, 
          currentPlayer: currentPlayer,
          isHost: true,
          isMyTurn: currentPlayer?.isMyTurn || false
        })
        setAppState(APP_STATES.GAME_TABLE)
        addMessage(`Room "${room.roomName}" created successfully!`, 'success')
      } catch (error) {
        console.error('Error parsing room data:', error)
        addMessage('Failed to create room', 'error')
      }
    }

    const handlePlayerJoin = (playerData) => {
      try {
        const newPlayer = JSON.parse(playerData)
        console.log('👤 Player joined:', newPlayer)
        addMessage(`${newPlayer.name} joined the room`, 'info')
        
        // Update the room state to reflect the new player
        if (gameState.room) {
          const updatedRoom = {
            ...gameState.room,
            player: [...gameState.room.player, newPlayer]
          }
          updateGameState({ room: updatedRoom })
        }
      } catch (error) {
        console.error('Error parsing player data:', error)
      }
    }

    const handleRoomUpdated = (roomData) => {
      try {
        const updatedRoom = JSON.parse(roomData)
        console.log('🔄 Room updated:', updatedRoom)
        
        // Update isMyTurn based on current player in the room
        const currentPlayerInRoom = updatedRoom.player.find(p => p.id === socket.id)
        const isMyTurn = currentPlayerInRoom ? currentPlayerInRoom.isMyTurn : false
        
        updateGameState({ 
          room: updatedRoom,
          isMyTurn: isMyTurn
        })
      } catch (error) {
        console.error('Error parsing updated room data:', error)
      }
    }

    const handleGameStarted = (playerData) => {
      try {
        const player = JSON.parse(playerData)
        console.log('🎲 Game started for player:', player)
        console.log('🃏 Player cards:', player.card)
        
        // Update game state with player's cards and game started flag
        updateGameState({ 
          gameStarted: true,
          currentPlayer: player,
          isMyTurn: player.isMyTurn,
          // Update the current player's cards in the room state
          room: {
            ...gameState.room,
            player: gameState.room?.player?.map(p => 
              p.id === player.id ? { ...p, card: player.card } : p
            ) || []
          }
        })
        addMessage('Game started! Cards have been dealt.', 'success')
      } catch (error) {
        console.error('Error parsing game start data:', error)
        addMessage('Error starting game', 'error')
      }
    }

    const handlePlayersUpdated = (data) => {
      try {
        console.log('👥 Players updated:', data)
        if (data.players && gameState.room) {
          // Update all players' card information and check if it's my turn
          const updatedPlayers = gameState.room.player.map(roomPlayer => {
            const updatedPlayer = data.players.find(p => p.id === roomPlayer.id)
            return updatedPlayer ? { ...roomPlayer, card: updatedPlayer.cards } : roomPlayer
          })
          
          // Check if it's current player's turn
          const currentPlayerData = data.players.find(p => p.id === socket.id)
          const isMyTurn = currentPlayerData ? currentPlayerData.isMyTurn : false
          
          updateGameState({
            room: {
              ...gameState.room,
              player: updatedPlayers
            },
            isMyTurn: isMyTurn
          })
        }
      } catch (error) {
        console.error('Error updating players:', error)
      }
    }

    const handleTurnUpdate = (isMyTurn) => {
      console.log('🔄 TURN_UPDATE received:', isMyTurn)
      updateGameState({ isMyTurn })
      if (isMyTurn) {
        addMessage("It's your turn!", 'info')
      }
    }

    const handleTurnChanged = (data) => {
      console.log('🔄 turn_changed received:', data)
      addMessage(`${data.playerName}'s turn`, 'info')
      
      // Update isMyTurn based on whether it's the current player
      const isMyTurn = data.playerId === socket.id
      updateGameState({ isMyTurn })
    }

    const handleRoomReady = (data) => {
      addMessage('Room is full and ready to start!', 'success')
    }

    const handleAddCardToTable = (data) => {
      addMessage(`${data.playerName} played a card`, 'info')
    }

    const handleClearTable = (data) => {
      if (data.roundWinner) {
        addMessage(`${data.roundWinner} won the round!`, 'success')
      } else if (data.penaltyPlayer) {
        addMessage(`Penalty! ${data.penaltyPlayer} collected cards`, 'warning')
      }
    }

    const handlePlayerWon = (data) => {
      data.winners.forEach(winner => {
        addMessage(`${winner.name} won the game! 🎉`, 'success')
      })
    }

    const handleGameOver = (data) => {
      addMessage(data.message, 'error')
    }

    socket.on('on_connection', handleConnection)
    socket.on('error', handleError)
    socket.on('AFTER_GAME_CREATED', handleGameCreated)
    socket.on('NOTIFY_PLAYER_JOIN', handlePlayerJoin)
    socket.on('room_updated', handleRoomUpdated)
    socket.on('STARTED_GAME', handleGameStarted)
    socket.on('players_updated', handlePlayersUpdated)
    socket.on('TURN_UPDATE', handleTurnUpdate)
    socket.on('turn_changed', handleTurnChanged)
    socket.on('room_ready', handleRoomReady)
    socket.on('ADD_CARD_TABLE', handleAddCardToTable)
    socket.on('CLEAR_TABLE', handleClearTable)
    socket.on('player_won', handlePlayerWon)
    socket.on('game_over', handleGameOver)

    return () => {
      socket.off('on_connection', handleConnection)
      socket.off('error', handleError)
      socket.off('AFTER_GAME_CREATED', handleGameCreated)
      socket.off('NOTIFY_PLAYER_JOIN', handlePlayerJoin)
      socket.off('room_updated', handleRoomUpdated)
      socket.off('STARTED_GAME', handleGameStarted)
      socket.off('players_updated', handlePlayersUpdated)
      socket.off('TURN_UPDATE', handleTurnUpdate)
      socket.off('turn_changed', handleTurnChanged)
      socket.off('room_ready', handleRoomReady)
      socket.off('ADD_CARD_TABLE', handleAddCardToTable)
      socket.off('CLEAR_TABLE', handleClearTable)
      socket.off('player_won', handlePlayerWon)
      socket.off('game_over', handleGameOver)
    }
  }, [socket, gameState.room])

  const addMessage = (text, type = 'info') => {
    const message = {
      id: Date.now(),
      text,
      type,
      timestamp: new Date().toISOString()
    }
    // Keep only the last 2 messages
    setMessages(prev => [message, ...prev.slice(0, 1)])
  }

  const handleCreateRoom = (roomData) => {
    if (!socket || !isConnected) {
      addMessage('Not connected to server', 'error')
      return
    }

    setAppState(APP_STATES.LOADING)
    console.log('📤 Creating room with data:', roomData)
    socket.emit('CREATE_GAME', JSON.stringify(roomData))
  }

  const handleJoinRoom = (joinData) => {
    if (!socket || !isConnected) {
      addMessage('Not connected to server', 'error')
      return
    }

    setAppState(APP_STATES.LOADING)
    console.log('📤 Joining room with data:', joinData)
    socket.emit('PLAYER_JOIN', JSON.stringify(joinData))
  }

  const handleStartGame = () => {
    if (!socket || !gameState.room) {
      addMessage('Not ready to start game', 'error')
      return
    }

    console.log('🚀 Starting game for room:', gameState.room.roomId)
    socket.emit('START_GAME', JSON.stringify({
      roomId: gameState.room.roomId
    }))
  }

  const handlePlayCard = (cardId) => {
    if (!socket || !gameState.room || !gameState.isMyTurn) {
      addMessage("It's not your turn", 'warning')
      return
    }

    console.log('🎴 Playing card:', cardId)
    socket.emit('TABLE_ROUND', JSON.stringify({
      roomId: gameState.room.roomId,
      id: socket.id,
      card: [cardId]
    }))
  }

  const handleBackToLobby = () => {
    clearGameState()
    setAppState(APP_STATES.ROOM_CREATION)
    setMessages([])
  }

  const renderCurrentState = () => {
    switch (appState) {
      case APP_STATES.ROOM_CREATION:
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  🐴 Donkey Card Game
                </h1>
                <p className="text-gray-600">Create or join a game room</p>
              </div>
              
              <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
                <RoomCreation 
                  onCreateRoom={handleCreateRoom}
                  isConnected={isConnected}
                />
                <RoomJoin 
                  onJoinRoom={handleJoinRoom}
                  isConnected={isConnected}
                />
              </div>
            </div>
          </div>
        )

      case APP_STATES.GAME_TABLE:
        return (
          <GameTable
            gameState={gameState}
            socket={socket}
            onPlayCard={handlePlayCard}
            onStartGame={handleStartGame}
            onBackToLobby={handleBackToLobby}
          />
        )

      case APP_STATES.LOADING:
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <LoadingSpinner size="large" text="Connecting..." />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="App">
      {renderCurrentState()}
      <MessageSystem messages={messages} />
    </div>
  )
}

export default App