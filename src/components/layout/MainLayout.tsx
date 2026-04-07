import type { ReactNode } from 'react'
import Header from './Header'
import type { HeaderProps } from './Header'

interface MainLayoutProps {
  headerProps: HeaderProps
  children: ReactNode
}

function MainLayout({ headerProps, children }: MainLayoutProps) {
  return (
    <main className="app-shell">
      <div className="glass-orb glass-orb--one" aria-hidden="true" />
      <div className="glass-orb glass-orb--two" aria-hidden="true" />

      <Header {...headerProps} />
      <section className="glass-panel">{children}</section>
    </main>
  )
}

export default MainLayout
