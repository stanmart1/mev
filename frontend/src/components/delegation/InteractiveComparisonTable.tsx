import React, { useState, useEffect, useMemo } from 'react';
import { 
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  useReactTable,
} from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  TrendingUp, 
  TrendingDown,
  Shield,
  Star,
  AlertTriangle,
  Activity,
  DollarSign,
  Users,
  Search,
  ArrowUpDown,
  BarChart3 as Compare,
  RefreshCw,
  Download,
  X,
  Plus
} from 'lucide-react';

interface ValidatorComparison {
  pubkey: string;
  name: string;
  apy: number;
  mevApy: number;
  totalApy: number;
  commission: number;
  totalStake: number;
  delegatedStake: number;
  uptime: number;
  mevEarnings: number;
  riskScore: number;
  performanceScore: number;
  jitoEnabled: boolean;
  delegatorCount: number;
  skipRate: number;
  lastEpochCredits: number;
  dataCenter: string;
  projectedReturns1Y: number;
  projectedReturns3Y: number;
  consistencyScore: number;
  rank: number;
}

interface InteractiveComparisonTableProps {
  className?: string;
  onSelectionChange?: (selectedValidators: ValidatorComparison[]) => void;
  maxSelections?: number;
}

export const InteractiveComparisonTable: React.FC<InteractiveComparisonTableProps> = ({
  className = '',
  onSelectionChange,
  maxSelections = 5
}) => {
  const [validators, setValidators] = useState<ValidatorComparison[]>([]);
  const [selectedValidators, setSelectedValidators] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const { isConnected, subscribe, send } = useWebSocket();

  const handleValidatorSelection = (pubkey: string, isSelected: boolean) => {
    const newSelection = new Set(selectedValidators);
    
    if (isSelected && newSelection.size < maxSelections) {
      newSelection.add(pubkey);
    } else if (!isSelected) {
      newSelection.delete(pubkey);
    }
    
    setSelectedValidators(newSelection);
    
    const selectedData = validators.filter(v => newSelection.has(v.pubkey));
    onSelectionChange?.(selectedData);
  };

  const clearSelection = () => {
    setSelectedValidators(new Set());
    onSelectionChange?.([]);
  };

  const formatSOL = (amount: number): string => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
    return `${amount.toFixed(2)}`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore <= 30) return { label: 'Low', color: 'bg-green-500' };
    if (riskScore <= 60) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'High', color: 'bg-red-500' };
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 75) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 60) return { label: 'Average', color: 'bg-yellow-500' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  const columns: ColumnDef<ValidatorComparison>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            className="rounded"
          />
          <span className="text-xs">Select</span>
        </div>
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedValidators.has(row.original.pubkey)}
          onChange={(e) => 
            handleValidatorSelection(row.original.pubkey, e.target.checked)
          }
          disabled={!selectedValidators.has(row.original.pubkey) && selectedValidators.size >= maxSelections}
          className="rounded"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'rank',
      header: 'Rank',
      cell: ({ row }) => (
        <div className="font-medium">#{row.getValue('rank')}</div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Validator',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.getValue('name') || 'Unknown'}</div>
          <div className="text-xs text-gray-500 font-mono">
            {row.original.pubkey.slice(0, 8)}...{row.original.pubkey.slice(-8)}
          </div>
          <div className="flex items-center gap-1">
            {row.original.jitoEnabled && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                Jito
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'totalApy',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0"
        >
          Total APY
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-bold text-green-600">
            {formatPercentage(row.getValue('totalApy'))}
          </div>
          <div className="text-xs text-gray-500">
            Staking: {formatPercentage(row.original.apy)}
          </div>
          <div className="text-xs text-purple-600">
            MEV: {formatPercentage(row.original.mevApy)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'commission',
      header: 'Commission',
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {formatPercentage(row.getValue('commission'))}
        </div>
      ),
    },
    {
      accessorKey: 'totalStake',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0"
        >
          Stake
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{formatSOL(row.getValue('totalStake'))} SOL</div>
          <div className="text-xs text-gray-500">
            {row.original.delegatorCount.toLocaleString()} delegators
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'performanceScore',
      header: 'Performance',
      cell: ({ row }) => {
        const score = row.getValue('performanceScore') as number;
        const badge = getPerformanceBadge(score);
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{score.toFixed(1)}</span>
              <Badge className={`${badge.color} text-white text-xs px-2 py-0`}>
                {badge.label}
              </Badge>
            </div>
            <Progress value={score} className="h-2" />
            <div className="text-xs text-gray-500">
              Uptime: {formatPercentage(row.original.uptime)}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'riskScore',
      header: 'Risk',
      cell: ({ row }) => {
        const riskScore = row.getValue('riskScore') as number;
        const badge = getRiskBadge(riskScore);
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{riskScore.toFixed(1)}</span>
              <Badge className={`${badge.color} text-white text-xs px-2 py-0`}>
                {badge.label}
              </Badge>
            </div>
            <Progress value={100 - riskScore} className="h-2" />
            <div className="text-xs text-gray-500">
              Skip: {formatPercentage(row.original.skipRate)}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'mevEarnings',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0"
        >
          MEV Earnings
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center font-bold text-purple-600">
          {formatSOL(row.getValue('mevEarnings'))} SOL
        </div>
      ),
    },
    {
      accessorKey: 'projectedReturns1Y',
      header: '1Y Projection',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-bold text-blue-600">
            {formatPercentage(row.getValue('projectedReturns1Y'))}
          </div>
          <div className="text-xs text-gray-500">
            3Y: {formatPercentage(row.original.projectedReturns3Y)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'consistencyScore',
      header: 'Consistency',
      cell: ({ row }) => {
        const consistency = row.getValue('consistencyScore') as number;
        return (
          <div className="space-y-2">
            <div className="text-sm font-medium">{consistency.toFixed(1)}%</div>
            <Progress value={consistency} className="h-2" />
          </div>
        );
      },
    }
  ], [selectedValidators, maxSelections]);

  const table = useReactTable({
    data: validators,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  const fetchValidators = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/validators/comparison');
      if (!response.ok) throw new Error('Failed to fetch validators');
      
      const data = await response.json();
      setValidators(data.validators);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const exportComparison = () => {
    const selectedData = validators.filter(v => selectedValidators.has(v.pubkey));
    const csvContent = [
      Object.keys(selectedData[0] || {}).join(','),
      ...selectedData.map(validator => Object.values(validator).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'validator-comparison.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchValidators();
  }, []);

  useEffect(() => {
    if (isConnected) {
      const unsubscribe = subscribe('validator_comparison', (data: any) => {
        setValidators(data.validators);
        setLoading(false);
      });
      return unsubscribe;
    }
  }, [isConnected, subscribe]);

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Failed to load comparison data</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchValidators} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Compare className="h-5 w-5" />
              Interactive Validator Comparison
            </CardTitle>
            <CardDescription>
              Select up to {maxSelections} validators to compare side by side
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={exportComparison} 
              variant="outline" 
              size="sm"
              disabled={selectedValidators.size === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={fetchValidators} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Selection Summary */}
        {selectedValidators.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-600" />
                <span className="font-medium">
                  {selectedValidators.size} of {maxSelections} validators selected
                </span>
              </div>
              <Button onClick={clearSelection} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search validators by name or pubkey..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Comparison Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="min-w-32">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      selectedValidators.has(row.original.pubkey) 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                        : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No validators found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {table.getRowModel().rows.length} of {validators.length} validators
            {selectedValidators.size > 0 && ` • ${selectedValidators.size} selected`}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Activity className="h-3 w-3" />
            Real-time data
          </div>
        </div>
      </CardContent>
    </Card>
  );
};