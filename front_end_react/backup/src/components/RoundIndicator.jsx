import React from 'react'

const RoundIndicator = ({ roundNumber, currentTurn, isMyTurn }) => {
  return (
    <div className="flex items-center space-x-6 bg-white rounded-lg px-4 py-3 shadow-sm">
      <div className="text-center">
        <div className="text-xs text-gray-500 font-medium">ROUND</div>
        <div className="text-xl font-bold text-gray-800">{roundNumber}</div>
      </div>
      
      <div className="h-8 w-px bg-gray-300"></div>
      
      <div className="text-center">
        <div className="text-xs text-gray-500 font-medium">TURN</div>
        <div className="text-sm font-semibold text-gray-800 flex items-center">
          {currentTurn || 'Waiting...'}
          {isMyTurn && (
            <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoundIndicator