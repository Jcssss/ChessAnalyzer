import { useState } from "react";

/**
 * A custom hook that toggles a boolean value between true and false
 *
 * @param initBool the initial value to set
 * @returns The delayed value
 */
export function useToggle(initBool: boolean):[boolean, Function] {
  const [value, setValue] = useState(initBool);

  const toggleValue = () => {
    setValue((oldVal) => !oldVal)
  }

  return [value, toggleValue];
}