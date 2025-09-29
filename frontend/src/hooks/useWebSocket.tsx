import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useMEVStore } from '../stores/mevStore'
import { useValidatorStore } from '../stores/validatorStore'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

export interface WebSocketMessage {
  type: string
  channel: string
  data: any
  timestamp: string
}

interface WebSocketContextType {
  connectionStatus: ConnectionStatus
  isConnected: boolean
  subscribe: (channel: string, callback: (data: any) => void) => () => void
  unsubscribe: (channel: string) => void
  send: (message: any) => void
  lastMessage: WebSocketMessage | null
  reconnect: () => void
  getConnectionInfo: () => {
    status: ConnectionStatus
    connectedAt: Date | null
    reconnectAttempts: number
    lastError: string | null
  }
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

interface WebSocketProviderProps {
  children: React.ReactNode
  url?: string
  options?: {
    reconnectInterval?: number
    maxReconnectAttempts?: number
    heartbeatInterval?: number
    enableHeartbeat?: boolean
  }
}

export function WebSocketProvider({ 
  children, 
  url = 'ws://localhost:8000/ws',
  options = {}
}: WebSocketProviderProps) {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    enableHeartbeat = true
  } = options

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  
  const websocketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const subscriptionsRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const reconnectAttemptsRef = useRef(0)
  const connectedAtRef = useRef<Date | null>(null)
  const lastErrorRef = useRef<string | null>(null)
  
  const { token, isAuthenticated } = useAuthStore()
  const setUIConnectionStatus = useUIStore(state => state.setConnectionStatus)
  const addMEVOpportunity = useMEVStore(state => state.addOpportunity)
  const updateMEVOpportunity = useMEVStore(state => state.updateOpportunity)

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])

  // Global message handler for store updates
  const handleGlobalMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'mev_opportunity':
        if (message.data && message.data.id) {
          addMEVOpportunity({
            ...message.data,
            detectedAt: new Date(message.data.detection_timestamp || message.timestamp)
          })
        }
        break
        
      case 'arbitrage_opportunity':
        if (message.data && message.data.id) {
          addMEVOpportunity({
            ...message.data,
            opportunity_type: 'arbitrage',
            detectedAt: new Date(message.data.detection_timestamp || message.timestamp)
          })
        }
        break
        
      case 'liquidation_opportunity':
        if (message.data && message.data.id) {
          addMEVOpportunity({
            ...message.data,
            opportunity_type: 'liquidation',
            detectedAt: new Date(message.data.detection_timestamp || message.timestamp)
          })
        }
        break
        
      case 'opportunity_update':
        if (message.data && message.data.id) {
          updateMEVOpportunity(message.data.id, message.data)
        }
        break
        
      default:
        // Handle other message types as needed
        break
    }
  }, [addMEVOpportunity, updateMEVOpportunity])

  const startHeartbeat = useCallback(() => {
    if (!enableHeartbeat) return
    
    cleanup()
    heartbeatIntervalRef.current = setInterval(() => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ action: 'ping' }))
      }
    }, heartbeatInterval)
  }, [enableHeartbeat, heartbeatInterval, cleanup])

  const connect = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')
    lastErrorRef.current = null

    try {
      const wsUrl = new URL(url)
      if (token && isAuthenticated) {
        wsUrl.searchParams.append('token', token)
      }

      websocketRef.current = new WebSocket(wsUrl.toString())

      websocketRef.current.onopen = () => {
        setConnectionStatus('connected')
        setUIConnectionStatus('connected')
        connectedAtRef.current = new Date()
        reconnectAttemptsRef.current = 0
        startHeartbeat()
        
        // Re-subscribe to all channels
        subscriptionsRef.current.forEach((callbacks, channel) => {
          if (callbacks.size > 0) {
            websocketRef.current?.send(JSON.stringify({
              action: 'subscribe',
              channel
            }))
          }
        })
      }

      websocketRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          
          // Handle pong responses
          if (message.type === 'pong') {
            return
          }
          
          // Global message handling for store updates
          handleGlobalMessage(message)
          
          // Dispatch to channel subscribers
          const callbacks = subscriptionsRef.current.get(message.channel)
          if (callbacks) {
            callbacks.forEach(callback => {
              try {
                callback(message.data)
              } catch (error) {
                console.error('Error in WebSocket message callback:', error)
              }
            })
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      websocketRef.current.onclose = (event) => {
        cleanup()
        connectedAtRef.current = null
        
        if (event.wasClean) {
          setConnectionStatus('disconnected')
          setUIConnectionStatus('disconnected')
        } else {
          setConnectionStatus('error')
          setUIConnectionStatus('error')
          lastErrorRef.current = `Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`
          
          // Attempt reconnection if under max attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            setConnectionStatus('reconnecting')
            setUIConnectionStatus('reconnecting')
            reconnectAttemptsRef.current++
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect()
            }, reconnectInterval)
          }
        }
      }

      websocketRef.current.onerror = (error) => {
        setConnectionStatus('error')
        lastErrorRef.current = 'WebSocket connection error'
        console.error('WebSocket error:', error)
      }

    } catch (error) {
      setConnectionStatus('error')
      lastErrorRef.current = `Failed to create WebSocket connection: ${error}`
      console.error('WebSocket connection failed:', error)
    }
  }, [url, token, isAuthenticated, maxReconnectAttempts, reconnectInterval, startHeartbeat, cleanup])

  const disconnect = useCallback(() => {
    cleanup()
    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Client disconnect')
      websocketRef.current = null
    }
    setConnectionStatus('disconnected')
    connectedAtRef.current = null
  }, [cleanup])

  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    if (!subscriptionsRef.current.has(channel)) {
      subscriptionsRef.current.set(channel, new Set())
    }
    
    const channelCallbacks = subscriptionsRef.current.get(channel)!
    channelCallbacks.add(callback)
    
    // Send subscription message if connected
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        action: 'subscribe',
        channel
      }))
    }
    
    // Return unsubscribe function
    return () => {
      channelCallbacks.delete(callback)
      if (channelCallbacks.size === 0) {
        subscriptionsRef.current.delete(channel)
        
        // Send unsubscription message if connected
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({
            action: 'unsubscribe',
            channel
          }))
        }
      }
    }
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    subscriptionsRef.current.delete(channel)
    
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        action: 'unsubscribe',
        channel
      }))
    }
  }, [])

  const send = useCallback((message: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    setTimeout(connect, 1000)
  }, [disconnect, connect])

  const getConnectionInfo = useCallback(() => ({
    status: connectionStatus,
    connectedAt: connectedAtRef.current,
    reconnectAttempts: reconnectAttemptsRef.current,
    lastError: lastErrorRef.current
  }), [connectionStatus])

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, connect, disconnect])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, consider reducing activity
        cleanup()
      } else {
        // Page is visible, ensure connection is active
        if (isAuthenticated && connectionStatus === 'disconnected') {
          connect()
        } else if (connectionStatus === 'connected') {
          startHeartbeat()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, connectionStatus, connect, startHeartbeat, cleanup])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (isAuthenticated && connectionStatus !== 'connected') {
        reconnect()
      }
    }

    const handleOffline = () => {
      setConnectionStatus('disconnected')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isAuthenticated, connectionStatus, reconnect])

  const contextValue: WebSocketContextType = {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    subscribe,
    unsubscribe,
    send,
    lastMessage,
    reconnect,
    getConnectionInfo
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}