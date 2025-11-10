// player.js
function Player(position, id, roomId, name, type, isMyTurn) {
  this.position = position;
  this.id = id;
  this.roomId = roomId;
  this.name = name;
  this.type = type;
  this.card = [];
  this.isMyTurn = isMyTurn;
  this.totalPlayers = 0;
  this.hasWon = false; // Initialize as false

  this.addCard = function (cards) {
      this.card.push(cards);
  };

  this.setTurn = function (x) {
      this.isMyTurn = x;
  };

  this.setTotalPlayerRoom = function (x) {
      this.totalPlayers = x;
  };

  // New method to check if player is active (has cards and hasn't won)
  this.isActive = function () {
      return this.card.length > 0 && !this.hasWon;
  };
}

module.exports = Player;