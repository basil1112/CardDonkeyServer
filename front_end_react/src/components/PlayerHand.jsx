import React from 'react'
import Card from './Card'
import { getCardSuit, getValidCards, hasSuit, sortCards } from '../utils/cardUtils'

const PlayerHand = ({ player, leadCard, isCurrentPlayer, onPlayCard, isMyTurn }) => {
  const sortedCards = sortCards(player.cards || [])

  const currentLeadingSuit = leadCard ? getCardSuit([leadCard]) : "unknown"

  console.log(`👤 ${player.name} hand:`, {
    cards: player.cards,
    sortedCards: sortedCards,
    isCurrentPlayer,
    isMyTurn,
    currentLeadingSuit
  })



  const handleCardClick = (cardId) => {
    if (isCurrentPlayer && isMyTurn) {
      console.log(`🎴 Playing card ${cardId} for ${player.name}`)
      onPlayCard(cardId)
    } else {
      console.log(`❌ Cannot play card - Current: ${isCurrentPlayer}, MyTurn: ${isMyTurn}`)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 border-2 ${isCurrentPlayer ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      } ${isMyTurn && isCurrentPlayer ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            {player.name}
          </h3>
          {isCurrentPlayer && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              You
            </span>
          )}
          {player.hasWon && (
            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
              Winner! 🎉
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {sortedCards.length} cards
          </span>
          {isMyTurn && isCurrentPlayer && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full animate-pulse">
              Your Turn
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 min-h-20 items-center">
        {sortedCards.length > 0 ? (
          sortedCards.map((cardId, index) => (
            <div
              key={cardId}
              className={`transform transition-all duration-200 ${isCurrentPlayer && isMyTurn
                ? 'hover:-translate-y-2 cursor-pointer'
                : 'opacity-80'
                }`}
              style={{
                marginLeft: index > 0 ? '-1rem' : '0'
              }}
            >

              <Card
                cardId={cardId}
                onClick={() => handleCardClick(cardId)}
                disabled={!isCurrentPlayer || !isMyTurn}
                currentLeadingSuit={currentLeadingSuit}
                isMyTurn={isMyTurn}
                playerGotSuit={hasSuit(sortedCards, currentLeadingSuit)}
              />
            </div>
          ))
        ) : (
          <div className="w-full text-center py-4 text-gray-500">
            {isCurrentPlayer ? 'You have no cards' : 'No cards'}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlayerHand