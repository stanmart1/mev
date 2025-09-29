import { create } from 'zustand'
import { mevAPI } from '../services/mevApi'
import type { MEVOpportunity, MEVStatistics, MEVFilters } from '../services/mevApi'

interface MEVStore {
  // State
  opportunities: MEVOpportunity[]
  statistics: MEVStatistics | null
  isLoading: boolean
  error: string | null
  lastUpdate: Date | null
  
  // Live data state
  isLiveMode: boolean
  newOpportunityCount: number
  
  // Filters
  activeFilters: MEVFilters
  
  // Actions
  setOpportunities: (opportunities: MEVOpportunity[]) => void
  addOpportunity: (opportunity: MEVOpportunity) => void
  updateOpportunity: (id: string, updates: Partial<MEVOpportunity>) => void
  removeOpportunity: (id: string) => void
  setStatistics: (stats: MEVStatistics) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: MEVFilters) => void
  clearNewCount: () => void
  
  // API Actions
  fetchOpportunities: (filters?: MEVFilters) => Promise<void>
  fetchStatistics: (timeframe?: string) => Promise<void>
  refreshData: () => Promise<void>
}

export const useMEVStore = create<MEVStore>((set, get) => ({
  // Initial state
  opportunities: [],
  statistics: null,
  isLoading: false,
  error: null,
  lastUpdate: null,
  
  isLiveMode: true,
  newOpportunityCount: 0,
  
  activeFilters: {
    limit: 50,
    offset: 0
  },
  
  // State setters
  setOpportunities: (opportunities) => {
    set({ 
      opportunities, 
      lastUpdate: new Date(),
      error: null 
    })
  },
  
  addOpportunity: (opportunity) => {
    const { opportunities, isLiveMode } = get()
    const updated = [opportunity, ...opportunities].slice(0, 100) // Keep max 100
    
    set({ 
      opportunities: updated,
      lastUpdate: new Date(),
      newOpportunityCount: isLiveMode ? get().newOpportunityCount + 1 : 0
    })
  },
  
  updateOpportunity: (id, updates) => {
    const opportunities = get().opportunities.map(opp => 
      opp.id === id ? { ...opp, ...updates } : opp
    )
    set({ 
      opportunities,
      lastUpdate: new Date()
    })
  },
  
  removeOpportunity: (id) => {
    const opportunities = get().opportunities.filter(opp => opp.id !== id)
    set({ opportunities })
  },
  
  setStatistics: (statistics) => {
    set({ statistics })
  },
  
  setLoading: (isLoading) => {
    set({ isLoading })
  },
  
  setError: (error) => {
    set({ error })
  },
  
  setFilters: (filters) => {
    set({ activeFilters: { ...get().activeFilters, ...filters } })
  },
  
  clearNewCount: () => {
    set({ newOpportunityCount: 0 })
  },
  
  // API actions
  fetchOpportunities: async (filters) => {
    const finalFilters = filters || get().activeFilters
    set({ isLoading: true, error: null })
    
    try {
      const response = await mevAPI.getLiveOpportunities(finalFilters)
      set({ 
        opportunities: response.data,
        isLoading: false,
        lastUpdate: new Date()
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch opportunities',
        isLoading: false
      })
    }
  },
  
  fetchStatistics: async (timeframe = '24h') => {
    try {
      const response = await mevAPI.getMEVStatistics(timeframe)
      set({ statistics: response.data })
    } catch (error) {
      console.error('Failed to fetch MEV statistics:', error)
    }
  },
  
  refreshData: async () => {
    const { fetchOpportunities, fetchStatistics } = get()
    await Promise.all([
      fetchOpportunities(),
      fetchStatistics()
    ])
  }
}))

// Auto-clear new count after 3 seconds
let clearTimeoutId: number | null = null
useMEVStore.subscribe((state, prevState) => {
  if (state.newOpportunityCount > prevState.newOpportunityCount && state.newOpportunityCount > 0) {
    if (clearTimeoutId) clearTimeout(clearTimeoutId)
    clearTimeoutId = setTimeout(() => {
      useMEVStore.getState().clearNewCount()
    }, 3000)
  }
})