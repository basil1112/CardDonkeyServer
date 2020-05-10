const DIAMONDS_TWO = 0;
const DIAMONDS_THREE = 1;
const DIAMONDS_FOUR = 2;
const DIAMONDS_FIVE = 3;
const DIAMONDS_SIX = 4;
const DIAMONDS_SEVEN = 5;
const DIAMONDS_EIGHT = 6;
const DIAMONDS_NINE = 7;
const DIAMONDS_TEN = 8;
const DIAMONDS_JACK = 9;
const DIAMONDS_QUEEN = 10;
const DIAMONDS_KING = 11;
const DIAMONDS_ACE = 12;

const CLUBS_TWO = 13;
const CLUBS_THREE = 14;
const CLUBS_FOUR = 15;
const CLUBS_FIVE = 16;
const CLUBS_SIX = 17;
const CLUBS_SEVEN = 18;
const CLUBS_EIGHT = 19;
const CLUBS_NINE = 20;
const CLUBS_TEN = 21;
const CLUBS_JACK = 22;
const CLUBS_QUEEN = 23;
const CLUBS_KING = 24;
const CLUBS_ACE = 25;

const HEARTS_TWO = 26;
const HEARTS_THREE = 27;
const HEARTS_FOUR = 28;
const HEARTS_FIVE = 29;
const HEARTS_SIX = 30;
const HEARTS_SEVEN = 31;
const HEARTS_EIGHT = 32;
const HEARTS_NINE = 33;
const HEARTS_TEN = 34;
const HEARTS_JACK = 35;
const HEARTS_QUEEN = 36;
const HEARTS_KING = 37;
const HEARTS_ACE = 38;

const SPADES_TWO = 39;
const SPADES_THREE = 40;
const SPADES_FOUR = 41;
const SPADES_FIVE = 42;
const SPADES_SIX = 43;
const SPADES_SEVEN = 44;
const SPADES_EIGHT = 45;
const SPADES_NINE = 46;
const SPADES_TEN = 47;
const SPADES_JACK = 48;
const SPADES_QUEEN = 49;
const SPADES_KING = 50;
const SPADES_ACE = 51;



const DIAMONDS_RANGE = {
	start : 0,
	end : 12
}

const CLUBS_RANGE = {
	start : 13,
	end : 25
}

const HEARTS_RANGE = {
	start : 26,
	end : 38
}


const SPADES_RANGE = {
	start : 39,
	end : 51
}

const CARD_DIAMONDS = 100;
const CARD_CLUBS = 101;
const CARD_HEARTS = 102;
const CARD_SPADES = 103;

function getDeck() {
	var deck = new Array();
	for (var i = 0; i <= 51; i++) {
		deck.push(i);
	}
	return deck;
}


function shuffle(deck) {
	let itemCount = deck.length;
	while (itemCount > 0) {
		let index = Math.floor(Math.random() * itemCount);
		itemCount--;
		let temp = deck[itemCount];
		deck[itemCount] = deck[index];
		deck[index] = temp;
	}
	return deck
}


function isSameClub(cardId1, cardId2) {
	var card1Club = getClub(cardId1);
		console.log("card1Club ="+card1Club);
	var card2Club = getClub(cardId2);
		console.log("card1Club ="+card2Club);
	return card1Club == card2Club;
}

function getClub(cardId) {
	if (cardId >= DIAMONDS_RANGE.start && cardId <= DIAMONDS_RANGE.end) {
		return CARD_DIAMONDS;
	} else if (cardId >= CLUBS_RANGE.start && cardId <= CLUBS_RANGE.end) {
		return CARD_CLUBS;
	} else if (cardId >= HEARTS_RANGE.start && cardId <= HEARTS_RANGE.end) {
		return CARD_HEARTS;
	} else if (cardId >= SPADES_RANGE.start && cardId <= SPADES_RANGE.end) {
		return CARD_SPADES;
	}
	return -1;
}

module.exports = { shuffle, getDeck, getClub,isSameClub,DIAMONDS_RANGE,CLUBS_RANGE,HEARTS_RANGE,SPADES_RANGE,
	DIAMONDS_TWO,
	DIAMONDS_THREE,
	DIAMONDS_FOUR,
	DIAMONDS_FIVE,
	DIAMONDS_SIX,
	DIAMONDS_SEVEN,
	DIAMONDS_EIGHT,
	DIAMONDS_NINE,
	DIAMONDS_TEN,
	DIAMONDS_JACK,
	DIAMONDS_QUEEN,
	DIAMONDS_KING,
	DIAMONDS_ACE,
	CLUBS_TWO,
	CLUBS_THREE,
	CLUBS_FOUR,
	CLUBS_FIVE,
	CLUBS_SIX,
	CLUBS_SEVEN,
	CLUBS_EIGHT,
	CLUBS_NINE,
	CLUBS_TEN,
	CLUBS_JACK,
	CLUBS_QUEEN,
	CLUBS_KING,
	CLUBS_ACE,
	HEARTS_TWO,
	HEARTS_THREE,
	HEARTS_FOUR,
	HEARTS_FIVE,
	HEARTS_SIX,
	HEARTS_SEVEN,
	HEARTS_EIGHT,
	HEARTS_NINE,
	HEARTS_TEN,
	HEARTS_JACK,
	HEARTS_QUEEN,
	HEARTS_KING,
	HEARTS_ACE,
	SPADES_TWO,
	SPADES_THREE,
	SPADES_FOUR,
	SPADES_FIVE,
	SPADES_SIX,
	SPADES_SEVEN,
	SPADES_EIGHT,
	SPADES_NINE,
	SPADES_TEN,
	SPADES_JACK,
	SPADES_QUEEN,
	SPADES_KING,
	SPADES_ACE}