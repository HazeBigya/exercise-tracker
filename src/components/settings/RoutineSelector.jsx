import { ChevronDown, LockKeyhole, Save } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import GlassButton from '../ui/GlassButton'
import GlassCard from '../ui/GlassCard'
import GlassInput from '../ui/GlassInput'

function RoutineSelector({ session, settings, onLoadSettings }) {
  const [routineName, setRoutineName] = useState('')
  const [savedRoutines, setSavedRoutines] = useState([])
  const [selectedRoutineId, setSelectedRoutineId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState(
    session
      ? 'Save this setup or load one of your existing routines.'
      : 'Log in to save your routines.',
  )

  useEffect(() => {
    let cancelled = false

    async function fetchRoutines() {
      if (!session || !supabase) {
        return
      }

      const { data, error } = await supabase
        .from('routines')
        .select('id, name, config')
        .eq('user_id', session.user.id)
        .order('id', { ascending: false })

      if (cancelled) {
        return
      }

      if (error) {
        setStatusMessage(error.message)
        return
      }

      setSavedRoutines(data ?? [])
      setStatusMessage(
        data?.length
          ? 'Load one of your saved routines or save a new variation.'
          : 'No saved routines yet — save your first one.',
      )
    }

    fetchRoutines()

    return () => {
      cancelled = true
    }
  }, [session])

  const handleSaveRoutine = async () => {
    if (!session || !supabase) {
      return
    }

    const nextName = routineName.trim() || `Workout ${new Date().toLocaleDateString()}`
    setIsSaving(true)

    const { data, error } = await supabase
      .from('routines')
      .insert({
        user_id: session.user.id,
        name: nextName,
        config: settings,
      })
      .select('id, name, config')
      .single()

    setIsSaving(false)

    if (error) {
      setStatusMessage(error.message)
      return
    }

    setSavedRoutines((current) => [data, ...current])
    setSelectedRoutineId(String(data.id))
    setRoutineName(data.name)
    setStatusMessage(`Saved "${data.name}".`)
  }

  const handleLoadRoutine = (event) => {
    const nextRoutineId = event.target.value
    setSelectedRoutineId(nextRoutineId)

    const selectedRoutine = savedRoutines.find(
      (routine) => String(routine.id) === nextRoutineId,
    )

    if (!selectedRoutine) {
      return
    }

    const nextConfig =
      typeof selectedRoutine.config === 'string'
        ? JSON.parse(selectedRoutine.config)
        : selectedRoutine.config ?? {}

    onLoadSettings(nextConfig)
    setRoutineName(selectedRoutine.name ?? '')
    setStatusMessage(`Loaded "${selectedRoutine.name}".`)
  }

  if (!session) {
    return (
      <GlassCard muted className="routine-selector routine-selector--locked">
        <span className="field-label">Saved routines</span>
        <GlassButton variant="secondary" className="auth-btn" disabled Icon={LockKeyhole}>
          Log in to save your routines
        </GlassButton>
        <p className="mini-copy routine-selector__status">{statusMessage}</p>
      </GlassCard>
    )
  }

  return (
    <div className="routine-selector">
      <GlassInput
        label="Routine Name"
        type="text"
        value={routineName}
        placeholder="Morning intervals"
        onChange={(event) => setRoutineName(event.target.value)}
      />

      <GlassButton
        variant="secondary"
        className="auth-btn"
        Icon={Save}
        onClick={handleSaveRoutine}
        disabled={isSaving}
      >
        {isSaving ? 'Saving…' : 'Save Routine'}
      </GlassButton>

      <GlassInput
        as="select"
        label="Load Previous Routine"
        value={selectedRoutineId}
        onChange={handleLoadRoutine}
        suffix={<ChevronDown size={16} aria-hidden="true" />}
      >
        <option value="">Select a routine</option>
        {savedRoutines.map((routine) => (
          <option key={routine.id} value={routine.id}>
            {routine.name}
          </option>
        ))}
      </GlassInput>

      <p className="mini-copy routine-selector__status">{statusMessage}</p>
    </div>
  )
}

export default memo(RoutineSelector)
