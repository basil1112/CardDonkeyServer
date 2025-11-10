// round.js - Simplified version
function Round() {
    this.playedPlayer = undefined;
    this.playedCard = undefined;

    // Record a played card and the player who played it
    this.addPlayedCards = function (card, player) {
        this.playedCard = card;
        this.playedPlayer = player;
        console.log('Card played:', card, 'by player:', player.name);
    };

    this.getPlayedPlayer = function () {
        return this.playedPlayer;
    };

    this.getPlayedCard = function () {
        return this.playedCard;
    };
}

module.exports = Round;