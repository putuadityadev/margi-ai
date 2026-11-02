export interface MockHourlyForecast {
  readonly dayOfWeek: number;
  readonly hour: number;
  readonly busyness: number;
}

/**
 * Generates a realistic 7x24 weekly curve based on peak hour and maximum congestion.
 */
export function generateWeeklyForecast(
  peakHour: number,
  peakBusyness: number,
  baseBusyness: number = 10,
): MockHourlyForecast[] {
  const result: MockHourlyForecast[] = [];

  for (let day = 0; day < 7; day++) {
    // Weekend (day 5 = Sat, 6 = Sun) gets +20% crowd boost
    const weekendMultiplier = day >= 5 ? 1.2 : 1.0;

    for (let hour = 0; hour < 24; hour++) {
      if (hour < 6 || hour > 19) {
        result.push({ dayOfWeek: day, hour, busyness: 0 });
        continue;
      }

      // Bell curve decay away from peak hour
      const diff = Math.abs(hour - peakHour);
      const factor = Math.max(0, 1 - (diff * diff) / 25);
      const val = baseBusyness + (peakBusyness - baseBusyness) * factor * weekendMultiplier;
      const clamped = Math.min(100, Math.max(0, Math.round(val)));

      result.push({ dayOfWeek: day, hour, busyness: clamped });
    }
  }

  return result;
}
