// index.js
// Purpose: Main server bootstrap with Socket.IO v4 and modern Node.js

const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const Player = require('./player');
const Room = require('./room');
const Deck = require('./deck');
const Round = require('./round');
const constants = require('./constants');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

// Socket.IO v4 setup with CORS
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  }
});

// Middleware
app.use(compression());
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173","https://donkey.contactbasil.com"],
  credentials: true
}));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '100mb'
}));
app.use(bodyParser.json({ limit: '100mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    rooms: roomList.size,
    uptime: process.uptime()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Room management endpoints
app.get('/rooms', (req, res) => {
  const rooms = Array.from(roomList.entries()).map(([roomId, room]) => ({
    roomId: room.roomId,
    roomName: room.roomName,
    players: room.player.length,
    maxPlayers: room.roomTotalCount,
    playersList: room.player.map(p => ({ name: p.name, id: p.id }))
  }));
  res.json({ rooms, total: rooms.length });
});

// Get specific room info
app.get('/rooms/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  console.log('🔍 Looking for room via API:', roomId);
  console.log('📊 Available rooms:', Array.from(roomList.keys()));
  
  // Try to find room by string key
  const room = roomList.get(roomId);
  
  if (!room) {
    return res.status(404).json({ 
      error: 'Room not found',
      requestedRoomId: roomId,
      availableRooms: Array.from(roomList.keys())
    });
  }
  
  res.json({
    roomId: room.roomId,
    roomName: room.roomName,
    players: room.player.length,
    maxPlayers: room.roomTotalCount,
    playersList: room.player.map(p => ({ name: p.name, id: p.id, position: p.position }))
  });
});

// Store rooms - using string keys consistently
const roomList = new Map();

// Game logic helper functions
function checkForWinner(currentRoom) {
    const playersWithCards = currentRoom.player.filter(p => p.card.length > 0);
    const playersWithoutCards = currentRoom.player.filter(p => p.card.length === 0);
    
    console.log(`🎯 Checking winner: ${playersWithCards.length} players with cards, ${playersWithoutCards.length} players without cards`);
    
    // If only one player has cards left, they are the donkey (loser)
    if (playersWithCards.length === 1) {
        const donkey = playersWithCards[0];
        const winners = playersWithoutCards;
        
        // This is the true GAME OVER state
        return {
            gameOver: true,
            donkey: donkey,
            winners: winners,
            message: `${donkey.name} is the DONKEY! 🐴`
        };
    }
    
    // Check for players who have *just* run out of cards but haven't been marked as won yet.
    // NOTE: Their 'hasWon' state will be set AFTER the round resolves in TABLE_ROUND logic.
    const newPlayersWithZeroCards = currentRoom.player.filter(p => p.card.length === 0 && !p.hasWon);
    
    if (newPlayersWithZeroCards.length > 0) {
        // Return this for notification, but DO NOT set hasWon here.
        return {
            gameOver: false,
            newPlayersWithZeroCards: newPlayersWithZeroCards, // Renamed from newWinners
            message: `${newPlayersWithZeroCards.map(w => w.name).join(', ')} has run out of cards! 🎉`
        };
    }
    
    return { gameOver: false };
}

// Enhanced next player logic that skips winners
function getNextActivePlayer(currentRoom, currentPlayer) {
   const playerArray = currentRoom.player;
    let nextPosition = (currentPlayer.position + 1) % currentRoom.getRoomCount();
    let nextPlayer = playerArray.find(p => p.position === nextPosition);
    let attempts = 0;
    
    console.log(`🔍 Finding next active player from: ${currentPlayer.name}`);
    
    // Skip players who have won (no cards left) or are inactive
    while (nextPlayer && 
           (nextPlayer.card.length === 0 || nextPlayer.hasWon) && 
           attempts < currentRoom.getRoomCount()) {
        console.log(`⏭️ Skipping ${nextPlayer.name} (cards: ${nextPlayer.card.length}, won: ${nextPlayer.hasWon})`);
        nextPosition = (nextPosition + 1) % currentRoom.getRoomCount();
        nextPlayer = playerArray.find(p => p.position === nextPosition);
        attempts++;
    }
    
    if (nextPlayer && nextPlayer.card.length > 0 && !nextPlayer.hasWon) {
        console.log(`➡️ Next active player: ${nextPlayer.name}`);
        return nextPlayer;
    }
    
    console.log('❌ No active players found for next turn');
    return null;
}

// Card sorting function - sort by suit and then by rank
function sortCardsBySuit(cards) {
    if (!cards || !Array.isArray(cards)) return [];
    
    return cards.sort((a, b) => {
        // First sort by suit: Diamonds (0-12), Clubs (13-25), Hearts (26-38), Spades (39-51)
        const suitA = Math.floor(a / 13);
        const suitB = Math.floor(b / 13);
        
        if (suitA !== suitB) {
            return suitA - suitB;
        }
        
        // Then sort by rank within the same suit (2-Ace)
        return a - b;
    });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🟢 ${socket.id} client connected`);

  // Notify the connected socket that the connection succeeded
  socket.emit(constants.SOCKET_EVENTS.ON_CONNECTION, {
    action: 'on_connection',
    status: true,
    data: 'connected',
    socketId: socket.id
  });

  // CREATE_GAME: client requests creating a new room and becomes the first player
  socket.on(constants.SOCKET_EVENTS.CREATE_GAME, (data) => {
    try {
      console.log('🎮 CREATE_GAME received from:', socket.id);
      
      const createGameRoomData = JSON.parse(data);
      const playerObjectFromClient = createGameRoomData.playerObj;

      constants.GETNEWPIN(null, (unique_id) => {
        // Convert room ID to string to avoid type issues
        const roomIdString = unique_id.toString();
        
        const player_position = 0;
        const player = new Player(
          player_position, 
          socket.id, 
          roomIdString,
          playerObjectFromClient.name, 
          playerObjectFromClient.type, 
          playerObjectFromClient.isMyTurn
        );

        const room = new Room(
          roomIdString,
          createGameRoomData.roomName, 
          createGameRoomData.roomTotalCount, 
          socket.id
        );
        room.addPlayer(player);

        roomList.set(roomIdString, room);
        socket.join(roomIdString);

        console.log(`✅ Room created: ${room.roomId} by ${player.name}`);
        console.log(`👥 Players in room: ${room.player.length}/${room.roomTotalCount}`);
        console.log(`🔑 Room stored with key: "${roomIdString}" (type: ${typeof roomIdString})`);
        console.log(`📊 Total rooms now: ${roomList.size}`);

        socket.emit(constants.SOCKET_EVENTS.AFTER_GAME_CREATED, JSON.stringify(room));
      });

    } catch (error) {
      console.error('❌ Error in CREATE_GAME:', error);
      socket.emit('error', { message: 'Failed to create game', error: error.message });
    }
  });

  // PLAYER_JOIN: client requests joining an existing room
  socket.on(constants.SOCKET_EVENTS.PLAYER_JOIN, (data) => {
    try {
      console.log('👤 PLAYER_JOIN received from:', socket.id);
      console.log('📦 Join data:', data);
      
      const joinPlayerData = JSON.parse(data);
      const joinPlayerInfo = joinPlayerData.playerObj;
      
      // Ensure roomId is treated as string
      const roomId = String(joinPlayerData.roomId);
      
      console.log('🔍 Looking for room:', roomId);
      console.log('📊 Available rooms:', Array.from(roomList.keys()));
      console.log('🔑 Room key types:', Array.from(roomList.keys()).map(key => `${key} (${typeof key})`));

      const room = roomList.get(roomId);

      if (!room) {
        console.log('❌ Room not found:', roomId);
        console.log('💡 Trying to find room with different type...');
        
        // Try alternative lookups
        let foundRoom = null;
        for (const [key, value] of roomList.entries()) {
          console.log(`   Checking key: "${key}" (${typeof key}) vs "${roomId}" (${typeof roomId})`);
          if (key == roomId) { // Loose equality to catch number/string mismatches
            foundRoom = value;
            console.log('   ✅ Found room with loose equality');
            break;
          }
        }
        
        if (foundRoom) {
          console.log('✅ Found room using alternative search');
          // Use the found room but ensure we use the correct key
          roomList.delete(foundRoom.roomId);
          roomList.set(roomId, foundRoom);
          foundRoom.roomId = roomId;
        } else {
          socket.emit('error', { 
            message: 'Room not found. Please check the Room ID.',
            roomId: roomId,
            availableRooms: Array.from(roomList.keys()),
            roomKeyTypes: Array.from(roomList.keys()).map(key => typeof key)
          });
          return;
        }
      }

      console.log('✅ Room found:', room.roomId, 'Players:', room.player.length, '/', room.roomTotalCount);

      if (room.player.length >= room.roomTotalCount) {
        console.log('❌ Room full:', room.roomId);
        socket.emit('error', { 
          message: 'Room is full',
          currentPlayers: room.player.length,
          maxPlayers: room.roomTotalCount
        });
        return;
      }

      // Check if player already exists in room
      const existingPlayer = room.player.find(p => p.id === socket.id);
      if (existingPlayer) {
        console.log('⚠️ Player already in room:', socket.id);
        socket.emit('error', { message: 'You are already in this room' });
        return;
      }

      socket.join(room.roomId);

      const player_position = room.player.length;
      const player = new Player(
        player_position, 
        socket.id, 
        room.roomId,
        joinPlayerInfo.name, 
        joinPlayerInfo.type, 
        joinPlayerInfo.isMyTurn
      );
      
      room.player.push(player);

      console.log(`✅ ${player.name} joined room: ${room.roomId}`);
      console.log(`👥 Players in room now: ${room.player.length}/${room.roomTotalCount}`);

      // Notify all players in the room about the new player
      io.to(room.roomId).emit(constants.SOCKET_EVENTS.NOTIFY_PLAYER_JOIN, JSON.stringify(player));

      // Send updated room state to ALL players in the room (including host)
      io.to(room.roomId).emit('room_updated', JSON.stringify(room));

      // Also send the updated room state to the joining player
      socket.emit(constants.SOCKET_EVENTS.AFTER_GAME_CREATED, JSON.stringify(room));

      // Check if room is ready to start
      if (room.player.length === room.roomTotalCount) {
        console.log(`🎯 Room ${room.roomId} is ready to start!`);
        io.to(room.roomId).emit('room_ready', { 
          message: 'Room is full and ready to start',
          roomId: room.roomId
        });
      }

    } catch (error) {
      console.error('❌ Error in PLAYER_JOIN:', error);
      socket.emit('error', { 
        message: 'Failed to join room', 
        error: error.message 
      });
    }
  });

  // START_GAME: room creator starts the game
  socket.on(constants.SOCKET_EVENTS.START_GAME, (data) => {
    try {
      console.log('🚀 START_GAME received');
      
      const gameData = JSON.parse(data);
      const roomId = String(gameData.roomId);
      const currentRoom = roomList.get(roomId);

      if (!currentRoom) {
        console.log('❌ Room not found for START_GAME:', roomId);
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Verify requester is room creator
      if (currentRoom.socketId !== socket.id) {
        console.log('❌ Unauthorized START_GAME attempt by:', socket.id);
        socket.emit('error', { message: 'Only room creator can start the game' });
        return;
      }

      const newDeck = Deck.getDeck();
      const shuffledDeck = Deck.shuffle(newDeck);
      const totalPlayersInRoom = currentRoom.player.length;

      // Update room count to actual player count
      currentRoom.roomTotalCount = totalPlayersInRoom;

      console.log(`🃏 Dealing ${shuffledDeck.length} cards to ${totalPlayersInRoom} players`);

      // Reset all turns first
      currentRoom.player.forEach(player => {
        player.setTurn(false);
      });

      let firstPlayer = null;

      // Deal cards to players and find who has Ace of Spades
      shuffledDeck.forEach((cardId, index) => {
        const playerIndex = index % totalPlayersInRoom;
        if (currentRoom.player[playerIndex]) {
          currentRoom.player[playerIndex].addCard(cardId);
          // Check if this is the Spades Ace (card 51) to set first turn
          if (cardId === 51) {
            firstPlayer = currentRoom.player[playerIndex];
            console.log(`⭐ Ace of Spades dealt to: ${firstPlayer.name}`);
          }
        }
      });

      // Sort all players' cards
      currentRoom.player.forEach(player => {
        player.card = sortCardsBySuit(player.card);
      });

      // Set turn for the player with Ace of Spades
      if (firstPlayer) {
        firstPlayer.setTurn(true);
        console.log(`🎯 First turn set to: ${firstPlayer.name}`);
      } else {
        // Fallback: set first player as first turn
        currentRoom.player[0].setTurn(true);
        console.log(`🎯 First turn set to first player: ${currentRoom.player[0].name}`);
      }

      // Send game start to all players with their initial state
      currentRoom.player.forEach((player) => {
        player.setTotalPlayerRoom(totalPlayersInRoom);
        
        // Send player-specific data
        const playerData = {
          ...player,
          // Include information about whose turn it is
          currentTurnPlayer: firstPlayer ? firstPlayer.id : currentRoom.player[0].id,
          currentTurnPlayerName: firstPlayer ? firstPlayer.name : currentRoom.player[0].name
        };
        
        io.to(player.id).emit(constants.SOCKET_EVENTS.STARTED_GAME, JSON.stringify(playerData));
        
        // Also send a separate turn notification
        if (player.isMyTurn) {
          io.to(player.id).emit(constants.SOCKET_EVENTS.TURN_UPDATE, true);
        }
      });

      // Broadcast to all players who has the first turn
      io.to(currentRoom.roomId).emit('turn_changed', {
        playerId: firstPlayer ? firstPlayer.id : currentRoom.player[0].id,
        playerName: firstPlayer ? firstPlayer.name : currentRoom.player[0].name,
        message: `${firstPlayer ? firstPlayer.name : currentRoom.player[0].name} has the first turn!`
      });

      console.log(`🎲 Game started for room: ${currentRoom.roomId}`);
      console.log(`👥 Player turns:`, currentRoom.player.map(p => `${p.name}: ${p.isMyTurn}`));

    } catch (error) {
      console.error('❌ Error in START_GAME:', error);
      socket.emit('error', { message: 'Failed to start game', error: error.message });
    }
  });


  socket.on(constants.SOCKET_EVENTS.RESTART_GAME, (data) => {
    try {
        console.log('🔄 RESTART_GAME received');
        
        const gameData = JSON.parse(data);
        const roomId = String(gameData.roomId);
        const currentRoom = roomList.get(roomId);

        if (!currentRoom) {
            console.log('❌ Room not found for RESTART_GAME:', roomId);
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Verify requester is room creator
        if (currentRoom.socketId !== socket.id) {
            console.log('❌ Unauthorized RESTART_GAME attempt by:', socket.id);
            socket.emit('error', { message: 'Only room creator can restart the game' });
            return;
        }

        console.log(`🔄 Restarting game for room: ${currentRoom.roomId}`);



        // 1. Reset all players' cards and states
        currentRoom.player.forEach(player => {
            player.card = [];           // Clear cards
            player.setTurn(false);      // Reset turn
            player.hasWon = false;      // Reset won status
            console.log(`🔄 Reset player: ${player.name}`);
        });

        // Broadcast table clear to all players in that room
        io.to(roomId).emit(constants.SOCKET_EVENTS.CLEAR_TABLE, {
                        message: "ROUND COMPLETED",
                        roundWinner: "",
                        largestCard: -1,
                        newWinners: [],
                        roomId: roomId
                    });

        // 2. Clear any existing rounds
        currentRoom.clearRounds();

        // 3. Create and shuffle new deck
        const newDeck = Deck.getDeck();
        const shuffledDeck = Deck.shuffle(newDeck);
        const totalPlayersInRoom = currentRoom.player.length;

        console.log(`🃏 Dealing ${shuffledDeck.length} cards to ${totalPlayersInRoom} players`);

        let firstPlayer = null;

        // 4. Deal cards and find Ace of Spades
        shuffledDeck.forEach((cardId, index) => {
            const playerIndex = index % totalPlayersInRoom;
            if (currentRoom.player[playerIndex]) {
                currentRoom.player[playerIndex].addCard(cardId);
                if (cardId === 51) {
                    firstPlayer = currentRoom.player[playerIndex];
                    console.log(`⭐ Ace of Spades dealt to: ${firstPlayer.name}`);
                }
            }
        });

        // 5. Sort all players' cards
        currentRoom.player.forEach(player => {
            player.card = sortCardsBySuit(player.card);
        });

        // 6. Set turn for the player with Ace of Spades
        if (firstPlayer) {
            firstPlayer.setTurn(true);
            console.log(`🎯 First turn set to: ${firstPlayer.name}`);
        } else {
            currentRoom.player[0].setTurn(true);
            console.log(`🎯 First turn set to first player: ${currentRoom.player[0].name}`);
        }

        // 7. Notify all players - game has restarted
        io.to(currentRoom.roomId).emit('game_restarted', {
            message: 'Game has been restarted!',
            roomId: currentRoom.roomId,
            playerCount: totalPlayersInRoom
        });

        // 8. Send game start to all players with fresh state
        currentRoom.player.forEach((player) => {
            player.setTotalPlayerRoom(totalPlayersInRoom);
            
            const playerData = {
                ...player,
                currentTurnPlayer: firstPlayer ? firstPlayer.id : currentRoom.player[0].id,
                currentTurnPlayerName: firstPlayer ? firstPlayer.name : currentRoom.player[0].name
            };
            
            io.to(player.id).emit(constants.SOCKET_EVENTS.STARTED_GAME, JSON.stringify(playerData));
            
            if (player.isMyTurn) {
                io.to(player.id).emit(constants.SOCKET_EVENTS.TURN_UPDATE, true);
            }
        });

        // 9. Broadcast turn information
        io.to(currentRoom.roomId).emit('turn_changed', {
            playerId: firstPlayer ? firstPlayer.id : currentRoom.player[0].id,
            playerName: firstPlayer ? firstPlayer.name : currentRoom.player[0].name,
            message: `${firstPlayer ? firstPlayer.name : currentRoom.player[0].name} has the first turn!`
        });

        console.log(`✅ Game restarted successfully for room: ${currentRoom.roomId}`);

    } catch (error) {
        console.error('❌ Error in RESTART_GAME:', error);
        socket.emit('error', { message: 'Failed to restart game', error: error.message });
    }
});


  // TABLE_ROUND: player plays a card - ENHANCED WITH PROPER WINNER HANDLING
socket.on(constants.SOCKET_EVENTS.TABLE_ROUND, (data) => {
    try {
        console.log('🎴 TABLE_ROUND received from:', socket.id);
        
        const playedData = JSON.parse(data);
        const roomId = String(playedData.roomId);
        const currentRoom = roomList.get(roomId);

        if (!currentRoom) {
            console.log('❌ Room not found for TABLE_ROUND:', roomId);
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        const playerArray = currentRoom.player;
        const currentPlayer = playerArray.find(element => element.id === playedData.id);

        if (!currentPlayer) {
            console.log('❌ Player not found in room:', playedData.id);
            socket.emit('error', { message: 'Player not found in room' });
            return;
        }

        // 1. Card Validation and Removal
        const cardIndex = currentPlayer.card.indexOf(playedData.card[0]);
        if (cardIndex === -1) {
            console.log('❌ Card not found in player hand or already played:', playedData.card[0]);
            socket.emit('error', { message: 'Card not found in your hand or already played' });
            return;
        }

        currentPlayer.card.splice(cardIndex, 1);
        console.log(`✅ Removed card from ${currentPlayer.name}'s hand. Cards left: ${currentPlayer.card.length}`);

        currentPlayer.setTurn(false);
        console.log(`❌ Disabled turn for ${currentPlayer.name}`);

        const playerReachedZero = currentPlayer.card.length === 0;
        if (playerReachedZero) {
            console.log(`🎯 ${currentPlayer.name} reached 0 cards! Awaiting round end to declare winner.`);
        }

        // 2. Add card to the Round Tracker
        const round = new Round();
        round.addPlayedCards(playedData.card[0], currentPlayer);
        currentRoom.addRound(round);
        
        // 3. Broadcast Card to Table
        const tableUpdateData = {
            roomId: currentRoom.roomId,
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            card: playedData.card[0],
            playerCardsLeft: currentPlayer.card.length,
            playerReachedZero: playerReachedZero,
            timestamp: new Date().toISOString()
        };
        io.to(currentRoom.roomId).emit(constants.SOCKET_EVENTS.ADD_CARD_TABLE, tableUpdateData);

        // Send player state update to ALL players (including winners)
        io.to(currentRoom.roomId).emit('players_updated', {
            players: currentRoom.player.map(p => ({
                id: p.id,
                name: p.name,
                cardCount: p.card.length,
                isMyTurn: p.isMyTurn,
                hasWon: p.hasWon || false,
                cards: sortCardsBySuit(p.card)
            }))
        });

        // 4. Check for GAME OVER (Donkey) condition
        const winCheck = checkForWinner(currentRoom);
        
        if (winCheck.gameOver) {
            console.log('🏁 GAME OVER!');
            io.to(currentRoom.roomId).emit('game_over', {
                donkey: winCheck.donkey,
                winners: winCheck.winners,
                message: winCheck.message,
                roomId: currentRoom.roomId
            });
             
            return;
        }

        // Get current rounds and lead suit
        const roundsInRoom = currentRoom.getRounds();
        let leadSuitCard = roundsInRoom.length > 0 ? roundsInRoom[0].getPlayedCard() : null;
        
        const isFirstCard = roundsInRoom.length === 1;
        const isSameSuitAsLead = leadSuitCard ? Deck.isSameClub(leadSuitCard, playedData.card[0]) : true;
        
        /* 5. PENALTY CONDITION - Different suit than lead suit */
        if (!isFirstCard && !isSameSuitAsLead) {
            console.log("🎯 PENALTY APPLIED - Different suit played!");

            // Calculate largest card in LEAD suit for penalty receiver
            let largestCardInLeadSuit = -1;
            let penaltyPlayer = null;
            
            const existingRounds = currentRoom.getRounds();
            
            // Determine who played the largest card of the LEAD suit
            existingRounds.forEach(round => {
                const roundCard = round.getPlayedCard();
                const roundPlayer = round.getPlayedPlayer();
                
                if (roundCard !== undefined && leadSuitCard && Deck.isSameClub(leadSuitCard, roundCard)) {
                    if (roundCard > largestCardInLeadSuit) {
                        largestCardInLeadSuit = roundCard;
                        penaltyPlayer = roundPlayer;
                    }
                }
            });
            
            // Fallback: The player who won the trick up to this point
            if (!penaltyPlayer) {
                penaltyPlayer = currentRoom.getGameRoundWinner();
                largestCardInLeadSuit = currentRoom.getLargestCardInRound();
                console.log('⚠️ Using fallback penalty player (trick winner so far)');
            }

            // Collect ALL cards from the table (including the just-played wrong suit card)
            const penaltyCards = [];
            existingRounds.forEach(round => {
                const roundCard = round.getPlayedCard();
                if (roundCard !== undefined) {
                    penaltyCards.push(roundCard);
                }
            });

            console.log(`🎯 Penalty receiver: ${penaltyPlayer?.name} | Cards to collect: ${penaltyCards.length}`);

            // Add penalty cards to penalty receiver's hand
            penaltyPlayer.card = [...penaltyPlayer.card, ...penaltyCards];
            penaltyPlayer.card = sortCardsBySuit(penaltyPlayer.card);
            
            // If penalty receiver had won (0 cards), they are no longer a winner (reset state)
            if (penaltyPlayer.hasWon) {
                penaltyPlayer.hasWon = false;
                console.log(`🔄 ${penaltyPlayer.name} is no longer a winner (received penalty cards)`);
            }
            
            // Notify all players about the penalty event and update hands
            io.to(currentRoom.roomId).emit('penalty_applied', {
                wrongPlayerName: currentPlayer.name,
                penaltyPlayerName: penaltyPlayer.name,
                cardsCount: penaltyCards.length,
                message: `${currentPlayer.name} played wrong suit! ${penaltyPlayer.name} collected ${penaltyCards.length} penalty cards`,
                roomId: currentRoom.roomId
            });

            currentRoom.clearRounds();

            // Update ALL players with COMPLETE card information before clearing table
            io.to(currentRoom.roomId).emit('players_updated', {
                players: currentRoom.player.map(p => ({
                    id: p.id,
                    name: p.name,
                    cardCount: p.card.length,
                    cards: sortCardsBySuit(p.card),
                    isMyTurn: p.isMyTurn,
                    hasWon: p.hasWon
                }))
            });

            setTimeout(() => {
                // BROADCAST TABLE CLEAR TO ALL PLAYERS
                io.to(currentRoom.roomId).emit(constants.SOCKET_EVENTS.CLEAR_TABLE, {
                    message: "ROUND CLEARED - PENALTY APPLIED",
                    penaltyPlayer: penaltyPlayer.name,
                    roomId: currentRoom.roomId
                });
                
                // Next turn goes to penalty receiver
                if (penaltyPlayer && penaltyPlayer.card.length > 0 && !penaltyPlayer.hasWon) {
                    currentRoom.player.forEach(p => p.setTurn(false));
                    penaltyPlayer.setTurn(true);
                    
                    io.to(penaltyPlayer.id).emit(constants.SOCKET_EVENTS.TURN_UPDATE, true);
                    io.to(currentRoom.roomId).emit('turn_changed', {
                        playerId: penaltyPlayer.id,
                        playerName: penaltyPlayer.name,
                        message: `${penaltyPlayer.name}'s turn (collected penalty cards)`
                    });
                    console.log(`✅ Turn set to: ${penaltyPlayer.name} (penalty receiver)`);
                } else {
                    // Find next active player if the penalty receiver is now the donkey or won
                    const nextPlayer = getNextActivePlayer(currentRoom, currentPlayer); 
                    // ... (logic to assign turn to nextPlayer)
                    console.log('❌ No active penalty player, finding next active player.');
                }
            }, 1500);

            return;
        }

        /* 6. NORMAL PLAY - Check for Round Completion */
        else {
            // Find count of *active* players (those who have NOT won: !p.hasWon)
            const activePlayers = currentRoom.player.filter(p => !p.hasWon);
            const activePlayersCount = activePlayers.length;
            const roundsPlayed = currentRoom.getRoundCount();     
            
            console.log(`🔄 Round Check: Active Players (${activePlayersCount}) vs. Cards Played (${roundsPlayed})`);

            // Round completes when the number of cards played equals the number of currently active players.
            if (activePlayersCount === roundsPlayed) {
                // ROUND COMPLETE LOGIC
                console.log('🎯 Round complete!');
                
                const largestCardPlayer = currentRoom.getGameRoundWinner();
                const largestCard = currentRoom.getLargestCardInRound();
                
                // **FIX 1: Officially declare and notify winners now**
                const playersWhoWonThisRound = currentRoom.player.filter(p => 
                    p.card.length === 0 && !p.hasWon
                );
                
                if (playersWhoWonThisRound.length > 0) {
                    playersWhoWonThisRound.forEach(player => {
                        player.hasWon = true; 
                        player.isMyTurn = false; 
                    });
                    
                    io.to(currentRoom.roomId).emit('player_won', {
                        winners: playersWhoWonThisRound.map(p => ({ id: p.id, name: p.name })),
                        message: `${playersWhoWonThisRound.map(w => w.name).join(', ')} won this round! 🎉`,
                        roomId: currentRoom.roomId
                    });
                }

                currentRoom.clearRounds();

                setTimeout(() => {
                    // Broadcast table clear and round winner
                    io.to(currentRoom.roomId).emit(constants.SOCKET_EVENTS.CLEAR_TABLE, {
                        message: "ROUND COMPLETED",
                        roundWinner: largestCardPlayer?.name,
                        largestCard: largestCard,
                        newWinners: playersWhoWonThisRound.map(p => p.name),
                        roomId: currentRoom.roomId
                    });
                    
                    // Assign next turn to trick winner (if they are still active)
                    if (largestCardPlayer && largestCardPlayer.card.length > 0 && !largestCardPlayer.hasWon) {
                        currentRoom.player.forEach(p => p.setTurn(false));
                        largestCardPlayer.setTurn(true);
                        
                        io.to(largestCardPlayer.id).emit(constants.SOCKET_EVENTS.TURN_UPDATE, true);
                        io.to(currentRoom.roomId).emit('turn_changed', {
                            playerId: largestCardPlayer.id,
                            playerName: largestCardPlayer.name,
                            message: `${largestCardPlayer.name}'s turn (- puts down largest card)`
                        });
                    } else {
                        // Trick winner has no cards or has won - find next active player in sequence
                        // Use currentPlayer (the last player to act) as the starting point for `getNextActivePlayer`
                        const nextPlayer = getNextActivePlayer(currentRoom, currentPlayer);
                        if (nextPlayer) {
                            currentRoom.player.forEach(p => p.setTurn(false));
                            nextPlayer.setTurn(true);
                            
                            io.to(nextPlayer.id).emit(constants.SOCKET_EVENTS.TURN_UPDATE, true);
                            io.to(currentRoom.roomId).emit('turn_changed', {
                                playerId: nextPlayer.id,
                                playerName: nextPlayer.name,
                                message: `${nextPlayer.name}'s turn`
                            });
                        }
                    }
                }, 1500);

            } else {
                // CONTINUE ROUND LOGIC
                console.log("➡️ Continuing round, waiting for more cards.");
                const nextPlayer = getNextActivePlayer(currentRoom, currentPlayer);
                
                if (nextPlayer) {
                    currentRoom.player.forEach(p => p.setTurn(false));
                    nextPlayer.setTurn(true);
                    
                    io.to(nextPlayer.id).emit(constants.SOCKET_EVENTS.TURN_UPDATE, true);
                    io.to(currentRoom.roomId).emit('turn_changed', {
                        playerId: nextPlayer.id,
                        playerName: nextPlayer.name,
                        message: `${nextPlayer.name}'s turn`
                    });
                } else {
                    // This should theoretically not happen unless activePlayersCount > 0 and roundsPlayed < activePlayersCount
                    console.log('❌ No active players found to continue round.');
                }
            }
        }

    } catch (error) {
        console.error('❌ Error in TABLE_ROUND:', error);
        socket.emit('error', { message: 'Failed to play card', error: error.message });
    }
});


