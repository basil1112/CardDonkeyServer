import React from 'react'
import { getCardDisplay, isCardOfSuit } from '../utils/cardUtils'
import { useEffect } from 'react'

const Card = ({ cardId, onClick, disabled = false, className = '', currentLeadingSuit, isMyTurn = true, playerGotSuit }) => {
  const card = getCardDisplay(cardId)

  const isMobileView = window.innerWidth <= 768;

  const [_disabled, set_Disabled] = React.useState(disabled);

  const handleClick = () => {
    if (!_disabled && onClick) {
      onClick(cardId)
    }
  }

  useEffect(() => {
    if (playerGotSuit) {
      if (isCardOfSuit(cardId, currentLeadingSuit, isMyTurn)) {
        set_Disabled(false)
      } else {
        set_Disabled(true)
      }
    }
    else {
      set_Disabled(false);
    }
  }, [playerGotSuit, currentLeadingSuit, isMyTurn, cardId])

  return (
    <div
      onClick={handleClick}
      className={`${isMobileView ? 'w-12 h-20' : 'w-16 h-24'}
        rounded-lg border-2 border-white shadow-lg card-shadow
        bg-white relative transition-all duration-200
        ${_disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-xl'}
        ${onClick && !_disabled ? 'hover:-translate-y-2' : ''}
        ${className}
      `}
    >
      {/* Top left rank and suit */}
      <div className="absolute top-1 left-1">
        <div className={`text-xs font-bold ${card.color}`}>
          {card.rank}
        </div>
        <div className={`text-xs ${card.color}`}>
          {card.symbol}
        </div>
      </div>

      {/* Center suit symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${isMobileView ? 'text-lg':'text-2xl'} ${card.color}`}>
          {card.suitMajor ? card.suitMajor : card.symbol}
        </div>
      </div>

      {/* Bottom right rank and suit (rotated) */}
      <div className="absolute bottom-1 right-1 transform rotate-180">
        <div className={`text-xs font-bold ${card.color}`}>
          {card.rank}
        </div>
        <div className={`text-xs ${card.color}`}>
          {card.symbol}
        </div>
      </div>
    </div>
  )
}

export default Card