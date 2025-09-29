import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from './useWebSocket'

export interface MarketData {
  symbol: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h: number
  high24h: number
  low24h: number
  marketCap?: number
  timestamp: Date
}

export interface PricePoint {
  timestamp: Date
  price: number
  volume?: number
}

export interface OHLCData {
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface MarketDataState {
  prices: Map<string, MarketData>
  priceHistory: Map<string, PricePoint[]>
  ohlcData: Map<string, OHLCData[]>
  loading: boolean
  error: string | null
  lastUpdate: Date | null
  isOffline: boolean
  offlineData: Map<string, MarketData>
}

interface UseMarketDataOptions {
  symbols?: string[]
  enableHistory?: boolean
  historyLimit?: number
  enableOHLC?: boolean
  ohlcInterval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  enableOfflineFallback?: boolean
  updateInterval?: number
}

const API_BASE_URL = 'http://localhost:8000/api'

export function useMarketData(options: UseMarketDataOptions = {}) {
  const {
    symbols = ['SOL', 'BTC', 'ETH', 'RAY', 'USDC'],
    enableHistory = true,
    historyLimit = 100,
    enableOHLC = false,
    ohlcInterval = '1h',
    enableOfflineFallback = true,
    updateInterval = 10000 // 10 seconds
  } = options

  const { subscribe, isConnected, connectionStatus } = useWebSocket()
  
  const [state, setState] = useState<MarketDataState>({
    prices: new Map(),
    priceHistory: new Map(),
    ohlcData: new Map(),
    loading: true,
    error: null,
    lastUpdate: null,
    isOffline: false,
    offlineData: new Map()
  })

  const fallbackTimeoutRef = useRef<number | null>(null)
  const offlineIntervalRef = useRef<number | null>(null)

  // Save data to localStorage for offline use
  const saveOfflineData = useCallback((symbol: string, data: MarketData) => {
    if (!enableOfflineFallback) return
    
    try {
      const offlineKey = `market_data_${symbol}`
      localStorage.setItem(offlineKey, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save offline market data:', error)
    }
  }, [enableOfflineFallback])

  // Load data from localStorage
  const loadOfflineData = useCallback(() => {
    if (!enableOfflineFallback) return new Map()
    
    const offlineData = new Map<string, MarketData>()
    
    symbols.forEach(symbol => {
      try {
        const offlineKey = `market_data_${symbol}`
        const saved = localStorage.getItem(offlineKey)
        if (saved) {
          const data = JSON.parse(saved)
          data.timestamp = new Date(data.timestamp)
          offlineData.set(symbol, data)
        }
      } catch (error) {
        console.warn(`Failed to load offline data for ${symbol}:`, error)
      }
    })
    
    return offlineData
  }, [symbols, enableOfflineFallback])

  // Fetch data from REST API as fallback
  const fetchFallbackData = useCallback(async () => {
    if (!enableOfflineFallback) return

    try {
      const responses = await Promise.allSettled(
        symbols.map(symbol =>
          fetch(`${API_BASE_URL}/prices/${symbol}`)
            .then(res => res.ok ? res.json() : Promise.reject(res))
        )
      )

      const fallbackData = new Map<string, MarketData>()
      
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          const symbol = symbols[index]
          const data: MarketData = {
            ...response.value,
            timestamp: new Date(response.value.timestamp || Date.now())
          }
          fallbackData.set(symbol, data)
          saveOfflineData(symbol, data)
        }
      })

      if (fallbackData.size > 0) {
        setState(prev => ({
          ...prev,
          prices: fallbackData,
          lastUpdate: new Date(),
          loading: false,
          error: null
        }))
      }
    } catch (error) {
      console.warn('Fallback API request failed:', error)
      
      // Load from localStorage as last resort
      const offlineData = loadOfflineData()
      if (offlineData.size > 0) {
        setState(prev => ({
          ...prev,
          prices: offlineData,
          isOffline: true,
          lastUpdate: new Date(),
          loading: false,
          error: 'Using cached data - connection unavailable'
        }))
      }
    }
  }, [symbols, enableOfflineFallback, saveOfflineData, loadOfflineData])

  // Handle real-time price updates
  const handlePriceUpdate = useCallback((data: any) => {
    const marketData: MarketData = {
      ...data,
      timestamp: new Date(data.timestamp || Date.now())
    }

    // Save for offline use
    saveOfflineData(marketData.symbol, marketData)

    setState(prev => {
      const newPrices = new Map(prev.prices)
      newPrices.set(marketData.symbol, marketData)

      let newHistory = prev.priceHistory
      if (enableHistory) {
        newHistory = new Map(prev.priceHistory)
        const symbolHistory = newHistory.get(marketData.symbol) || []
        const newPoint: PricePoint = {
          timestamp: marketData.timestamp,
          price: marketData.price,
          volume: marketData.volume24h
        }
        
        const updatedHistory = [...symbolHistory, newPoint].slice(-historyLimit)
        newHistory.set(marketData.symbol, updatedHistory)
      }

      return {
        ...prev,
        prices: newPrices,
        priceHistory: newHistory,
        lastUpdate: new Date(),
        isOffline: false,
        error: null
      }
    })
  }, [enableHistory, historyLimit, saveOfflineData])

  // Handle OHLC data updates
  const handleOHLCUpdate = useCallback((data: any) => {
    if (!enableOHLC) return

    const ohlcPoint: OHLCData = {
      ...data,
      timestamp: new Date(data.timestamp)
    }

    setState(prev => {
      const newOHLC = new Map(prev.ohlcData)
      const symbolOHLC = newOHLC.get(data.symbol) || []
      
      // Update existing point or add new one
      const existingIndex = symbolOHLC.findIndex(
        point => point.timestamp.getTime() === ohlcPoint.timestamp.getTime()
      )
      
      let updatedOHLC
      if (existingIndex >= 0) {
        updatedOHLC = [...symbolOHLC]
        updatedOHLC[existingIndex] = ohlcPoint
      } else {
        updatedOHLC = [...symbolOHLC, ohlcPoint].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        ).slice(-historyLimit)
      }
      
      newOHLC.set(data.symbol, updatedOHLC)
      
      return {
        ...prev,
        ohlcData: newOHLC,
        lastUpdate: new Date()
      }
    })
  }, [enableOHLC, historyLimit])

  // Set up WebSocket subscriptions
  useEffect(() => {
    if (!isConnected) {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      // Start fallback data fetching
      if (enableOfflineFallback) {
        fallbackTimeoutRef.current = window.setTimeout(() => {
          fetchFallbackData()
        }, 2000) // Wait 2 seconds before falling back
      }
      return
    }

    // Clear fallback timeout when connected
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
      fallbackTimeoutRef.current = null
    }

    setState(prev => ({ ...prev, loading: false, error: null, isOffline: false }))

    const subscriptions: (() => void)[] = []

    // Subscribe to price updates
    subscriptions.push(
      subscribe('price_updates', (data) => {
        if (data.type === 'price_update') {
          handlePriceUpdate(data.data)
        }
      })
    )

    // Subscribe to market data
    subscriptions.push(
      subscribe('market_data', (data) => {
        switch (data.type) {
          case 'market_update':
            handlePriceUpdate(data.data)
            break
          case 'ohlc_update':
            handleOHLCUpdate(data.data)
            break
          default:
            break
        }
      })
    )

    // Subscribe to specific symbols
    symbols.forEach(symbol => {
      subscriptions.push(
        subscribe(`price_${symbol}`, (data) => {
          if (data.type === 'price_update') {
            handlePriceUpdate(data.data)
          }
        })
      )
    })

    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe())
    }
  }, [
    isConnected, 
    subscribe, 
    symbols, 
    handlePriceUpdate, 
    handleOHLCUpdate,
    enableOfflineFallback,
    fetchFallbackData
  ])

  // Handle connection status changes
  useEffect(() => {
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      setState(prev => ({ 
        ...prev, 
        error: 'Connection lost. Switching to fallback data...',
        loading: enableOfflineFallback
      }))
      
      if (enableOfflineFallback) {
        fetchFallbackData()
        
        // Set up periodic fallback updates
        offlineIntervalRef.current = window.setInterval(() => {
          fetchFallbackData()
        }, updateInterval * 2) // Less frequent updates when offline
      }
    } else if (connectionStatus === 'reconnecting') {
      setState(prev => ({ 
        ...prev, 
        error: 'Reconnecting to live market data...',
        loading: true
      }))
    } else if (connectionStatus === 'connected') {
      setState(prev => ({ 
        ...prev, 
        error: null,
        loading: false,
        isOffline: false
      }))
      
      // Clear offline interval when back online
      if (offlineIntervalRef.current) {
        clearInterval(offlineIntervalRef.current)
        offlineIntervalRef.current = null
      }
    }
  }, [connectionStatus, enableOfflineFallback, fetchFallbackData, updateInterval])

  // Load initial offline data
  useEffect(() => {
    if (enableOfflineFallback && symbols.length > 0) {
      const offlineData = loadOfflineData()
      if (offlineData.size > 0) {
        setState(prev => ({
          ...prev,
          offlineData,
          // Only use offline data if no live data is available
          prices: prev.prices.size === 0 ? offlineData : prev.prices
        }))
      }
    }
  }, [symbols, enableOfflineFallback, loadOfflineData])

  // Cleanup
  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
      }
      if (offlineIntervalRef.current) {
        clearInterval(offlineIntervalRef.current)
      }
    }
  }, [])

  // Manual refresh
  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    if (isConnected) {
      // Request fresh data through WebSocket
    } else {
      fetchFallbackData()
    }
  }, [isConnected, fetchFallbackData])

  // Get price for symbol
  const getPrice = useCallback((symbol: string) => {
    return state.prices.get(symbol)
  }, [state.prices])

  // Get price history for symbol
  const getPriceHistory = useCallback((symbol: string) => {
    return state.priceHistory.get(symbol) || []
  }, [state.priceHistory])

  // Get OHLC data for symbol
  const getOHLCData = useCallback((symbol: string) => {
    return state.ohlcData.get(symbol) || []
  }, [state.ohlcData])

  // Get all prices as array
  const getAllPrices = useCallback(() => {
    return Array.from(state.prices.values())
  }, [state.prices])

  return {
    // State
    prices: getAllPrices(),
    pricesMap: state.prices,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    isOffline: state.isOffline,
    
    // Connection status
    isConnected,
    connectionStatus,
    
    // Actions
    refresh,
    
    // Getters
    getPrice,
    getPriceHistory,
    getOHLCData
  }
}

// Hook for a specific symbol
export function useSymbolPrice(symbol: string) {
  const { getPrice, getPriceHistory, loading, error, isConnected, refresh } = useMarketData({
    symbols: [symbol]
  })

  return {
    price: getPrice(symbol),
    priceHistory: getPriceHistory(symbol),
    loading,
    error,
    isConnected,
    refresh
  }
}

// Hook for multiple symbols comparison
export function useSymbolComparison(symbols: string[]) {
  const { prices, loading, error, isConnected, refresh } = useMarketData({
    symbols,
    enableHistory: true
  })

  const compareSymbols = useCallback(() => {
    const symbolPrices = symbols.map(symbol => 
      prices.find(p => p.symbol === symbol)
    ).filter(Boolean) as MarketData[]

    return {
      prices: symbolPrices,
      totalMarketCap: symbolPrices.reduce((sum, p) => sum + (p.marketCap || 0), 0),
      avgChange24h: symbolPrices.reduce((sum, p) => sum + p.changePercent24h, 0) / symbolPrices.length,
      topPerformer: symbolPrices.reduce((top, current) => 
        current.changePercent24h > top.changePercent24h ? current : top
      ),
      worstPerformer: symbolPrices.reduce((worst, current) => 
        current.changePercent24h < worst.changePercent24h ? current : worst
      )
    }
  }, [symbols, prices])

  return {
    ...compareSymbols(),
    loading,
    error,
    isConnected,
    refresh
  }
}