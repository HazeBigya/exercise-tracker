import { memo } from 'react'
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

type GlassCardProps<T extends ElementType = 'div'> = {
  as?: T
  muted?: boolean
  className?: string
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

function GlassCard<T extends ElementType = 'div'>({
  as,
  muted = false,
  className,
  children,
  ...props
}: GlassCardProps<T>) {
  const Component = as ?? 'div'
  const classes = ['preview-card', muted ? 'preview-card--muted' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  )
}

export default memo(GlassCard) as typeof GlassCard
