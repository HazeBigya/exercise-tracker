import { memo } from 'react'
import { LogIn, LogOut, Sparkles } from 'lucide-react'
import GlassButton from '../ui/GlassButton'
import GlassCard from '../ui/GlassCard'

function Header({ session, authLoading, authMessage, onSignIn, onSignOut }) {
  const authSummary = session?.user?.email ?? (authLoading ? 'Checking session…' : authMessage)

  return (
    <GlassCard as="header" className="app-header">
      <div className="brand-block">
        <div className="brand-icon" aria-hidden="true">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="brand-kicker">Liquid Glass HIIT</p>
          <h2 className="brand-title">Train in guest mode or sync with Google.</h2>
        </div>
      </div>

      <div className="auth-actions">
        <div className="auth-meta">
          <span className="auth-badge">{session ? 'Signed in' : 'Guest mode'}</span>
          <span className="auth-email">{authSummary}</span>
        </div>

        {session ? (
          <GlassButton variant="secondary" className="auth-btn" Icon={LogOut} onClick={onSignOut}>
            Sign Out
          </GlassButton>
        ) : (
          <GlassButton variant="primary" className="auth-btn btn-google" Icon={LogIn} onClick={onSignIn}>
            Sign in with Google
          </GlassButton>
        )}
      </div>
    </GlassCard>
  )
}

export default memo(Header)
