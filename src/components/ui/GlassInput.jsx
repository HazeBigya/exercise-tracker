import { memo } from 'react'

function GlassInput({
  label,
  as = 'input',
  suffix,
  className = '',
  inputClassName = '',
  children,
  ...props
}) {
  const Component = as
  const fieldClasses = ['field-card', className].filter(Boolean).join(' ')
  const controlClasses = ['glass-input', as === 'select' ? 'glass-select' : '', inputClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={fieldClasses}>
      {label ? <span className="field-label">{label}</span> : null}
      <div className="input-shell">
        <Component className={controlClasses} {...props}>
          {children}
        </Component>
        {suffix ? <span className="field-suffix">{suffix}</span> : null}
      </div>
    </label>
  )
}

export default memo(GlassInput)
