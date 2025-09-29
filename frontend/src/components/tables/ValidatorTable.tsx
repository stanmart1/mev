import React, { useMemo } from 'react'
import { DataTableAdvanced } from '../ui/data-table-advanced'
import type { Column } from '../ui/data-table-advanced'
import type { Validator } from '../../services/validatorApi'

interface ValidatorTableProps {
  validators: Validator[]
  loading?: boolean
  onValidatorClick?: (validator: Validator) => void
  onCompareValidator?: (validator: Validator) => void
  selectedValidators?: Validator[]
  showActions?: boolean
  className?: string
}

export function ValidatorTable({
  validators,
  loading = false,
  onValidatorClick,
  onCompareValidator,
  selectedValidators = [],
  showActions = true,
  className
}: ValidatorTableProps) {
  
  const columns: Column<Validator>[] = useMemo(() => [
    {
      key: 'rank',
      title: 'Rank',
      sortable: true,
      align: 'center',
      render: (rank: number) => (
        <span className={`font-bold ${getRankColor(rank)}`}>
          #{rank}
        </span>
      ),
      width: 80
    },
    {
      key: 'validator_address',
      title: 'Validator',
      filterable: true,
      render: (address: string) => (
        <div>
          <div className="font-mono text-sm">{address.slice(0, 8)}...{address.slice(-8)}</div>
        </div>
      ),
      width: 150
    },
    {
      key: 'score',
      title: 'Score',
      sortable: true,
      align: 'center',
      render: (score: number) => (
        <div className="flex items-center justify-center">
          <div className="w-16 bg-secondary rounded-full h-2 mr-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="font-medium">{score.toFixed(1)}</span>
        </div>
      ),
      width: 120
    },
    {
      key: 'stake_amount',
      title: 'Stake',
      sortable: true,
      align: 'right',
      render: (stake: number) => (
        <span className="font-medium">
          {formatStake(stake)}
        </span>
      ),
      width: 120
    },
    {
      key: 'commission_rate',
      title: 'Commission',
      sortable: true,
      align: 'center',
      render: (rate: number) => (
        <span className={getCommissionColor(rate)}>
          {(rate * 100).toFixed(1)}%
        </span>
      ),
      width: 100
    },
    {
      key: 'uptime_percentage',
      title: 'Uptime',
      sortable: true,
      align: 'center',
      render: (uptime: number) => (
        <span className={getUptimeColor(uptime)}>
          {uptime.toFixed(2)}%
        </span>
      ),
      width: 100
    },
    {
      key: 'mev_rewards',
      title: 'MEV Rewards',
      sortable: true,
      align: 'right',
      render: (rewards: number, row: Validator) => (
        <div className="text-right">
          <div className="font-medium text-green-600">
            {rewards.toFixed(2)} SOL
          </div>
          {row.jito_enabled && (
            <div className="text-xs text-blue-600">Jito Enabled</div>
          )}
        </div>
      ),
      width: 130
    },
    {
      key: 'jito_enabled',
      title: 'MEV',
      sortable: true,
      filterable: true,
      align: 'center',
      render: (enabled: boolean) => (
        <span className={`badge ${enabled ? 'badge-primary' : 'badge-outline'}`}>
          {enabled ? '✓ Jito' : '✗ Standard'}
        </span>
      ),
      width: 100
    },
    {
      key: 'overall_rating',
      title: 'Rating',
      sortable: true,
      filterable: true,
      align: 'center',
      render: (rating: string) => (
        <span className={`badge ${getRatingColor(rating)}`}>
          {rating}
        </span>
      ),
      width: 100
    },
    ...(showActions ? [{
      key: 'actions',
      title: 'Actions',
      render: (_: any, validator: Validator) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCompareValidator?.(validator)
            }}
            className="button button-outline button-sm"
          >
            Compare
          </button>
        </div>
      ),
      width: 100
    }] : [])
  ], [onCompareValidator, showActions])

  const expandableConfig = {
    expandedRowRender: (validator: Validator) => (
      <div className="p-4 bg-muted">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Performance Score</div>
            <div className="text-lg font-bold">{validator.performance_score.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Reliability Score</div>
            <div className="text-lg font-bold">{validator.reliability_score.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">MEV Efficiency</div>
            <div className="text-lg font-bold">{validator.mev_efficiency_score.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Decentralization</div>
            <div className="text-lg font-bold">{validator.decentralization_score.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Epoch Rewards</div>
            <div className="text-lg font-bold">{validator.epoch_rewards.toFixed(2)} SOL</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
            <div className="text-sm">{new Date(validator.last_updated).toLocaleString()}</div>
          </div>
        </div>
      </div>
    ),
    rowExpandable: () => true
  }

  return (
    <DataTableAdvanced
      data={validators}
      columns={columns}
      loading={loading}
      onRowClick={onValidatorClick}
      className={`validator-table ${className || ''}`}
      emptyMessage="No validators found"
      striped
      hover
      showFilters
      expandable={expandableConfig}
      rowKey="validator_address"
    />
  )
}

// Helper functions
function getRankColor(rank: number): string {
  if (rank <= 10) return 'text-yellow-600'
  if (rank <= 50) return 'text-blue-600'
  return 'text-muted-foreground'
}

function formatStake(stake: number): string {
  if (stake >= 1000000) {
    return `${(stake / 1000000).toFixed(1)}M SOL`
  }
  if (stake >= 1000) {
    return `${(stake / 1000).toFixed(1)}K SOL`
  }
  return `${stake.toFixed(0)} SOL`
}

function getCommissionColor(rate: number): string {
  if (rate <= 0.05) return 'text-green-600 font-medium'
  if (rate <= 0.10) return 'text-yellow-600 font-medium'
  return 'text-red-600 font-medium'
}

function getUptimeColor(uptime: number): string {
  if (uptime >= 99.5) return 'text-green-600 font-medium'
  if (uptime >= 98.0) return 'text-yellow-600 font-medium'
  return 'text-red-600 font-medium'
}

function getRatingColor(rating: string): string {
  switch (rating) {
    case 'excellent': return 'badge-primary'
    case 'good': return 'badge-secondary text-green-600'
    case 'average': return 'badge-secondary text-yellow-600'
    case 'poor': return 'badge-destructive'
    default: return 'badge-outline'
  }
}