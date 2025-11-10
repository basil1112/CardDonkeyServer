// constants.js
const SOCKET_EVENTS = Object.freeze({
    "CREATE_GAME": "CREATE_GAME",
    "AFTER_GAME_CREATED": "AFTER_GAME_CREATED",
    "PLAYER_JOIN": "PLAYER_JOIN",
    "NOTIFY_PLAYER_JOIN": "NOTIFY_PLAYER_JOIN",
    "START_GAME": "START_GAME",
    "STARTED_GAME": "STARTED_GAME",
    "TURN_UPDATE": "TURN_UPDATE",
    "TABLE_ROUND": "TABLE_ROUND",
    "ADD_CARD_TABLE": "ADD_CARD_TABLE",
    "CLEAR_TABLE": "CLEAR_TABLE",
    "ADD_CARD": "ADD_CARD",
    "ON_CONNECTION": "on_connection"
});

function GETNEWPIN(connection, onPinGenerationSuccess) {
    var x = 1000;
    var y = 100000000;
    var value = Math.floor(x + (y - x) * Math.random());

    console.log('Generated room PIN:', value);
    onPinGenerationSuccess(value);
}

module.exports = { SOCKET_EVENTS, GETNEWPIN };