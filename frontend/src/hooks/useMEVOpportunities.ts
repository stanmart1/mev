import { useState, useEffect, useCallback } from 'react'
import { useMEVStore } from '@/stores/mevStore'
import { useWebSocket } from './useWebSocket'
import type { MEVOpportunity, MEVFilters } from '@/services/mevApi'

interface UseMEVOpportunitiesOptions {
  filters?: {
    type?: string[]
    minProfit?: number
    maxRisk?: number
  }
  maxOpportunities?: number
  autoRemoveExpired?: boolean
  notifyOnNew?: boolean
}

interface UseMEVOpportunitiesReturn {
  opportunities: MEVOpportunity[]
  loading: boolean
  error: string | null
  isConnected: boolean
  lastUpdate: Date | null
  newOpportunityCount: number
  totalCount: number
  refresh: () => Promise<void>
  clearNewCount: () => void
}

export function useMEVOpportunities(
  options: UseMEVOpportunitiesOptions = {}
): UseMEVOpportunitiesReturn {
  const {
    filters = {},
    maxOpportunities = 100,
    autoRemoveExpired = true,
    notifyOnNew = false
  } = options

  const {
    opportunities,
    isLoading,
    error,
    lastUpdate,
    newOpportunityCount,
    fetchOpportunities,
    clearNewCount,
    addOpportunity,
    removeOpportunity
  } = useMEVStore()

  const { isConnected, lastMessage } = useWebSocket()
  const [filteredOpportunities, setFilteredOpportunities] = useState<MEVOpportunity[]>([])

  // Apply filters to opportunities
  const applyFilters = useCallback((opps: MEVOpportunity[]) => {
    let filtered = [...opps]

    // Type filter
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(opp => 
        filters.type!.includes(opp.opportunity_type)
      )
    }

    // Minimum profit filter
    if (filters.minProfit !== undefined) {
      filtered = filtered.filter(opp => 
        opp.estimated_profit_sol >= filters.minProfit!
      )
    }

    // Maximum risk filter
    if (filters.maxRisk !== undefined) {
      filtered = filtered.filter(opp => 
        opp.execution_risk_score <= filters.maxRisk!
      )
    }

    // Limit results
    filtered = filtered.slice(0, maxOpportunities)

    return filtered
  }, [filters, maxOpportunities])

  // Update filtered opportunities when opportunities or filters change
  useEffect(() => {
    const filtered = applyFilters(opportunities)
    setFilteredOpportunities(filtered)
  }, [opportunities, applyFilters])

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'opportunity') {
      const opportunity = lastMessage.data as MEVOpportunity
      
      // Add new opportunity if it matches filters
      const filtered = applyFilters([opportunity])
      if (filtered.length > 0) {
        addOpportunity(opportunity)
        
        // Notify if enabled
        if (notifyOnNew && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('New MEV Opportunity', {
            body: `${opportunity.opportunity_type} opportunity: ${opportunity.estimated_profit_sol.toFixed(4)} SOL profit`,
            icon: '/favicon.ico'
          })
        }
      }
    }
  }, [lastMessage, addOpportunity, applyFilters, notifyOnNew])

  // Auto-remove expired opportunities
  useEffect(() => {
    if (!autoRemoveExpired) return

    const interval = setInterval(() => {
      const now = Date.now()
      opportunities.forEach(opp => {
        const expiry = new Date(opp.detection_timestamp).getTime() + (opp.time_to_expiry * 1000)
        if (now > expiry && opp.status === 'active') {
          removeOpportunity(opp.id)
        }
      })
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [opportunities, autoRemoveExpired, removeOpportunity])

  // Refresh function
  const refresh = useCallback(async () => {
    const apiFilters: MEVFilters = {
      limit: maxOpportunities,
      type: filters.type,
      minProfit: filters.minProfit,
      maxRisk: filters.maxRisk
    }
    
    await fetchOpportunities(apiFilters)
  }, [fetchOpportunities, maxOpportunities, filters])

  // Initial fetch
  useEffect(() => {
    refresh()
  }, [refresh])

  // Request notification permission if needed
  useEffect(() => {
    if (notifyOnNew && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [notifyOnNew])

  return {
    opportunities: filteredOpportunities,
    loading: isLoading,
    error,
    isConnected,
    lastUpdate,
    newOpportunityCount,
    totalCount: opportunities.length,
    refresh,
    clearNewCount
  }
}

// Hook for subscribing to specific opportunity types
export function useMEVOpportunityType(type: 'arbitrage' | 'liquidation' | 'sandwich' | 'flashloan') {
  const allOpportunities = useMEVOpportunities({
    filters: { type: [type] }
  })

  return {
    ...allOpportunities,
    opportunities: allOpportunities.opportunities.filter(opp => opp.opportunity_type === type)
  }
}

// Hook for high-value opportunities
export function useHighValueOpportunities(minProfit: number = 1.0) {
  return useMEVOpportunities({
    filters: { minProfit },
    notifyOnNew: true
  })
}