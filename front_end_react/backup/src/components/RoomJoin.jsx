import React, { useState } from 'react'

const RoomJoin = ({ onJoinRoom, isConnected }) => {
  const [joinData, setJoinData] = useState({
    roomId: '',
    playerObj: {
      name: '',
      type: 'human',
      isMyTurn: false
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!joinData.playerObj.name.trim()) {
      alert('Please enter your name')
      return
    }
    if (!joinData.roomId.trim()) {
      alert('Please enter a room ID')
      return
    }
    onJoinRoom(joinData)
  }

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setJoinData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setJoinData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 card-hover">
      <div className="flex items-center mb-6">
        <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <h2 className="text-2xl font-bold text-gray-800">Join Existing Room</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={joinData.playerObj.name}
            onChange={(e) => handleChange('playerObj.name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room ID
          </label>
          <input
            type="text"
            value={joinData.roomId}
            onChange={(e) => handleChange('roomId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter room ID"
          />
        </div>

        <button
          type="submit"
          disabled={!isConnected}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            isConnected 
              ? 'bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isConnected ? 'Join Room' : 'Connecting...'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">Quick Join:</h3>
        <p className="text-sm text-green-700">
          Ask the room creator for the Room ID to join their game session.
        </p>
      </div>
    </div>
  )
}

export default RoomJoin