import { ChevronDown, LockKeyhole, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const fields = [
  { name: 'workTime', label: 'Work Time', suffix: 'sec', min: 1, step: 5 },
  { name: 'restTime', label: 'Rest Time', suffix: 'sec', min: 0, step: 5 },
  { name: 'roundsPerSet', label: 'Rounds per Set', suffix: 'rounds', min: 1, step: 1 },
  { name: 'setRest', label: 'Set Rest', suffix: 'sec', min: 0, step: 5 },
  { name: 'totalSets', label: 'Total Sets', suffix: 'sets', min: 1, step: 1 },
]

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function calculateTotalDuration(settings) {
  const workTime = Math.max(1, Number(settings.workTime ?? 0) || 0)
  const restTime = Math.max(0, Number(settings.restTime ?? 0) || 0)
  const roundsPerSet = Math.max(1, Number(settings.roundsPerSet ?? 0) || 1)
  const setRest = Math.max(0, Number(settings.setRest ?? 0) || 0)
  const totalSets = Math.max(1, Number(settings.totalSets ?? 0) || 1)

  return Math.max(
    0,
    ((workTime + restTime) * roundsPerSet - restTime + setRest) * totalSets - setRest,
  )
}

function SettingsPanel({ settings, session, onSettingChange, onLoadSettings, onStart }) {
  const [routineName, setRoutineName] = useState('')
  const [savedRoutines, setSavedRoutines] = useState([])
  const [selectedRoutineId, setSelectedRoutineId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState(
    session
      ? 'Save this setup or load one of your existing routines.'
      : 'Log in to save your routines.',
  )

  const totalDuration = useMemo(() => calculateTotalDuration(settings), [settings])

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

  const handleChange = (event) => {
    const { name, value } = event.target
    const nextValue = Number.parseInt(value || '0', 10)

    onSettingChange(name, Number.isNaN(nextValue) ? 0 : nextValue)
  }

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

    const nextRoutine = savedRoutines.find((routine) => String(routine.id) === nextRoutineId)

    if (!nextRoutine) {
      return
    }

    try {
      const nextConfig =
        typeof nextRoutine.config === 'string'
          ? JSON.parse(nextRoutine.config)
          : nextRoutine.config ?? {}

      onLoadSettings(nextConfig)
      setRoutineName(nextRoutine.name ?? '')
      setStatusMessage(`Loaded "${nextRoutine.name}".`)
    } catch {
      setStatusMessage('This routine could not be loaded because its config is invalid.')
    }
  }

  return (
    <div className="glass-content settings-view">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" aria-hidden="true" />
          Workout settings
        </div>

        <h1>Shape every interval before the countdown begins.</h1>
        <p>
          Adjust your work and recovery blocks, see the total workout time update
          instantly, and jump into the timer when the plan feels right.
        </p>

        <div className="settings-grid">
          {fields.map((field) => (
            <label
              key={field.name}
              className="field-card rounded-2xl border border-white/10 bg-white/10 shadow-[0_16px_40px_rgba(7,17,31,0.22)] backdrop-blur-xl"
            >
              <span className="field-label">{field.label}</span>
              <div className="input-shell bg-white/5">
                <input
                  className="glass-input"
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  step={field.step}
                  name={field.name}
                  value={settings[field.name]}
                  onChange={handleChange}
                />
                <span className="field-suffix">{field.suffix}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="preview-stack">
        <article className="preview-card settings-summary-card rounded-[24px] border border-white/10 bg-white/10 shadow-[0_20px_60px_rgba(7,17,31,0.28)] backdrop-blur-xl">
          <p className="mini-label">Workout summary</p>

          <div className="settings-total">
            <span>Total workout time</span>
            <strong>{formatDuration(totalDuration)}</strong>
          </div>

          <ul className="preview-list">
            <li className="preview-item">
              <span>Intervals</span>
              <strong>
                {settings.workTime}s / {settings.restTime}s
              </strong>
            </li>
            <li className="preview-item">
              <span>Rounds per set</span>
              <strong>{settings.roundsPerSet}</strong>
            </li>
            <li className="preview-item">
              <span>Set rest • Total sets</span>
              <strong>
                {settings.setRest}s • {settings.totalSets}
              </strong>
            </li>
          </ul>

          {session ? (
            <div className="grid gap-3">
              <label className="field-card rounded-2xl border border-white/10 bg-white/10 shadow-[0_16px_40px_rgba(7,17,31,0.18)] backdrop-blur-xl">
                <span className="field-label">Routine Name</span>
                <div className="input-shell bg-white/5">
                  <input
                    className="glass-input"
                    type="text"
                    value={routineName}
                    onChange={(event) => setRoutineName(event.target.value)}
                    placeholder="Morning intervals"
                  />
                </div>
              </label>

              <button
                type="button"
                className="btn btn-secondary auth-btn"
                onClick={handleSaveRoutine}
                disabled={isSaving}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving…' : 'Save Routine'}</span>
              </button>

              <label className="field-card rounded-2xl border border-white/10 bg-white/10 shadow-[0_16px_40px_rgba(7,17,31,0.18)] backdrop-blur-xl">
                <span className="field-label">Load Previous Routine</span>
                <div className="input-shell bg-white/5">
                  <select
                    className="glass-input glass-select"
                    value={selectedRoutineId}
                    onChange={handleLoadRoutine}
                  >
                    <option value="">Select a routine</option>
                    {savedRoutines.map((routine) => (
                      <option key={routine.id} value={routine.id}>
                        {routine.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="field-suffix" aria-hidden="true" />
                </div>
              </label>
            </div>
          ) : (
            <div className="field-card rounded-2xl border border-dashed border-white/10 bg-white/5 shadow-[0_16px_40px_rgba(7,17,31,0.18)] backdrop-blur-xl">
              <span className="field-label">Saved routines</span>
              <button type="button" className="btn btn-secondary auth-btn" disabled>
                <LockKeyhole size={16} />
                <span>Log in to save your routines</span>
              </button>
            </div>
          )}

          <p className="mini-copy">{statusMessage}</p>

          <button
            type="button"
            className="btn btn-primary settings-start text-base font-semibold"
            onClick={() => onStart(settings)}
          >
            Start Workout
          </button>
        </article>

        <article className="preview-card preview-card--muted">
          <p className="mini-label">Time formula</p>
          <p className="mini-copy">
            Total time = ((Work + Rest) × Rounds - Rest + Set Rest) × Total Sets - Set Rest
          </p>
        </article>
      </div>
    </div>
  )
}

export default SettingsPanel
