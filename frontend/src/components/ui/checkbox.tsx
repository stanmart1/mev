import * as React from "react"
import { Check } from "lucide-react"

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={`h-4 w-4 rounded-sm border border-slate-200 bg-white flex items-center justify-center transition-colors ${
            checked
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'hover:border-slate-300'
          } ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${className || ''}`}
          onClick={() => !disabled && onCheckedChange?.(!checked)}
        >
          {checked && <Check className="h-3 w-3" />}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }