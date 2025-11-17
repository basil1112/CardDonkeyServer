import React from 'react'
import { getCardDisplay } from '../utils/cardUtils'

const GameTableCard = ({ cardId, onClick, disabled = false, className = '' }) => {
  const card = getCardDisplay(cardId)

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(cardId)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`
        w-16 h-24 rounded-lg border-2 border-white shadow-lg card-shadow
        bg-white relative transition-all duration-200
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-xl'}
        ${onClick && !disabled ? 'hover:-translate-y-2' : ''}
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
        <div className={`text-2xl ${card.color}`}>
          {card.symbol}
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

export default GameTableCard