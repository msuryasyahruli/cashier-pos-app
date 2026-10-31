import { useState, useEffect } from 'react';

export interface FormattedDateTime {
  time: string;
  date: string;
  rawDate: Date;
}

export function useDateTime(updateIntervalMs: number = 1000): FormattedDateTime {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, updateIntervalMs);

    return () => clearInterval(timer);
  }, [updateIntervalMs]);

  const time = currentDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const date = currentDate.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return { time, date, rawDate: currentDate };
}
