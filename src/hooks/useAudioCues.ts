import { useCallback, useEffect, useMemo, useState } from 'react'
import countdownBeeperSound from '../assets/countdown_beeper.wav'
import dingDingSound from '../assets/ding_ding.mp3'

interface AudioCueHookResult {
  isMuted: boolean
  toggleMute: () => void
  playDingDing: () => void
  playBeeper: () => void
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

function useAudioCues(): AudioCueHookResult {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem('hiit-timer-muted') === '1'
  })

  const dingAudio = useMemo(() => createAudio(dingDingSound, 0.9), [])
  const beeperAudio = useMemo(() => createAudio(countdownBeeperSound, 0.8), [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hiit-timer-muted', isMuted ? '1' : '0')
    }

    for (const audio of [dingAudio, beeperAudio]) {
      if (!audio) {
        continue
      }

      audio.muted = isMuted
    }
  }, [beeperAudio, dingAudio, isMuted])

  useEffect(() => {
    return () => {
      for (const audio of [dingAudio, beeperAudio]) {
        if (!audio) {
          continue
        }

        audio.pause()
        audio.currentTime = 0
      }
    }
  }, [beeperAudio, dingAudio])

  const playAudio = useCallback(
    (audio: HTMLAudioElement | null) => {
      if (!audio || isMuted) {
        return
      }

      audio.pause()
      audio.currentTime = 0
      void audio.play().catch(() => {
        // Ignore autoplay blocking until the user interacts with the page.
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
    playDingDing,
    playBeeper,
  }
}

export default useAudioCues
