import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface FocusTimerProps {
  onSessionComplete: (minutes: number) => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ onSessionComplete }) => {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmPlayedRef = useRef(false);

  // Play peaceful chime using native Web Audio API (Major Chord E5-G#5-B5)
  const playPeacefulChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const freqs = [659.25, 830.61, 987.77]; // E5, G#5, B5
      const now = ctx.currentTime;

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.15); // soft fade-in
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.5); // long decay

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + i * 0.1); // slightly strummed chord
        osc.stop(now + 3.0);
      });
    } catch (e) {
      console.warn('Failed to play synthesized chime', e);
    }
  };

  // Play a different completion chime (C Major Chord C5-E5-G5)
  const playCompletionChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      const now = ctx.currentTime;

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle'; // warmer sound
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + 3.5);
      });
    } catch (e) {
      console.warn('Failed to play completion chime', e);
    }
  };

  const changeDuration = (newMins: number) => {
    if (isActive) return; // Prevent changing during active session
    const mins = Math.max(1, Math.min(180, newMins));
    setDurationMinutes(mins);
    setSeconds(mins * 60);
    alarmPlayedRef.current = false;
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setSeconds(durationMinutes * 60);
    alarmPlayedRef.current = false;
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          // Play warning chime when reaching exactly 5:00 (300 seconds)
          if (prev === 301 && !alarmPlayedRef.current) {
            playPeacefulChime();
            alarmPlayedRef.current = true;
          }

          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsActive(false);
            onSessionComplete(durationMinutes);
            playCompletionChime();
            alarmPlayedRef.current = false;
            return durationMinutes * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, durationMinutes, onSessionComplete]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Card className="flex flex-col items-center justify-center p-6 text-center border-border-accent/20 bg-gradient-to-b from-bgCard/70 to-bgCard/30 select-none w-full">
      <span className="text-[10px] font-semibold text-textSecondary uppercase tracking-wider mb-2">Focus Pomodoro</span>
      
      {/* Timer Display with Adjuster Buttons when paused */}
      <div className="flex items-center gap-4 my-2">
        {!isActive && (
          <button
            onClick={() => changeDuration(durationMinutes - 1)}
            disabled={durationMinutes <= 1}
            className="h-7 w-7 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-textSecondary hover:text-textPrimary text-sm font-bold flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Decrease 1 Minute"
          >
            -
          </button>
        )}
        
        <div className="text-4xl font-extrabold text-textPrimary font-mono tracking-widest min-w-[120px]">
          {formatTime(seconds)}
        </div>

        {!isActive && (
          <button
            onClick={() => changeDuration(durationMinutes + 1)}
            disabled={durationMinutes >= 180}
            className="h-7 w-7 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-textSecondary hover:text-textPrimary text-sm font-bold flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Increase 1 Minute"
          >
            +
          </button>
        )}
      </div>

      {/* Preset selections (only visible when paused) */}
      {!isActive && (
        <div className="flex gap-1.5 mt-2 mb-1 justify-center">
          {[15, 25, 45, 60].map((preset) => (
            <button
              key={preset}
              onClick={() => changeDuration(preset)}
              className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase transition ${
                durationMinutes === preset
                  ? 'border-accentBlue bg-accentBlue/20 text-white'
                  : 'border-white/5 text-textSecondary hover:border-white/10 hover:text-textPrimary'
              }`}
            >
              {preset}m
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-4 w-full">
        <Button
          onClick={toggleTimer}
          variant={isActive ? "outline" : "primary"}
          className="flex-1 text-xs py-2 rounded-xl font-bold uppercase tracking-wider transition"
        >
          {isActive ? "Pause" : `Start ${durationMinutes}m`}
        </Button>
        <Button
          onClick={resetTimer}
          variant="ghost"
          className="px-3 border border-border-subtle rounded-xl text-xs hover:bg-white/5 transition"
        >
          Reset
        </Button>
      </div>
    </Card>
  );
};
