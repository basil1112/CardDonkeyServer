// room.js - Enhanced version
function Room(roomId, roomName, roomTotalCount, socketId) {
    this.roomId = roomId;
    this.socketId = socketId;
    this.roomName = roomName;
    this.roomTotalCount = roomTotalCount;
    this.player = [];
    this.round = [];
    
    // Game round state tracking
    this.currentGameRound = {
        largestCard: -1,
        largestCardPlayer: null
    };
    
    this.addPlayer = function(player){
        this.player.push(player);
    };

    this.addRound = function(round){
        this.round.push(round);
        
        // Update game round state
        const playedCard = round.getPlayedCard();
        if (playedCard > this.currentGameRound.largestCard) {
            this.currentGameRound.largestCard = playedCard;
            this.currentGameRound.largestCardPlayer = round.getPlayedPlayer();
        }
    };

    this.removeLastRound = function(){
        this.round.pop();
    };

    this.getRounds = function(){
        return this.round;
    };

    this.clearRounds = function(){
        this.round = [];
        // Reset game round state
        this.currentGameRound.largestCard = -1;
        this.currentGameRound.largestCardPlayer = null;
    };

    this.getRoundCount = function(){ 
        return this.round.length;
    };

    this.getRoomCount = function(){
        return this.roomTotalCount;
    };

    this.getGameRoundWinner = function() {
        return this.currentGameRound.largestCardPlayer;
    };

    this.getLargestCardInRound = function() {
        return this.currentGameRound.largestCard;
    };
}

module.exports = Room;