import { useCountUp } from '../lib/motion';

/** a number that counts up to its value when it first shows, and rolls on later changes */
export function Rolling({ value, format = String, from = 0 }: { value: number; format?: (n: number) => string; from?: number }) {
  return <>{format(useCountUp(value, 1000, from))}</>;
}
