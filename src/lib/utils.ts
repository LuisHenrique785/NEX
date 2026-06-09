// Formats a UTC ISO string as time in BRT (UTC-3 / America/Sao_Paulo)
export function formatTimeBRT(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

// Formats a UTC ISO string as date+time in BRT
export function formatDateTimeBRT(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

// Returns the start of today in BRT as a Date (UTC-3 midnight = 03:00 UTC)
export function startOfTodayBRT(): Date {
  const brtDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
  return new Date(`${brtDateStr}T03:00:00.000Z`);
}

// Returns the start of yesterday in BRT
export function startOfYesterdayBRT(): Date {
  return new Date(startOfTodayBRT().getTime() - 24 * 60 * 60 * 1000);
}
