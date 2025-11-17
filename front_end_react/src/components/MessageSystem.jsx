import React, { useState, useEffect } from 'react'

const MessageSystem = ({ messages }) => {
  const [visibleMessages, setVisibleMessages] = useState([])

  useEffect(() => {
    // Update visible messages when messages prop changes
    setVisibleMessages(messages)
    
    // Auto-remove messages after 5 seconds
    const timer = setTimeout(() => {
      if (messages.length > 0) {
        // Remove the oldest message
        setVisibleMessages(prev => prev.slice(1))
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [messages])

  const getMessageColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-800'
      case 'error':
        return 'bg-red-100 border-red-400 text-red-800'
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800'
      default:
        return 'bg-blue-100 border-blue-400 text-blue-800'
    }
  }

  const getMessageIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  console.log('💬 Visible Messages:', visibleMessages)

  return (
    <div className="fixed bottom-4 right-4 w-80 max-w-full z-50 space-y-2">
      {/* {visibleMessages.map((message) => (
        <div
          key={message.id}
          className={`p-3 rounded-lg border-2 shadow-lg transform transition-all duration-300 animate-in slide-in-from-right-8 ${getMessageColor(message.type)}`}
        >
          <div className="flex items-start space-x-2">
            <span className="text-sm flex-shrink-0 mt-0.5">
              {getMessageIcon(message.type)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.text}</p>
              <p className="text-xs opacity-75 mt-0.5">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      ))} */}
    </div>
  )
}

export default MessageSystem