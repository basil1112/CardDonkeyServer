export const getCardSuit = (cardId) => {
  if (cardId >= 0 && cardId <= 12) return 'diamonds'
  if (cardId >= 13 && cardId <= 25) return 'clubs'
  if (cardId >= 26 && cardId <= 38) return 'hearts'
  if (cardId >= 39 && cardId <= 51) return 'spades'
  return 'unknown'
}

export const getCardRank = (cardId) => {
  const rankValue = cardId % 13
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  return ranks[rankValue]
}

export const getCardDisplay = (cardId) => {
  const suit = getCardSuit(cardId)
  const rank = getCardRank(cardId)

  const suitSymbols = {
    diamonds: '♦',
    clubs: '♣',
    hearts: '♥',
    spades: '♠'
  }

  const suitColors = {
    diamonds: 'text-red-600',
    clubs: 'text-black',
    hearts: 'text-red-600',
    spades: 'text-black'
  }

  return {
    symbol: suitSymbols[suit],
    color: suitColors[suit],
    rank,
    suit
  }
}

export const sortCards = (cards) => {
  return [...cards].sort((a, b) => {
    const suitA = Math.floor(a / 13)
    const suitB = Math.floor(b / 13)

    if (suitA !== suitB) {
      return suitA - suitB
    }

    return a - b
  })
}


export const hasSuit = (playerCards, suit) => {
  if (suit == "unknown") {
    return true;
  }
  return playerCards.some(cardId => getCardSuit(cardId) === suit)
}

export const isCardOfSuit = (cardId, suit, isMyTurn) => {
  if (suit == "unknown") {
    if (isMyTurn) {
      return true;
    } else {
      return false;
    }
  }
  const cardSuit = getCardSuit(cardId);
  return cardSuit === suit;
};




export const getValidCards = (playerCards, leadingSuit) => {
  if (!leadingSuit) {
    // If no leading suit (first player), all cards are valid
    return playerCards.map(cardId => ({
      cardId,
      isValid: true,
      isLeadingSuit: false
    }))
  }

  const hasLeadingSuit = hasSuit(playerCards, leadingSuit)

  return playerCards.map(cardId => {
    const cardSuit = getCardSuit(cardId)
    const isLeadingSuit = cardSuit === leadingSuit

    // Card is valid if:
    // 1. It's the leading suit, OR
    // 2. Player doesn't have any leading suit cards
    const isValid = isLeadingSuit || !hasLeadingSuit


    console.log(`Card ID: ${cardId}, Suit: ${cardSuit}, Leading Suit: ${leadingSuit}, Has Leading Suit: ${hasLeadingSuit}, Is Valid: ${isValid}`)


    return {
      cardId,
      isValid,
      isLeadingSuit
    }
  })
}


