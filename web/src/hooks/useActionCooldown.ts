import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Custom Hook: 5-Second Cooldown & Anti-Spam Lock
 * Prevents multiple/repeated DB submissions from rapid clicks.
 */
export const useActionCooldown = (cooldownSeconds: number = 5) => {
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setIsSubmitting(true);
    setCooldown(cooldownSeconds);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setIsSubmitting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cooldownSeconds]);

  const resetCooldown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setCooldown(0);
    setIsSubmitting(false);
  }, []);

  const isLocked = isSubmitting || cooldown > 0;

  return {
    isLocked,
    isSubmitting,
    cooldown,
    startCooldown,
    resetCooldown,
  };
};
