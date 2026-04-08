import { useCallback, useEffect, useMemo, useState } from 'react'
import countdownBeeperSound from '../assets/countdown_beeper.wav'
import dingDingSound from '../assets/ding_ding.mp3'

interface AudioCueHookResult {
  isMuted: boolean
  toggleMute: () => void
  unlockAudio: () => void
  playDingDing: () => void
  playBeeper: () => void
}

interface AudioBank {
  dingAudio: HTMLAudioElement | null
  beeperAudio: HTMLAudioElement | null
}

function createAudio(source: string, volume: number): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') {
    return null
  }

  const audio = new Audio(source)
  audio.preload = 'auto'
  audio.volume = volume
  audio.load()

  return audio
}

let sharedAudioBank: AudioBank | null = null
const AUDIO_MUTED_KEY = 'exercise-tracker-muted'
const LEGACY_AUDIO_MUTED_KEY = 'excercise-tracker-muted'

function getAudioBank(): AudioBank {
  if (sharedAudioBank) {
    return sharedAudioBank
  }

  sharedAudioBank = {
    dingAudio: createAudio(dingDingSound, 0.9),
    beeperAudio: createAudio(countdownBeeperSound, 0.8),
  }

  return sharedAudioBank
}

function useAudioCues(): AudioCueHookResult {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return (
      window.localStorage.getItem(AUDIO_MUTED_KEY) === '1'
      || window.localStorage.getItem(LEGACY_AUDIO_MUTED_KEY) === '1'
    )
  })

  const { dingAudio, beeperAudio } = useMemo(() => getAudioBank(), [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUDIO_MUTED_KEY, isMuted ? '1' : '0')
      window.localStorage.removeItem(LEGACY_AUDIO_MUTED_KEY)
    }

    for (const audio of [dingAudio, beeperAudio]) {
      if (!audio) {
        continue
      }

      audio.muted = isMuted
    }
  }, [beeperAudio, dingAudio, isMuted])

  const unlockAudio = useCallback(() => {
    for (const source of [dingDingSound, countdownBeeperSound]) {
      const tempAudio = createAudio(source, 0)

      if (!tempAudio) {
        continue
      }

      tempAudio.muted = true
      tempAudio.currentTime = 0

      void tempAudio.play()
        .then(() => {
          tempAudio.pause()
          tempAudio.currentTime = 0
        })
        .catch(() => {
          // Ignore browsers that still refuse playback here.
        })
    }

    for (const audio of [dingAudio, beeperAudio]) {
      if (!audio) {
        continue
      }

      audio.load()
      audio.muted = isMuted
    }
  }, [beeperAudio, dingAudio, isMuted])

  const playAudio = useCallback(
    (audio: HTMLAudioElement | null) => {
      if (!audio || isMuted) {
        return
      }

      audio.pause()
      audio.currentTime = 0
      void audio.play().catch(() => {
        // Ignore autoplay blocking until the user taps Start Workout.
      })
    },
    [isMuted],
  )

  const toggleMute = useCallback(() => {
    setIsMuted((currentValue) => !currentValue)
  }, [])

  const playDingDing = useCallback(() => {
    playAudio(dingAudio)
  }, [dingAudio, playAudio])

  const playBeeper = useCallback(() => {
    playAudio(beeperAudio)
  }, [beeperAudio, playAudio])

  return {
    isMuted,
    toggleMute,
    unlockAudio,
    playDingDing,
    playBeeper,
  }
}

export default useAudioCues
