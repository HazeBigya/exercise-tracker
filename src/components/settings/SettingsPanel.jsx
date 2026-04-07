import { memo, useCallback, useMemo } from 'react'
import { calculateWorkoutDuration, formatSecondsToClock } from '../../utils/timeHelpers'
import GlassButton from '../ui/GlassButton'
import GlassCard from '../ui/GlassCard'
import GlassInput from '../ui/GlassInput'
import RoutineSelector from './RoutineSelector'

const SETTINGS_FIELDS = [
  { name: 'workTime', label: 'Work Time', suffix: 'sec', min: 1, step: 5 },
  { name: 'restTime', label: 'Rest Time', suffix: 'sec', min: 0, step: 5 },
  { name: 'roundsPerSet', label: 'Rounds per Set', suffix: 'rounds', min: 1, step: 1 },
  { name: 'setRest', label: 'Set Rest', suffix: 'sec', min: 0, step: 5 },
  { name: 'totalSets', label: 'Total Sets', suffix: 'sets', min: 1, step: 1 },
]

function SettingsPanel({ settings, session, onSettingChange, onLoadSettings, onStart }) {
  const totalDuration = useMemo(() => calculateWorkoutDuration(settings), [settings])

  const handleChange = useCallback(
    (event) => {
      const { name, value } = event.target
      const nextValue = Number.parseInt(value || '0', 10)

      onSettingChange(name, Number.isNaN(nextValue) ? 0 : nextValue)
    },
    [onSettingChange],
  )

  return (
    <div className="glass-content settings-view">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" aria-hidden="true" />
          Workout settings
        </div>

        <h1>Shape every interval before the countdown begins.</h1>
        <p>
          Adjust the work and recovery blocks, see the total time update live,
          and launch a workout that is easy to tweak and save.
        </p>

        <div className="settings-grid">
          {SETTINGS_FIELDS.map((field) => (
            <GlassInput
              key={field.name}
              label={field.label}
              type="number"
              inputMode="numeric"
              min={field.min}
              step={field.step}
              name={field.name}
              value={settings[field.name]}
              onChange={handleChange}
              suffix={field.suffix}
            />
          ))}
        </div>
      </div>

      <div className="preview-stack">
        <GlassCard className="settings-summary-card">
          <p className="mini-label">Workout summary</p>

          <div className="settings-total">
            <span>Total workout time</span>
            <strong>{formatSecondsToClock(totalDuration)}</strong>
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

          <GlassButton
            variant="primary"
            className="settings-start"
            onClick={() => onStart(settings)}
          >
            Start Workout
          </GlassButton>
        </GlassCard>

        <GlassCard className="settings-summary-card">
          <p className="mini-label">Routines</p>
          <RoutineSelector
            key={session?.user?.id ?? 'guest'}
            session={session}
            settings={settings}
            onLoadSettings={onLoadSettings}
          />
        </GlassCard>

        <GlassCard muted>
          <p className="mini-label">Time formula</p>
          <p className="mini-copy">
            Total time = ((Work + Rest) × Rounds - Rest + Set Rest) × Total Sets - Set Rest
          </p>
        </GlassCard>
      </div>
    </div>
  )
}

export default memo(SettingsPanel)
