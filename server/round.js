function Round() {

    this.playedPlayer = undefined;
    this.playedCard = undefined;
    this.largerCardBy = undefined;
    this.addPlayedCards = function (card, player) {

        this.playedCard = card;
        this.playedPlayer = player;

    }

    this.getPlayedCards = function () {
        return playedCards;
    }

    this.updateLargerCardBy = function (player) {
        this.largerCardBy = player;
    }

    this.getLargerOneplayedBy = function () {

        return this.largerCardBy;
    }

    this.getLastPlayedCard = function () {
        return this.playedCard;
    }


}





module.exports = Round;