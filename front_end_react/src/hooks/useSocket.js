import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'

export const useSocket = () => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  const connectSocket = useCallback((url) => {
    try {
      const newSocket = io(url, {
        transports: ['websocket'],
        autoConnect: true
      })

      newSocket.on('connect', () => {
        setIsConnected(true)
        console.log('Socket connected:', newSocket.id)
      })

      newSocket.on('disconnect', () => {
        setIsConnected(false)
        console.log('Socket disconnected')
      })

      setSocket(newSocket)
    } catch (error) {
      console.error('Failed to connect socket:', error)
    }
  }, [])

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [socket])

  return {
    socket,
    isConnected,
    connectSocket,
    disconnectSocket
  }
}