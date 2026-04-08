import { memo } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LogIn, LogOut, Play } from 'lucide-react'
import GlassButton from '../ui/GlassButton'
import GlassCard from '../ui/GlassCard'

export interface HeaderProps {
  session: Session | null
  authLoading: boolean
  authMessage: string
  onSignIn: () => Promise<void>
  onSignOut: () => Promise<void>
}

function Header({ session, authLoading, authMessage, onSignIn, onSignOut }: HeaderProps) {
  const authSummary = session?.user?.email ?? (authLoading ? 'Checking session…' : authMessage)

  return (
    <GlassCard as="header" className="app-header">
      <div className="app-header__inner">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden="true">
            <div className="brand-icon__inner">
              <div className="brand-icon__ring" />
              <Play size={13} className="brand-icon__play" />
              <span className="brand-icon__dot" />
            </div>
          </div>
          <div className="brand-copy">
            <p className="brand-kicker">Exercise Tracker</p>
            <h2 className="brand-title">Track activity, burn calories, and stay on pace with your goals.</h2>
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
      </div>
    </GlassCard>
  )
}

export default memo(Header)
