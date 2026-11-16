// ============================================================================
// TradeFlow — High-Impact Economic Calendar Service (IST Indian Timezone)
// Provides scheduled high-volatility news events for Forex & Gold (USD, EUR, GBP, JPY)
// ============================================================================

export type NewsImpact = 'HIGH' | 'MEDIUM' | 'LOW';

export interface EconomicEvent {
  id: string;
  date: string; // YYYY-MM-DD
  timeIst: string; // e.g. "06:00 PM IST" or "07:30 PM IST"
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'ALL';
  event: string;
  impact: NewsImpact;
  forecast?: string;
  previous?: string;
}

// Curated economic calendar schedule covering high-impact red folder releases
// Timed strictly in Indian Standard Time (IST - UTC+5:30)
const MASTER_EVENTS_IST: Omit<EconomicEvent, 'id'>[] = [
  // Recurring / High Impact Schedule in IST
  { date: '2026-11-16', timeIst: '07:00 PM IST', currency: 'USD', event: 'Empire State Manufacturing Index', impact: 'MEDIUM', forecast: '-0.3', previous: '-11.9' },
  { date: '2026-11-16', timeIst: '08:30 PM IST', currency: 'USD', event: 'Fed Governor Waller Speaks', impact: 'HIGH' },
  { date: '2026-11-16', timeIst: '09:45 PM IST', currency: 'EUR', event: 'ECB President Lagarde Speaks', impact: 'HIGH' },
  
  { date: '2026-11-17', timeIst: '01:00 PM IST', currency: 'GBP', event: 'Claimant Count Change & Unemployment Rate', impact: 'HIGH', forecast: '4.0%', previous: '4.0%' },
  { date: '2026-11-17', timeIst: '07:00 PM IST', currency: 'USD', event: 'Retail Sales m/m', impact: 'HIGH', forecast: '0.4%', previous: '0.4%' },
  { date: '2026-11-17', timeIst: '07:45 PM IST', currency: 'USD', event: 'Industrial Production m/m', impact: 'MEDIUM', forecast: '-0.1%', previous: '-0.3%' },

  { date: '2026-11-18', timeIst: '01:30 PM IST', currency: 'GBP', event: 'CPI y/y (Inflation Rate)', impact: 'HIGH', forecast: '2.2%', previous: '1.7%' },
  { date: '2026-11-18', timeIst: '03:30 PM IST', currency: 'EUR', event: 'Final CPI y/y', impact: 'MEDIUM', forecast: '2.0%', previous: '1.7%' },
  { date: '2026-11-18', timeIst: '07:00 PM IST', currency: 'USD', event: 'Building Permits & Housing Starts', impact: 'MEDIUM', forecast: '1.45M', previous: '1.43M' },

  { date: '2026-11-19', timeIst: '07:00 PM IST', currency: 'USD', event: 'Initial Jobless Claims (Weekly)', impact: 'HIGH', forecast: '221K', previous: '217K' },
  { date: '2026-11-19', timeIst: '07:00 PM IST', currency: 'USD', event: 'Philly Fed Manufacturing Index', impact: 'HIGH', forecast: '8.2', previous: '10.3' },
  { date: '2026-11-19', timeIst: '08:30 PM IST', currency: 'USD', event: 'Existing Home Sales', impact: 'MEDIUM', forecast: '3.90M', previous: '3.84M' },

  { date: '2026-11-20', timeIst: '01:30 PM IST', currency: 'GBP', event: 'Retail Sales m/m', impact: 'HIGH', forecast: '-0.3%', previous: '0.3%' },
  { date: '2026-11-20', timeIst: '02:00 PM IST', currency: 'EUR', event: 'German Flash Manufacturing PMI', impact: 'HIGH', forecast: '43.1', previous: '43.0' },
  { date: '2026-11-20', timeIst: '08:15 PM IST', currency: 'USD', event: 'Flash Manufacturing & Services PMI', impact: 'HIGH', forecast: '51.3', previous: '50.5' },

  // Nov 10-15 Past Releases for date-picker lookup
  { date: '2026-11-10', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Preliminary UoM Consumer Sentiment', impact: 'HIGH', forecast: '71.0', previous: '70.5' },
  { date: '2026-11-11', timeIst: '06:30 PM IST', currency: 'USD', event: 'US Bank Holiday / Veteran Day Session', impact: 'MEDIUM' },
  { date: '2026-11-12', timeIst: '07:00 PM IST', currency: 'USD', event: 'NFIB Small Business Optimism', impact: 'MEDIUM' },
  { date: '2026-11-13', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Core CPI m/m (0.3% Actual)', impact: 'HIGH', forecast: '0.3%', previous: '0.3%' },
  { date: '2026-11-14', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Core PPI m/m & Jobless Claims', impact: 'HIGH', forecast: '0.2%', previous: '0.2%' },
  { date: '2026-11-15', timeIst: '07:00 PM IST', currency: 'USD', event: 'Core Retail Sales & Empire Index', impact: 'HIGH', forecast: '0.3%', previous: '0.5%' },
];

/** Return high-impact events for a specific date (YYYY-MM-DD), formatted in IST */
export function getEventsForDate(dateStr?: string): EconomicEvent[] {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const matched = MASTER_EVENTS_IST.filter((e) => e.date === targetDate);

  if (matched.length > 0) {
    return matched.map((e, idx) => ({
      ...e,
      id: `ev_${e.date}_${idx}`,
    }));
  }

  // Fallback high-impact events pattern based on weekday if outside static dates
  const dt = new Date(`${targetDate}T12:00:00Z`);
  const day = dt.getUTCDay(); // 0 = Sun, 1 = Mon ... 5 = Fri

  if (day === 1) {
    // Monday
    return [
      { id: `dyn_1`, date: targetDate, timeIst: '07:00 PM IST', currency: 'USD', event: 'US Empire State Manufacturing', impact: 'MEDIUM' },
      { id: `dyn_2`, date: targetDate, timeIst: '08:45 PM IST', currency: 'USD', event: 'FOMC Member Speech (Volatile)', impact: 'HIGH' },
    ];
  }
  if (day === 2) {
    // Tuesday
    return [
      { id: `dyn_1`, date: targetDate, timeIst: '01:00 PM IST', currency: 'GBP', event: 'UK Employment & Average Earnings', impact: 'HIGH' },
      { id: `dyn_2`, date: targetDate, timeIst: '07:00 PM IST', currency: 'USD', event: 'US Retail Sales & Import Prices', impact: 'HIGH' },
    ];
  }
  if (day === 3) {
    // Wednesday
    return [
      { id: `dyn_1`, date: targetDate, timeIst: '01:30 PM IST', currency: 'GBP', event: 'UK CPI Inflation Data (High Volatility)', impact: 'HIGH' },
      { id: `dyn_2`, date: targetDate, timeIst: '07:00 PM IST', currency: 'USD', event: 'Building Permits & Crude Oil Inventories', impact: 'MEDIUM' },
      { id: `dyn_3`, date: targetDate, timeIst: '11:30 PM IST', currency: 'USD', event: 'FOMC Meeting Minutes', impact: 'HIGH' },
    ];
  }
  if (day === 4) {
    // Thursday
    return [
      { id: `dyn_1`, date: targetDate, timeIst: '07:00 PM IST', currency: 'USD', event: 'US Unemployment Claims & Philly Fed', impact: 'HIGH' },
      { id: `dyn_2`, date: targetDate, timeIst: '08:30 PM IST', currency: 'USD', event: 'Existing Home Sales', impact: 'MEDIUM' },
    ];
  }
  if (day === 5) {
    // Friday
    return [
      { id: `dyn_1`, date: targetDate, timeIst: '02:00 PM IST', currency: 'EUR', event: 'Eurozone Flash PMI Releases', impact: 'HIGH' },
      { id: `dyn_2`, date: targetDate, timeIst: '07:00 PM IST', currency: 'USD', event: 'Flash Manufacturing & Services PMI', impact: 'HIGH' },
    ];
  }

  // Weekend
  return [];
}
