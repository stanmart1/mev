import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from './useWebSocket'

export interface ValidatorPerformance {
  address: string
  name: string
  epoch: number
  stakeAmount: number
  commission: number
  apy: number
  uptime: number
  mevRewards: number
  regularRewards: number
  delegators: number
  rank: number
  isJitoEnabled: boolean
  reliability: number
  performance: number
  lastUpdate: Date
  badge?: 'top' | 'recommended' | 'rising'
  metrics: {
    voteCredits: number
    skipRate: number
    blockProduction: number
    mevCapture: number
    efficiency: number
  }
}

interface ValidatorPerformanceState {
  validators: Map<string, ValidatorPerformance>
  loading: boolean
  error: string | null
  lastUpdate: Date | null
  epochInfo: {
    current: number
    progress: number
    timeRemaining: number
  } | null
  networkStats: {
    totalValidators: number
    activeValidators: number
    jitoValidators: number
    averageApy: number
    totalStake: number
  } | null
}

interface UseValidatorPerformanceOptions {
  addresses?: string[]
  includeInactive?: boolean
  updateInterval?: number
  enableRealTimeUpdates?: boolean
}

export function useValidatorPerformance(options: UseValidatorPerformanceOptions = {}) {
  const {
    addresses,
    includeInactive = false,
    updateInterval = 30000, // 30 seconds
    enableRealTimeUpdates = true
  } = options

  const { subscribe, isConnected, connectionStatus } = useWebSocket()
  
  const [state, setState] = useState<ValidatorPerformanceState>({
    validators: new Map(),
    loading: true,
    error: null,
    lastUpdate: null,
    epochInfo: null,
    networkStats: null
  })

  const updateTimeoutRef = useRef<number | null>(null)

  // Handle validator performance updates
  const handleValidatorUpdate = useCallback((data: any) => {
    const validator: ValidatorPerformance = {
      ...data,
      lastUpdate: new Date(data.lastUpdate || Date.now())
    }

    // Filter by addresses if specified
    if (addresses && addresses.length > 0 && !addresses.includes(validator.address)) {
      return
    }

    // Filter inactive validators if not included
    if (!includeInactive && validator.uptime < 95) {
      return
    }

    setState(prev => {
      const newValidators = new Map(prev.validators)
      newValidators.set(validator.address, validator)
      
      return {
        ...prev,
        validators: newValidators,
        lastUpdate: new Date()
      }
    })
  }, [addresses, includeInactive])

  // Handle epoch information updates
  const handleEpochUpdate = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      epochInfo: {
        current: data.epoch,
        progress: data.progress,
        timeRemaining: data.timeRemaining
      },
      lastUpdate: new Date()
    }))
  }, [])

  // Handle network statistics updates
  const handleNetworkStatsUpdate = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      networkStats: {
        totalValidators: data.totalValidators,
        activeValidators: data.activeValidators,
        jitoValidators: data.jitoValidators,
        averageApy: data.averageApy,
        totalStake: data.totalStake
      },
      lastUpdate: new Date()
    }))
  }, [])

  // Handle validator rankings update
  const handleRankingsUpdate = useCallback((data: any) => {
    setState(prev => {
      const newValidators = new Map(prev.validators)
      
      data.rankings.forEach((ranking: any) => {
        const existing = newValidators.get(ranking.address)
        if (existing) {
          newValidators.set(ranking.address, {
            ...existing,
            rank: ranking.rank,
            badge: ranking.badge,
            lastUpdate: new Date()
          })
        }
      })
      
      return {
        ...prev,
        validators: newValidators,
        lastUpdate: new Date()
      }
    })
  }, [])

  // Set up WebSocket subscriptions
  useEffect(() => {
    if (!isConnected) {
      setState(prev => ({ ...prev, loading: true, error: null }))
      return
    }

    setState(prev => ({ ...prev, loading: false, error: null }))

    const subscriptions: (() => void)[] = []

    // Subscribe to validator updates
    if (enableRealTimeUpdates) {
      subscriptions.push(
        subscribe('validator_updates', (data) => {
          switch (data.type) {
            case 'validator_performance':
              handleValidatorUpdate(data.data)
              break
            case 'epoch_update':
              handleEpochUpdate(data.data)
              break
            case 'network_stats':
              handleNetworkStatsUpdate(data.data)
              break
            case 'validator_rankings':
              handleRankingsUpdate(data.data)
              break
            default:
              break
          }
        })
      )

      // Subscribe to specific validator addresses if provided
      if (addresses && addresses.length > 0) {
        addresses.forEach(address => {
          subscriptions.push(
            subscribe(`validator_${address}`, (data) => {
              if (data.type === 'validator_update') {
                handleValidatorUpdate(data.data)
              }
            })
          )
        })
      }
    }

    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe())
    }
  }, [
    isConnected, 
    subscribe, 
    enableRealTimeUpdates, 
    addresses,
    handleValidatorUpdate,
    handleEpochUpdate,
    handleNetworkStatsUpdate,
    handleRankingsUpdate
  ])

  // Handle connection status changes
  useEffect(() => {
    if (connectionStatus === 'error') {
      setState(prev => ({ 
        ...prev, 
        error: 'Connection lost. Validator data may be outdated.', 
        loading: false 
      }))
    } else if (connectionStatus === 'reconnecting') {
      setState(prev => ({ 
        ...prev, 
        error: 'Reconnecting to get latest validator data...', 
        loading: true 
      }))
    } else if (connectionStatus === 'connected') {
      setState(prev => ({ 
        ...prev, 
        error: null, 
        loading: false 
      }))
    }
  }, [connectionStatus])

  // Periodic updates when not using real-time
  useEffect(() => {
    if (!enableRealTimeUpdates && isConnected && updateInterval > 0) {
      const fetchUpdates = () => {
        // Request validator performance update
        setState(prev => ({ ...prev, loading: true }))
      }

      const interval = setInterval(fetchUpdates, updateInterval)
      return () => clearInterval(interval)
    }
  }, [enableRealTimeUpdates, isConnected, updateInterval])

  // Cleanup
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  // Manual refresh
  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    // Trigger refresh through WebSocket or API call
  }, [])

  // Get validators as array
  const getValidators = useCallback(() => {
    return Array.from(state.validators.values()).sort((a, b) => a.rank - b.rank)
  }, [state.validators])

  // Get validator by address
  const getValidator = useCallback((address: string) => {
    return state.validators.get(address)
  }, [state.validators])

  // Get top validators
  const getTopValidators = useCallback((count: number = 10) => {
    return getValidators().slice(0, count)
  }, [getValidators])

  // Get Jito-enabled validators
  const getJitoValidators = useCallback(() => {
    return getValidators().filter(v => v.isJitoEnabled)
  }, [getValidators])

  // Get validators by performance range
  const getValidatorsByPerformance = useCallback((minPerformance: number, maxPerformance: number = 100) => {
    return getValidators().filter(v => v.performance >= minPerformance && v.performance <= maxPerformance)
  }, [getValidators])

  return {
    // State
    validators: getValidators(),
    validatorsMap: state.validators,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    epochInfo: state.epochInfo,
    networkStats: state.networkStats,
    
    // Connection status
    isConnected,
    connectionStatus,
    
    // Actions
    refresh,
    
    // Getters
    getValidator,
    getTopValidators,
    getJitoValidators,
    getValidatorsByPerformance
  }
}

