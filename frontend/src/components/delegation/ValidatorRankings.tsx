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
  Filter,
  RefreshCw
} from 'lucide-react';

interface ValidatorMetrics {
  pubkey: string;
  name: string;
  totalStake: number;
  delegatedStake: number;
  commission: number;
  apy: number;
  mevApy: number;
  uptime: number;
  mevEarnings: number;
  jitoEnabled: boolean;
  epochsActive: number;
  riskScore: number;
  performanceScore: number;
  rank: number;
  delegatorCount: number;
  averageStakePerDelegator: number;
  votingCredits: number;
  skipRate: number;
  lastEpochCredits: number;
  dataCenter: string;
  version: string;
  delinquent: boolean;
}

interface ValidatorRankingsProps {
  className?: string;
  onValidatorSelect?: (validator: ValidatorMetrics) => void;
  maxResults?: number;
}

export const ValidatorRankings: React.FC<ValidatorRankingsProps> = ({
  className = '',
  onValidatorSelect,
  maxResults = 100
}) => {
  const [validators, setValidators] = useState<ValidatorMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const { isConnected, subscribe, send } = useWebSocket();

  const getRiskBadge = (riskScore: number) => {
    if (riskScore <= 30) return { label: 'Low Risk', color: 'bg-green-500' };
    if (riskScore <= 60) return { label: 'Medium Risk', color: 'bg-yellow-500' };
    return { label: 'High Risk', color: 'bg-red-500' };
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 75) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 60) return { label: 'Average', color: 'bg-yellow-500' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  const formatSOL = (amount: number): string => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M SOL`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K SOL`;
    return `${amount.toFixed(2)} SOL`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const columns: ColumnDef<ValidatorMetrics>[] = useMemo(() => [
    {
      accessorKey: 'rank',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0"
        >
          Rank
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
          <div className="flex items-center gap-2">
            {row.original.jitoEnabled && (
              <Badge variant="outline" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Jito
              </Badge>
            )}
            {row.original.delinquent && (
              <Badge variant="destructive" className="text-xs">
                Delinquent
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'apy',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0"
        >
          APY
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <div className="font-bold text-green-600">
            {formatPercentage(row.getValue('apy'))}
          </div>
          <div className="text-xs text-gray-500">
            Commission: {formatPercentage(row.original.commission)}
          </div>
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
          Total Stake
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <div className="font-medium">{formatSOL(row.getValue('totalStake'))}</div>
          <div className="text-xs text-gray-500">
            Delegated: {formatSOL(row.original.delegatedStake)}
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
              <Badge className={`${badge.color} text-white text-xs`}>
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
      header: 'Risk Assessment',
      cell: ({ row }) => {
        const riskScore = row.getValue('riskScore') as number;
        const badge = getRiskBadge(riskScore);
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{riskScore.toFixed(1)}</span>
              <Badge className={`${badge.color} text-white text-xs`}>
                {badge.label}
              </Badge>
            </div>
            <Progress value={100 - riskScore} className="h-2" />
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {riskScore > 70 && <AlertTriangle className="h-3 w-3 text-red-500" />}
              Skip Rate: {formatPercentage(row.original.skipRate)}
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
        <div className="text-center">
          <div className="font-bold text-purple-600">
            {formatSOL(row.getValue('mevEarnings'))}
          </div>
          <div className="text-xs text-gray-500">
            Last Epoch
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'delegatorCount',
      header: 'Delegators',
      cell: ({ row }) => (
        <div className="text-center">
          <div className="font-medium">{row.getValue('delegatorCount')}</div>
          <div className="text-xs text-gray-500">
            Avg: {formatSOL(row.original.averageStakePerDelegator)}
          </div>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onValidatorSelect?.(row.original)}
          >
            <Star className="h-4 w-4 mr-1" />
            Select
          </Button>
        </div>
      ),
    },
  ], [onValidatorSelect]);

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
      
      const response = await fetch(`/api/validators/rankings?limit=${maxResults}`);
      if (!response.ok) throw new Error('Failed to fetch validator rankings');
      
      const data = await response.json();
      setValidators(data.validators);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidators();
  }, [maxResults]);

  useEffect(() => {
    if (isConnected) {
      const unsubscribe = subscribe('validator_rankings', (data: any) => {
        setValidators(data.validators);
        setLoading(false);
      });
      return unsubscribe;
    }
  }, [isConnected, subscribe]);

  useEffect(() => {
    if (isConnected) {
      send({
        action: 'subscribe',
        channel: 'validator_rankings',
        limit: maxResults
      });
    }
  }, [isConnected, maxResults, send]);

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
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
            <p className="text-red-600 font-medium">Failed to load validator rankings</p>
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
              <Shield className="h-5 w-5" />
              Validator Rankings
            </CardTitle>
            <CardDescription>
              Compare validators by performance, risk, and MEV earnings
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchValidators} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search validators by name or pubkey..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Shield className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-600">
              {validators.length}
            </p>
            <p className="text-xs text-gray-600">Total Validators</p>
          </div>
          
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">
              {validators.length > 0 ? formatPercentage(validators.reduce((sum, v) => sum + v.apy, 0) / validators.length) : '0%'}
            </p>
            <p className="text-xs text-gray-600">Avg APY</p>
          </div>
          
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <DollarSign className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-purple-600">
              {validators.filter(v => v.jitoEnabled).length}
            </p>
            <p className="text-xs text-gray-600">Jito Enabled</p>
          </div>
          
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Users className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-orange-600">
              {validators.length > 0 ? Math.round(validators.reduce((sum, v) => sum + v.delegatorCount, 0) / validators.length) : 0}
            </p>
            <p className="text-xs text-gray-600">Avg Delegators</p>
          </div>
        </div>

        {/* Validator Table */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
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
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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

        {/* Pagination Info */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {table.getRowModel().rows.length} of {validators.length} validators
          </div>
          <div className="text-xs text-gray-400">
            Data updates every 30 seconds
          </div>
        </div>
      </CardContent>
    </Card>
  );
};