
// Setup basic express server
var express = require('express');
var compression = require('compression')
var bodyParser = require('body-parser');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var Player = require('./player');
var Room = require("./room");
var Deck = require('./deck')
var Round = require('./round');
var constants = require('./constants');
var port = 3000;



server.listen(port, function () {
	console.log('Server listening at port %d', port);
});

// Routing
app.use(compression()); // compress all requests 
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
	extended: true,
	limit: '100mb'
}));
app.use(bodyParser.json({ limit: '100mb' }));


app.get('/test', function (req, res) {
	console.log("SOMETHING");
	res.sendFile(__dirname + '/index.html');
});


var roomList = new Map();


io.on('connection', function (socket) {
	var addedUser = false;

	console.log(socket.id + ' client device connected');

	io.to(socket).emit('on_connection', {
		action: 'on_connection',
		status: true,
		data: 'connected'
	});

	socket.on(constants.SOCKET_EVENTS.CREATE_GAME, function (data) {

		var createGameRoomData = JSON.parse(data)
		var playerObjectFromClient = createGameRoomData.playerObj;

		var roomPinAutoGen = constants.GETNEWPIN(null, function (unique_id) {

			var player_position = 0;
			var player = new Player(player_position, socket.id, unique_id, playerObjectFromClient.name, playerObjectFromClient.type, playerObjectFromClient.isMyTurn);

			var room = new Room(unique_id, createGameRoomData.roomName, createGameRoomData.roomTotalCount, socket.id);
			room.addPlayer(player);

			roomList.set(room.roomId, room);
			socket.join(roomList.get(room.roomId).roomId);

			console.log("DATA TO SEND AFTER", JSON.stringify(room));
			socket.emit(constants.SOCKET_EVENTS.AFTER_GAME_CREATED, JSON.stringify(room));

		});

	});

	socket.on(constants.SOCKET_EVENTS.PLAYER_JOIN, function (data) {


		var joinPlayerData = JSON.parse(data);
		var joinPlayerInfo = joinPlayerData.playerObj;

		if (roomList.get(joinPlayerData.roomId).roomTotalCount >= (roomList.get(joinPlayerData.roomId).player).length) {

			socket.join(roomList.get(joinPlayerData.roomId).roomId);

			var player_position = (roomList.get(joinPlayerData.roomId).player).length;
			var player = new Player(player_position, socket.id, joinPlayerData.roomId, joinPlayerInfo.name, joinPlayerInfo.type, joinPlayerInfo.isMyTurn);
			roomList.get(joinPlayerData.roomId).player.push(player);
			io.to(roomList.get(joinPlayerData.roomId).roomId).emit(constants.SOCKET_EVENTS.NOTIFY_PLAYER_JOIN, JSON.stringify(player));

			if (roomList.get(joinPlayerData.roomId).roomTotalCount === (roomList.get(joinPlayerData.roomId).player).length) {
				console.log("READY TO START THE GAME");
			}
		}
		else {
			console.log("ROOM FULL")
		}


	});



	socket.on(constants.SOCKET_EVENTS.START_GAME, function (data) {

		var data = JSON.parse(data);

		var NewDeck = Deck.getDeck();
		var shuffledDeck = Deck.shuffle(NewDeck);
		var currentRoom = roomList.get(data.roomId);
		var totalPlayersInRoom = currentRoom.roomTotalCount;

		for (i = 0; i < shuffledDeck.length; i++) {

			var mod = i % totalPlayersInRoom;
			switch (mod) {
				case 0:

					currentRoom.player[0].addCard(shuffledDeck[i]);
					if ((shuffledDeck[i] == 51)) {
						currentRoom.player[0].setTurn(true);
					}

					break;
				case 1:
					currentRoom.player[1].addCard(shuffledDeck[i]);
					if ((shuffledDeck[i] == 51)) {
						currentRoom.player[1].setTurn(true);
					}
					break;
				case 2:
					currentRoom.player[2].addCard(shuffledDeck[i]);
					if ((shuffledDeck[i] == 51)) {
						currentRoom.player[2].setTurn(true);
					}
					break;
				case 3:
					currentRoom.player[3].addCard(shuffledDeck[i]);
					if ((shuffledDeck[i] == 51)) {
						currentRoom.player[3].setTurn(true);
					}
					break;
				case 4:
					currentRoom.player[4].addCard(shuffledDeck[i]);
					if ((shuffledDeck[i] == 51)) {
						currentRoom.player[4].setTurn(true);
					}
					break;
				case 5:
					currentRoom.player[4].addCard(shuffledDeck[i]);
					if ((shuffledDeck[i] == 51)) {
						currentRoom.player[5].setTurn(true);
					}
					break;
			}
		}


		for (i = 0; i < totalPlayersInRoom; i++) {
			console.log(currentRoom.player[i].id)
			io.sockets.connected[currentRoom.player[i].id].emit(constants.SOCKET_EVENTS.STARTED_GAME, JSON.stringify(currentRoom.player[i]));
		}

	});


	socket.on(constants.SOCKET_EVENTS.TABLE_ROUND, function (data) {

		console.log(data);
		var playedData = JSON.parse(data);

		var currentRoom = roomList.get(playedData.roomId);
		var totalPlayersInRoom = currentRoom.roomTotalCount;

		//broadcast card initialy to table so that everyone can see the cards
		io.to(currentRoom.roomId).emit(constants.SOCKET_EVENTS.ADD_CARD_TABLE, data);

		var playerArray = currentRoom.player;

		var currentPlayer = playerArray.find(element => element.id == playedData.id);

		roundsInRoom = currentRoom.getRounds();

		if (roundsInRoom.length > 0) {
			socket.lastPlayedCard = roundsInRoom[roundsInRoom.length - 1].getLastPlayedCard();
			socket.largerOnePlayedBy = roundsInRoom[roundsInRoom.length - 1].getLargerOneplayedBy();

			var largest = roundsInRoom[0].playedCard || null;
			var number = null;
			for (var i = 0; i < roundsInRoom.length; i++) {
				number = roundsInRoom[i].playedCard;
				largest = Math.max(largest, number);
			}

			socket.largestValueInRound = largest;

		} else {
			socket.lastPlayedCard = undefined;
			socket.largestValueInRound = -1;
		}

		console.log(playedData.card[0] + "CARD : " + socket.lastPlayedCard + "SAME CLUB ->" + Deck.isSameClub(socket.lastPlayedCard, playedData.card[0]));

		/* SAME CLUBS CONDITION */
		if (Deck.isSameClub(socket.lastPlayedCard, playedData.card[0]) || socket.lastPlayedCard == undefined) {

			var round = new Round()
			round.addPlayedCards(playedData.card[0], currentPlayer);


			if (typeof socket.lastPlayedCard !== "undefined") {

				if (socket.largestValueInRound < playedData.card[0]) {
					round.updateLargerCardBy(currentPlayer);
					socket.largestValueInRound = playedData.card[0];
				}
				else {
					round.updateLargerCardBy(socket.largerOnePlayedBy);
				}

			}
			else {
				/*current val greater than last val*/
				if (socket.largestValueInRound < playedData.card[0]) {
					round.updateLargerCardBy(currentPlayer);
					socket.largestValueInRound = playedData.card[0];
				}
			}

			var nextPlayer = playerArray.find(element => element.position == ((currentPlayer.position + 1) >= currentRoom.getRoomCount() ? 0 : (currentPlayer.position + 1)));
			currentRoom.addRound(round);

			if (currentRoom.getRoomCount() == (currentRoom.getRoundCount())) { // one round complete
				//clearing rounds in room
				nextPlayer = round.getLargerOneplayedBy();
				currentRoom.clearRounds();

				setTimeout(function () {
					//broadcast card clear

					io.to(currentRoom.roomId).emit(constants.SOCKET_EVENTS.CLEAR_TABLE, "ROUND CLEARED REMOVE CARD FROM TABLE");
					io.sockets.connected[nextPlayer.id].emit(constants.SOCKET_EVENTS.TURN_UPDATE, true);

				}, 1500);

			}
			//notify next player to  play
			else {
				console.log("NEXT PLAYER", nextPlayer);
				io.sockets.connected[nextPlayer.id].emit(constants.SOCKET_EVENTS.TURN_UPDATE, true);

			}

		}

		/** DIFFERENT CLUB CONDITION */
		else {

			console.log("DIFFERENT CLUB............... \n")

			//vetti kitya player ayakanulla cards
			cardToSendToPlayer = [];
			cardToSendToPlayer.push(playedData.card[0]);//current played card since that round is not saved

			roundsInRoom = currentRoom.getRounds();
			if (roundsInRoom.length > 0) {
				for (var i = 0; i < roundsInRoom.length; i++) {
					cardToSendToPlayer.push(roundsInRoom[i].playedCard);
				}
			}

			var nextPlayer = socket.largerOnePlayedBy;
			nextPlayer.card = [];
			nextPlayer.card = cardToSendToPlayer;

			console.log("NEXT PLAYER", nextPlayer);

			io.sockets.connected[socket.largerOnePlayedBy.id].emit(constants.SOCKET_EVENTS.ADD_CARD, JSON.stringify(nextPlayer));

			setTimeout(function () {
				//broadcast card clear
				currentRoom.clearRounds();
				io.to(currentRoom.roomId).emit(constants.SOCKET_EVENTS.CLEAR_TABLE, "ROUND CLEARED REMOVE CARD FROM TABLE");
				io.sockets.connected[nextPlayer.id].emit(constants.SOCKET_EVENTS.TURN_UPDATE, true);
			}, 1500);

		}


	});



});

