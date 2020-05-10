

function Player(position,id,roomId,name,type,isMyTurn) {
    this.position = position;
    this.id = id;
    this.roomId = roomId;
    this.name = name;
    this.type = type;
    this.card = [];
    this.isMyTurn = isMyTurn;
    
    this.addCard = function(cards){
      this.card.push(cards)
    }

    this.setTurn = function(x){
      this.isMyTurn = x;
    }

  }


  module.exports = Player;
  