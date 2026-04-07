import { createElement, memo } from 'react'

function GlassCard({ as: Component = 'div', muted = false, className = '', children, ...props }) {
  const classes = ['preview-card', muted ? 'preview-card--muted' : '', className]
    .filter(Boolean)
    .join(' ')

  return createElement(Component, { className: classes, ...props }, children)
}

export default memo(GlassCard)
