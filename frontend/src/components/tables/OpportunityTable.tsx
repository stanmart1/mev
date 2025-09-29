import React, { useMemo } from 'react'
import { DataTableAdvanced } from '../ui/data-table-advanced'
import type { Column } from '../ui/data-table-advanced'
import type { MEVOpportunity } from '../../services/mevApi'
import { formatDistanceToNow } from 'date-fns'

interface OpportunityTableProps {
  opportunities: MEVOpportunity[]
  loading?: boolean
  onOpportunityClick?: (opportunity: MEVOpportunity) => void
  onExecuteOpportunity?: (opportunity: MEVOpportunity) => void
  className?: string
}

export function OpportunityTable({
  opportunities,
  loading = false,
  onOpportunityClick,
  onExecuteOpportunity,
  className
}: OpportunityTableProps) {
  
  const columns: Column<MEVOpportunity>[] = useMemo(() => [
    {
      key: 'opportunity_type',
      title: 'Type',
      sortable: true,
      filterable: true,
      render: (type: string) => (
        <span className={`badge ${getTypeColor(type)}`}>
          {getTypeIcon(type)}
          {type}
        </span>
      ),
      width: 120
    },
    {
      key: 'token_pair',
      title: 'Token Pair',
      sortable: true,
      filterable: true,
      render: (pair: string) => (
        <span className="font-medium">{pair}</span>
      ),
      width: 140
    },
    {
      key: 'primary_dex',
      title: 'DEX',
      sortable: true,
      filterable: true,
      render: (dex: string, row: MEVOpportunity) => (
        <div>
          <div className="font-medium">{dex}</div>
          {row.secondary_dex && (
            <div className="text-xs text-muted-foreground">
              → {row.secondary_dex}
            </div>
          )}
        </div>
      ),
      width: 150
    },
    {
      key: 'estimated_profit_sol',
      title: 'Profit (SOL)',
      sortable: true,
      align: 'right',
      render: (profit: number) => (
        <span className="font-bold text-green-600">
          +{profit.toFixed(4)}
        </span>
      ),
      width: 120
    },
    {
      key: 'profit_percentage',
      title: 'Profit %',
      sortable: true,
      align: 'right',
      render: (percentage: number) => (
        <span className="font-medium">
          {percentage.toFixed(2)}%
        </span>
      ),
      width: 100
    },
    {
      key: 'execution_risk_score',
      title: 'Risk',
      sortable: true,
      align: 'center',
      render: (risk: number) => (
        <div className="flex items-center justify-center">
          <span className={`font-medium ${getRiskColor(risk)}`}>
            {getRiskLabel(risk)} ({risk}/10)
          </span>
        </div>
      ),
      width: 100
    },
    {
      key: 'confidence_level',
      title: 'Confidence',
      sortable: true,
      align: 'center',
      render: (confidence: number) => (
        <div className="flex items-center justify-center">
          <div className="w-16 bg-secondary rounded-full h-2 mr-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-xs font-medium">{confidence}%</span>
        </div>
      ),
      width: 120
    },
    {
      key: 'competition_level',
      title: 'Competition',
      sortable: true,
      filterable: true,
      render: (level: string) => (
        <span className={`badge ${getCompetitionColor(level)}`}>
          {level}
        </span>
      ),
      width: 110
    },
    {
      key: 'time_to_expiry',
      title: 'Time Left',
      sortable: true,
      align: 'center',
      render: (timeLeft: number) => (
        <span className={timeLeft < 30 ? 'text-red-600 font-medium' : ''}>
          {timeLeft}s
        </span>
      ),
      width: 90
    },
    {
      key: 'detection_timestamp',
      title: 'Detected',
      sortable: true,
      render: (timestamp: string) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
        </span>
      ),
      width: 120
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, opportunity: MEVOpportunity) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExecuteOpportunity?.(opportunity)
            }}
            disabled={opportunity.status !== 'active' || opportunity.time_to_expiry < 5}
            className="button button-primary button-sm"
          >
            Execute
          </button>
        </div>
      ),
      width: 100
    }
  ], [onExecuteOpportunity])

  return (
    <DataTableAdvanced
      data={opportunities}
      columns={columns}
      loading={loading}
      onRowClick={onOpportunityClick}
      className={`opportunity-table ${className || ''}`}
      emptyMessage="No MEV opportunities found"
      striped
      hover
      showFilters
      rowKey="id"
    />
  )
}

// Helper functions for styling
function getTypeIcon(type: string): string {
  switch (type) {
    case 'arbitrage': return '⚡ '
    case 'liquidation': return '🎯 '
    case 'sandwich': return '🥪 '
    case 'flashloan': return '⚡ '
    default: return '💰 '
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'arbitrage': return 'badge-primary'
    case 'liquidation': return 'badge-destructive'
    case 'sandwich': return 'badge-secondary'
    case 'flashloan': return 'badge-outline'
    default: return 'badge-outline'
  }
}

function getRiskColor(score: number): string {
  if (score <= 3) return 'text-green-600'
  if (score <= 6) return 'text-yellow-600'
  return 'text-red-600'
}

function getRiskLabel(score: number): string {
  if (score <= 3) return 'Low'
  if (score <= 6) return 'Medium'
  return 'High'
}

function getCompetitionColor(level: string): string {
  switch (level) {
    case 'low': return 'badge-secondary text-green-600'
    case 'medium': return 'badge-secondary text-yellow-600'
    case 'high': return 'badge-secondary text-red-600'
    default: return 'badge-outline'
  }
}