socket.on(constants.SOCKET_EVENTS.LEAVE_ROOM, (data) => {
  try {
    console.log('👋 LEAVE_ROOM received from:', socket.id);
    
    const gameData = JSON.parse(data);
    const roomId = String(gameData.roomId);
    const room = roomList.get(roomId);

    if (!room) {
      console.log('❌ Room not found for LEAVE_ROOM:', roomId);
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Find and remove the player
    const playerIndex = room.player.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const playerName = room.player[playerIndex].name;
      const isHost = room.socketId === socket.id;
      room.player.splice(playerIndex, 1);
      console.log(`🗑️ Removed ${playerName} from room ${roomId}`);
      
      // Notify other players in the room
      io.to(roomId).emit('player_left', { 
        playerId: socket.id, 
        playerName: playerName,
        wasHost: isHost,
        remainingPlayers: room.player.length
      });

      // Send updated room state to remaining players
      io.to(roomId).emit('room_updated', JSON.stringify(room));

      // If the host left, assign a new host
      if (isHost && room.player.length > 0) {
        room.socketId = room.player[0].id;
        console.log(`👑 New host assigned: ${room.player[0].name}`);
        io.to(roomId).emit('host_changed', {
          newHostId: room.socketId,
          newHostName: room.player[0].name
        });
      }

      // Remove empty rooms
      if (room.player.length === 0) {
        roomList.delete(roomId);
        console.log(`🧹 Removed empty room: ${roomId}`);
      }

      console.log(`✅ LEAVE_ROOM completed for room: ${roomId}`);
    } else {
      console.log('❌ Player not found in room:', socket.id);
    }
  } catch (error) {
    console.error('❌ Error in LEAVE_ROOM:', error);
    socket.emit('error', { message: 'Failed to leave room', error: error.message });
  }
});


  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔴 ${socket.id} disconnected: ${reason}`);
    
    // Clean up: remove player from rooms
    for (const [roomId, room] of roomList.entries()) {
      const playerIndex = room.player.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const playerName = room.player[playerIndex].name;
        room.player.splice(playerIndex, 1);
        console.log(`🗑️ Removed ${playerName} from room ${roomId}`);
        
        // Notify other players
        io.to(roomId).emit('player_left', { 
          playerId: socket.id, 
          playerName: playerName,
          remainingPlayers: room.player.length
        });

        // Send updated room state
        io.to(roomId).emit('room_updated', JSON.stringify(room));

        // Remove empty rooms
        if (room.player.length === 0) {
          roomList.delete(roomId);
          console.log(`🧹 Removed empty room: ${roomId}`);
        }
        break;
      }
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Start server
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 Socket.IO v4 ready for connections`);
  console.log(`🌐 Health check: http://localhost:${port}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
  console.log(`🏠 Rooms endpoint: http://localhost:${port}/rooms`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});