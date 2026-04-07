import { memo } from 'react'
import type { ButtonHTMLAttributes, FC } from 'react'
import type { LucideIcon } from 'lucide-react'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  Icon?: LucideIcon
}

const GlassButton: FC<GlassButtonProps> = ({
  variant = 'secondary',
  type = 'button',
  Icon,
  className,
  children,
  ...props
}) => {
  const classes = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  )
}

export default memo(GlassButton)
