import { create } from 'zustand'
import { validatorAPI } from '../services/validatorApi'
import type { Validator, ValidatorPerformance, ValidatorFilters, NetworkStatistics } from '../services/validatorApi'

interface ValidatorStore {
  // State
  validators: Validator[]
  selectedValidator: Validator | null
  validatorPerformance: Record<string, ValidatorPerformance[]>
  networkStats: NetworkStatistics | null
  
  // UI state
  isLoading: boolean
  error: string | null
  lastUpdate: Date | null
  
  // Filters and pagination
  activeFilters: ValidatorFilters
  currentCategory: string
  
  // Actions
  setValidators: (validators: Validator[]) => void
  setSelectedValidator: (validator: Validator | null) => void
  setValidatorPerformance: (address: string, performance: ValidatorPerformance[]) => void
  setNetworkStats: (stats: NetworkStatistics) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: ValidatorFilters) => void
  setCategory: (category: string) => void
  
  // API Actions
  fetchValidatorRankings: (category?: string, filters?: ValidatorFilters) => Promise<void>
  fetchValidatorDetails: (address: string) => Promise<void>
  fetchValidatorPerformance: (address: string, params?: any) => Promise<void>
  fetchNetworkStatistics: () => Promise<void>
  searchValidators: (query: string) => Promise<void>
  refreshData: () => Promise<void>
}

export const useValidatorStore = create<ValidatorStore>((set, get) => ({
  // Initial state
  validators: [],
  selectedValidator: null,
  validatorPerformance: {},
  networkStats: null,
  
  isLoading: false,
  error: null,
  lastUpdate: null,
  
  activeFilters: {
    limit: 50,
    offset: 0,
    category: 'overall'
  },
  currentCategory: 'overall',
  
  // State setters
  setValidators: (validators) => {
    set({ 
      validators, 
      lastUpdate: new Date(),
      error: null 
    })
  },
  
  setSelectedValidator: (selectedValidator) => {
    set({ selectedValidator })
  },
  
  setValidatorPerformance: (address, performance) => {
    set((state) => ({
      validatorPerformance: {
        ...state.validatorPerformance,
        [address]: performance
      }
    }))
  },
  
  setNetworkStats: (networkStats) => {
    set({ networkStats })
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
  
  setCategory: (category) => {
    set({ currentCategory: category })
  },
  
  // API actions
  fetchValidatorRankings: async (category, filters) => {
    const finalCategory = category || get().currentCategory
    const finalFilters = filters || get().activeFilters
    
    set({ isLoading: true, error: null })
    
    try {
      const response = finalCategory === 'overall' 
        ? await validatorAPI.getValidatorRankings(finalFilters)
        : await validatorAPI.getValidatorRankingsByCategory(finalCategory, finalFilters)
      
      set({ 
        validators: response.data,
        isLoading: false,
        lastUpdate: new Date()
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch validators',
        isLoading: false
      })
    }
  },
  
  fetchValidatorDetails: async (address) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await validatorAPI.getValidatorDetails(address)
      set({ 
        selectedValidator: response.data,
        isLoading: false
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch validator details',
        isLoading: false
      })
    }
  },
  
  fetchValidatorPerformance: async (address, params) => {
    try {
      const response = await validatorAPI.getValidatorPerformance(address, params)
      get().setValidatorPerformance(address, response.data)
    } catch (error) {
      console.error('Failed to fetch validator performance:', error)
    }
  },
  
  fetchNetworkStatistics: async () => {
    try {
      const response = await validatorAPI.getNetworkStatistics()
      set({ networkStats: response.data })
    } catch (error) {
      console.error('Failed to fetch network statistics:', error)
    }
  },
  
  searchValidators: async (query) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await validatorAPI.searchValidators(query, get().activeFilters)
      set({ 
        validators: response.data,
        isLoading: false,
        lastUpdate: new Date()
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Search failed',
        isLoading: false
      })
    }
  },
  
  refreshData: async () => {
    const { fetchValidatorRankings, fetchNetworkStatistics } = get()
    await Promise.all([
      fetchValidatorRankings(),
      fetchNetworkStatistics()
    ])
  }
}))