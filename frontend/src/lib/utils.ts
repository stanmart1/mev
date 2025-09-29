import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Formatting utilities
export function formatSOL(value: number): string {
  return `${value.toFixed(4)} SOL`
}

export function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatNumber(value: number): string {
  return value.toLocaleString()
}