import Header from './Header'

function MainLayout({ headerProps, children }) {
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
