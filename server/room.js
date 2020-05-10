function Room(roomId,roomName,roomTotalCount,socketId){

    this.roomId = roomId;
    this.socketId = socketId;
    this.roomName = roomName;
    this.roomTotalCount = roomTotalCount;
    this.player = [];
    this.round = [];
    
    this.addPlayer = function(player){
        this.player.push(player)
    }

    this.addRound = function(round){
        this.round.push(round);
    }

    this.removeLastRound = function(){
        this.round.pop();
    }


    this.getRounds = function(){
        return this.round;
    }

    this.clearRounds = function(){
        this.round = [];
    }

    this.getRoundCount = function(){
        
        return this.round.length;
    }

    this.getRoomCount = function(){

        return this.roomTotalCount;
    }

}


module.exports = Room;


