import { memo } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

type SharedProps = {
  label?: string
  suffix?: ReactNode
  className?: string
  inputClassName?: string
}

type InputProps = SharedProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input'
  }

type SelectProps = SharedProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    as: 'select'
    children: ReactNode
  }

type GlassInputProps = InputProps | SelectProps

function GlassInput(props: GlassInputProps) {
  const { label, suffix, className, inputClassName } = props
  const fieldClasses = ['field-card', className].filter(Boolean).join(' ')

  if (props.as === 'select') {
    const { as, children, ...selectProps } = props

    return (
      <label className={fieldClasses}>
        {label ? <span className="field-label">{label}</span> : null}
        <div className="input-shell">
          <select
            className={['glass-input', 'glass-select', inputClassName].filter(Boolean).join(' ')}
            {...selectProps}
          >
            {children}
          </select>
          {suffix ? <span className="field-suffix">{suffix}</span> : null}
        </div>
      </label>
    )
  }

  const { as, ...inputProps } = props

  return (
    <label className={fieldClasses}>
      {label ? <span className="field-label">{label}</span> : null}
      <div className="input-shell">
        <input
          className={['glass-input', inputClassName].filter(Boolean).join(' ')}
          {...inputProps}
        />
        {suffix ? <span className="field-suffix">{suffix}</span> : null}
      </div>
    </label>
  )
}

export default memo(GlassInput)
