import { useEffect, useState } from 'react';

/** Current time, refreshed every `ms` (default one minute) so due/overdue states stay fresh. */
export function useNow(ms = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
