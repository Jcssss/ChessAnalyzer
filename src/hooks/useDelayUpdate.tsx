import { useState } from "react";


/**
 * A custom hook that sets a timeout each time the input value changes.
 * When the timeout expires, it updates the returned value.
 *
 * @param value - The input value to delay
 * @param delay - Timeout duration in milliseconds
 * @returns The delayed value
 */
export function useDelayUpdate<T>(value: T, delay: number): [T, Function] {
  const [delayedValue, setDelayedValue] = useState(value);
  const [timeout, resetTimeout] = useState<NodeJS.Timeout | null>(null)

  const updateAfterDelay = (newValue: T) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    resetTimeout(setTimeout(() => setDelayedValue(newValue), delay))
  }

  return [delayedValue, updateAfterDelay];
}