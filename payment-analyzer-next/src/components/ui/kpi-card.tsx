import type { LucideIcon } from 'lucide-react'
import { isValidElement } from 'react'

import { cn } from '@/lib/utils'

export type KPICardTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary'

const toneStyles: Record<KPICardTone, {
  container: string
  gradient: string
  accent: string
  label: string
  value: string
  description: string
  trend: string
  icon: string
}> = {
  neutral: {
    container: 'border border-slate-200 bg-white',
    gradient: 'from-white via-white to-slate-50',
    accent: 'bg-slate-300',
    label: 'text-slate-500',
    value: 'text-slate-900',
    description: 'text-slate-500',
    trend: 'text-slate-500',
    icon: 'bg-slate-100 text-slate-600',
  },
  success: {
    container: 'border border-emerald-200 bg-emerald-50/60',
    gradient: 'from-emerald-50 via-white to-emerald-100',
    accent: 'bg-emerald-500',
    label: 'text-emerald-600',
    value: 'text-emerald-700',
    description: 'text-emerald-600',
    trend: 'text-emerald-600',
    icon: 'bg-emerald-100 text-emerald-600',
  },
  warning: {
    container: 'border border-amber-200 bg-amber-50/70',
    gradient: 'from-amber-50 via-white to-amber-100',
    accent: 'bg-amber-500',
    label: 'text-amber-600',
    value: 'text-amber-700',
    description: 'text-amber-600',
    trend: 'text-amber-600',
    icon: 'bg-amber-100 text-amber-600',
  },
  info: {
    container: 'border border-blue-200 bg-blue-50/70',
    gradient: 'from-blue-50 via-white to-blue-100',
    accent: 'bg-blue-500',
    label: 'text-blue-600',
    value: 'text-blue-700',
    description: 'text-blue-600',
    trend: 'text-blue-600',
    icon: 'bg-blue-100 text-blue-600',
  },
  primary: {
    container: 'border border-indigo-200 bg-indigo-50/70',
    gradient: 'from-indigo-50 via-white to-indigo-100',
    accent: 'bg-indigo-500',
    label: 'text-indigo-600',
    value: 'text-indigo-700',
    description: 'text-indigo-600',
    trend: 'text-indigo-600',
    icon: 'bg-indigo-100 text-indigo-600',
  },
  danger: {
    container: 'border border-rose-200 bg-rose-50/70',
    gradient: 'from-rose-50 via-white to-rose-100',
    accent: 'bg-rose-500',
    label: 'text-rose-600',
    value: 'text-rose-700',
    description: 'text-rose-600',
    trend: 'text-rose-600',
    icon: 'bg-rose-100 text-rose-600',
  },
}



export type TrendDirection = 'up' | 'down' | 'flat'

export interface KPICardProps {
  readonly label: React.ReactNode
  readonly value: React.ReactNode
  readonly description?: React.ReactNode
  readonly tone?: KPICardTone
  readonly icon?: LucideIcon | React.ReactElement
  readonly iconBackgroundClassName?: string
  readonly className?: string
  readonly children?: React.ReactNode
  readonly trend?: React.ReactNode
  readonly trendDirection?: TrendDirection
}

export function KPICard({
  label,
  value,
  description,
  tone = 'neutral',
  icon,
  iconBackgroundClassName,
  className,
  children,
  trend,
  trendDirection,
}: KPICardProps) {
  const toneStyle = toneStyles[tone]

  let iconNode: React.ReactNode = null
  if (icon) {
    if (isValidElement(icon)) {
      iconNode = icon
    } else {
      const IconComponent = icon
      iconNode = <IconComponent className="h-5 w-5" />
    }
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        toneStyle.container,
        toneStyle.gradient,
        className,
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1 rounded-r-full', toneStyle.accent, 'opacity-80')} />
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute h-24 w-24 -right-12 -top-12 rounded-full bg-white/20 blur-2xl transition-opacity group-hover:opacity-80" />
      </div>

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className={cn('text-xs font-semibold uppercase tracking-wide', toneStyle.label)}>{label}</div>
          <div className={cn('text-2xl font-bold tracking-tight', toneStyle.value)}>{value}</div>
          {description ? (
            <div className={cn('text-xs font-medium', toneStyle.description)}>{description}</div>
          ) : null}
          {trend ? (
            <div className={cn('text-xs font-medium flex items-center gap-1', toneStyle.trend)}>
              {trendDirection === 'up' && '↗'}
              {trendDirection === 'down' && '↘'}
              {trendDirection === 'flat' && '→'}
              {trend}
            </div>
          ) : null}
        </div>

        {iconNode ? (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5',
              iconBackgroundClassName ?? toneStyle.icon,
            )}
          >
            {iconNode}
          </div>
        ) : null}
      </div>

      {children ? <div className="relative mt-4 space-y-2 text-xs text-slate-500">{children}</div> : null}
    </div>
  )
}