// Hook for a specific validator
export function useValidator(address: string) {
  const { getValidator, loading, error, isConnected, refresh } = useValidatorPerformance({
    addresses: [address]
  })

  return {
    validator: getValidator(address),
    loading,
    error,
    isConnected,
    refresh
  }
}

// Hook for validator rankings
export function useValidatorRankings(limit: number = 50) {
  const { validators, loading, error, isConnected, refresh } = useValidatorPerformance({
    includeInactive: false
  })

  return {
    rankings: validators.slice(0, limit),
    loading,
    error,
    isConnected,
    refresh
  }
}

// Hook for validator comparison
export function useValidatorComparison(addresses: string[]) {
  const { validators, loading, error, isConnected, refresh } = useValidatorPerformance({
    addresses,
    includeInactive: true
  })

  const compareValidators = useCallback(() => {
    const validatorsToCompare = addresses.map(addr => 
      validators.find(v => v.address === addr)
    ).filter(Boolean) as ValidatorPerformance[]

    return {
      validators: validatorsToCompare,
      metrics: {
        avgApy: validatorsToCompare.reduce((sum, v) => sum + v.apy, 0) / validatorsToCompare.length,
        avgCommission: validatorsToCompare.reduce((sum, v) => sum + v.commission, 0) / validatorsToCompare.length,
        avgUptime: validatorsToCompare.reduce((sum, v) => sum + v.uptime, 0) / validatorsToCompare.length,
        totalStake: validatorsToCompare.reduce((sum, v) => sum + v.stakeAmount, 0),
        jitoCount: validatorsToCompare.filter(v => v.isJitoEnabled).length
      }
    }
  }, [addresses, validators])

  return {
    ...compareValidators(),
    loading,
    error,
    isConnected,
    refresh
  }
}