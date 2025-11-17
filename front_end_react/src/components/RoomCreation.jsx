import React, { useState } from 'react'

const RoomCreation = ({ onCreateRoom, isConnected }) => {
  const [roomData, setRoomData] = useState({
    roomName: '',
    roomTotalCount: 4,
    playerObj: {
      name: '',
      type: 'human',
      isMyTurn: false
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!roomData.playerObj.name.trim()) {
      alert('Please enter your name')
      return
    }
    if (!roomData.roomName.trim()) {
      alert('Please enter a room name')
      return
    }
    onCreateRoom(roomData)
  }

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setRoomData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setRoomData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 card-hover">
      <div className="flex items-center mb-6">
        <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <h2 className="text-2xl font-bold text-gray-800">Create New Room</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={roomData.playerObj.name}
            onChange={(e) => handleChange('playerObj.name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room Name
          </label>
          <input
            type="text"
            value={roomData.roomName}
            onChange={(e) => handleChange('roomName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter room name"
            maxLength={30}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Players
          </label>
          <select
            value={roomData.roomTotalCount}
            onChange={(e) => handleChange('roomTotalCount', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={2}>2 Players</option>
            <option value={3}>3 Players</option>
            <option value={4}>4 Players</option>
            <option value={6}>6 Players</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={!isConnected}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            isConnected 
              ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isConnected ? 'Create Room' : 'Connecting...'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">How to Play:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Avoid being the last player with cards</li>
          <li>• Follow the lead suit when possible</li>
          <li>• Last player with cards becomes the Donkey! 🐴</li>
        </ul>
      </div>
    </div>
  )
}

export default RoomCreation