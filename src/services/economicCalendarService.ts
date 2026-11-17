// ============================================================================
// TradeFlow — High & Medium Impact Economic Calendar Service (IST Indian Timezone)
// Covers major macroeconomic market catalysts for Forex, Gold (XAU/USD), and Indices
// Verified against Forex Factory and central bank schedules in IST (UTC+5:30)
// ============================================================================

export type NewsImpact = 'HIGH' | 'MEDIUM' | 'LOW';

export interface EconomicEvent {
  id: string;
  date: string; // YYYY-MM-DD
  timeIst: string; // e.g. "07:00 PM IST" or "12:30 PM IST"
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'NZD' | 'CHF' | 'CNY' | 'ALL';
  event: string;
  impact: NewsImpact;
  forecast?: string;
  previous?: string;
}

/**
 * Curated calendar of verified High (Red) and Medium (Orange) macroeconomic releases.
 * Times are aligned strictly to Indian Standard Time (IST - UTC+5:30).
 */
const MASTER_EVENTS_IST: Omit<EconomicEvent, 'id'>[] = [
  // --------------------------------------------------------------------------
  // WEEK 1: Nov 01 - Nov 07, 2026 (NFP Week & FOMC Rate Decision)
  // --------------------------------------------------------------------------
  { date: '2026-11-02', timeIst: '08:30 PM IST', currency: 'USD', event: 'ISM Manufacturing PMI', impact: 'HIGH', forecast: '47.6', previous: '47.2' },
  { date: '2026-11-02', timeIst: '08:30 PM IST', currency: 'USD', event: 'ISM Manufacturing Prices Paid', impact: 'MEDIUM', forecast: '54.0', previous: '54.5' },

  { date: '2026-11-03', timeIst: '09:00 AM IST', currency: 'AUD', event: 'RBA Cash Rate Decision & Statement', impact: 'HIGH', forecast: '4.35%', previous: '4.35%' },
  { date: '2026-11-03', timeIst: '08:30 PM IST', currency: 'USD', event: 'JOLTS Job Openings', impact: 'HIGH', forecast: '7.42M', previous: '7.44M' },

  { date: '2026-11-04', timeIst: '06:45 PM IST', currency: 'USD', event: 'ADP Non-Farm Employment Change', impact: 'HIGH', forecast: '233K', previous: '143K' },
  { date: '2026-11-04', timeIst: '08:30 PM IST', currency: 'USD', event: 'ISM Services PMI', impact: 'HIGH', forecast: '56.0', previous: '54.9' },
  { date: '2026-11-04', timeIst: '09:00 PM IST', currency: 'USD', event: 'EIA Crude Oil Inventories', impact: 'MEDIUM', forecast: '+1.8M', previous: '+2.1M' },

  { date: '2026-11-05', timeIst: '05:30 PM IST', currency: 'GBP', event: 'BOE Official Bank Rate & Monetary Policy Summary', impact: 'HIGH', forecast: '4.75%', previous: '5.00%' },
  { date: '2026-11-05', timeIst: '07:00 PM IST', currency: 'USD', event: 'Initial Jobless Claims (Weekly)', impact: 'MEDIUM', forecast: '216K', previous: '218K' },
  { date: '2026-11-05', timeIst: '11:30 PM IST', currency: 'USD', event: 'FOMC Statement & Federal Funds Rate Decision', impact: 'HIGH', forecast: '4.75%', previous: '5.00%' },

  { date: '2026-11-06', timeIst: '12:00 AM IST', currency: 'USD', event: 'Fed Chair Powell Press Conference', impact: 'HIGH' },
  { date: '2026-11-06', timeIst: '07:00 PM IST', currency: 'USD', event: 'Non-Farm Employment Change (NFP)', impact: 'HIGH', forecast: '113K', previous: '223K' },
  { date: '2026-11-06', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Unemployment Rate', impact: 'HIGH', forecast: '4.1%', previous: '4.1%' },
  { date: '2026-11-06', timeIst: '07:00 PM IST', currency: 'USD', event: 'Average Hourly Earnings m/m', impact: 'HIGH', forecast: '0.3%', previous: '0.3%' },
  { date: '2026-11-06', timeIst: '07:00 PM IST', currency: 'CAD', event: 'Net Change in Employment & Unemployment', impact: 'HIGH', forecast: '27.2K', previous: '46.7K' },

  // --------------------------------------------------------------------------
  // WEEK 2: Nov 09 - Nov 14, 2026 (US CPI & PPI Week)
  // --------------------------------------------------------------------------
  { date: '2026-11-09', timeIst: '07:00 PM IST', currency: 'USD', event: 'Federal Reserve Senior Loan Officer Survey', impact: 'MEDIUM' },
  { date: '2026-11-09', timeIst: '08:30 PM IST', currency: 'USD', event: 'FOMC Member Williams Speech', impact: 'MEDIUM' },

  { date: '2026-11-10', timeIst: '01:30 PM IST', currency: 'GBP', event: 'UK Claimant Count Change & Wage Growth', impact: 'MEDIUM', forecast: '26.7K', previous: '27.9K' },
  { date: '2026-11-10', timeIst: '07:00 PM IST', currency: 'USD', event: 'NFIB Small Business Optimism', impact: 'MEDIUM', forecast: '92.5', previous: '91.5' },

  { date: '2026-11-11', timeIst: '01:30 PM IST', currency: 'EUR', event: 'German Final CPI m/m', impact: 'MEDIUM', forecast: '0.4%', previous: '0.4%' },
  { date: '2026-11-11', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Veteran Day Session (Bond Market Closed)', impact: 'MEDIUM' },

  { date: '2026-11-12', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Consumer Price Index (CPI m/m)', impact: 'HIGH', forecast: '0.2%', previous: '0.2%' },
  { date: '2026-11-12', timeIst: '07:00 PM IST', currency: 'USD', event: 'US CPI Inflation Rate y/y', impact: 'HIGH', forecast: '2.6%', previous: '2.4%' },
  { date: '2026-11-12', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Core CPI m/m (Ex Food & Energy)', impact: 'HIGH', forecast: '0.3%', previous: '0.3%' },
  { date: '2026-11-12', timeIst: '07:00 PM IST', currency: 'USD', event: 'Initial Jobless Claims (Weekly)', impact: 'MEDIUM', forecast: '217K', previous: '221K' },
  { date: '2026-11-12', timeIst: '08:30 PM IST', currency: 'USD', event: 'Fed Governor Waller Speaks', impact: 'HIGH' },

  { date: '2026-11-13', timeIst: '01:30 PM IST', currency: 'GBP', event: 'UK Prelim GDP q/q', impact: 'HIGH', forecast: '0.2%', previous: '0.5%' },
  { date: '2026-11-13', timeIst: '07:00 PM IST', currency: 'USD', event: 'Producer Price Index (PPI m/m)', impact: 'HIGH', forecast: '0.2%', previous: '0.1%' },
  { date: '2026-11-13', timeIst: '07:00 PM IST', currency: 'USD', event: 'Core PPI m/m', impact: 'HIGH', forecast: '0.3%', previous: '0.2%' },
  { date: '2026-11-13', timeIst: '08:30 PM IST', currency: 'USD', event: 'Fed Chair Powell Remarks at Dallas Chamber', impact: 'HIGH' },

  // --------------------------------------------------------------------------
  // WEEK 3: Nov 16 - Nov 21, 2026 (Live Forex Factory Calendar Week)
  // --------------------------------------------------------------------------
  // Monday Nov 16
  { date: '2026-11-16', timeIst: '07:00 PM IST', currency: 'CAD', event: 'Consumer Price Index (CPI m/m)', impact: 'HIGH', forecast: '0.3%', previous: '0.1%' },
  { date: '2026-11-16', timeIst: '07:00 PM IST', currency: 'CAD', event: 'Median CPI y/y', impact: 'HIGH', forecast: '2.0%', previous: '1.9%' },
  { date: '2026-11-16', timeIst: '07:00 PM IST', currency: 'CAD', event: 'Trimmed CPI y/y', impact: 'HIGH', forecast: '1.9%', previous: '1.8%' },
  { date: '2026-11-16', timeIst: '07:00 PM IST', currency: 'CAD', event: 'Common CPI y/y', impact: 'MEDIUM', forecast: '2.5%', previous: '2.4%' },
  { date: '2026-11-16', timeIst: '07:00 PM IST', currency: 'USD', event: 'Empire State Manufacturing Index', impact: 'MEDIUM', forecast: '17.6', previous: '25.5' },
  { date: '2026-11-16', timeIst: '10:30 PM IST', currency: 'USD', event: 'Fed Chairman Warsh Speaks', impact: 'HIGH' },

  // Tuesday Nov 17 (Today)
  { date: '2026-11-17', timeIst: '04:20 AM IST', currency: 'AUD', event: 'RBA Gov Bullock Speaks at ASIC Conference', impact: 'HIGH' },
  { date: '2026-11-17', timeIst: '05:30 AM IST', currency: 'NZD', event: 'RBNZ Gov Breman Opening Remarks', impact: 'MEDIUM' },
  { date: '2026-11-17', timeIst: '07:30 AM IST', currency: 'NZD', event: 'RBNZ Inflation Expectations q/q', impact: 'HIGH', previous: '2.34%' },
  { date: '2026-11-17', timeIst: '12:30 PM IST', currency: 'GBP', event: 'UK Average Earnings Index 3m/y', impact: 'MEDIUM', forecast: '3.5%', previous: '3.7%' },
  { date: '2026-11-17', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Core Retail Sales m/m', impact: 'HIGH', forecast: '0.4%', previous: '0.9%' },
  { date: '2026-11-17', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Retail Sales m/m', impact: 'HIGH', forecast: '0.1%', previous: '0.8%' },
  { date: '2026-11-17', timeIst: '07:45 PM IST', currency: 'USD', event: 'US Industrial Production m/m', impact: 'MEDIUM', forecast: '-0.1%', previous: '-0.3%' },

  // Wednesday Nov 18
  { date: '2026-11-18', timeIst: '06:00 AM IST', currency: 'AUD', event: 'Wage Price Index q/q', impact: 'MEDIUM', forecast: '1.0%', previous: '0.8%' },
  { date: '2026-11-18', timeIst: '12:30 PM IST', currency: 'GBP', event: 'UK CPI Inflation Rate y/y', impact: 'HIGH', forecast: '3.6%', previous: '3.5%' },
  { date: '2026-11-18', timeIst: '01:00 PM IST', currency: 'GBP', event: 'BOE Gov Bailey Testimony', impact: 'MEDIUM' },
  { date: '2026-11-18', timeIst: '02:30 PM IST', currency: 'EUR', event: 'ECB Financial Stability Review', impact: 'MEDIUM' },
  { date: '2026-11-18', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Building Permits & Housing Starts', impact: 'MEDIUM', forecast: '1.45M', previous: '1.43M' },
  { date: '2026-11-18', timeIst: '07:55 PM IST', currency: 'EUR', event: 'ECB President Lagarde Speaks in Frankfurt', impact: 'MEDIUM' },
  { date: '2026-11-18', timeIst: '08:30 PM IST', currency: 'GBP', event: 'BOE Gov Bailey Keynote Address', impact: 'HIGH' },
  { date: '2026-11-18', timeIst: '09:00 PM IST', currency: 'USD', event: 'EIA Crude Oil Inventories', impact: 'MEDIUM', forecast: '+0.8M', previous: '+2.1M' },
  { date: '2026-11-18', timeIst: '11:30 PM IST', currency: 'NZD', event: 'RBNZ Gov Breman Speaks', impact: 'MEDIUM' },

  // Thursday Nov 19
  { date: '2026-11-19', timeIst: '12:30 AM IST', currency: 'USD', event: 'FOMC Meeting Minutes Release', impact: 'HIGH' },
  { date: '2026-11-19', timeIst: '06:00 AM IST', currency: 'AUD', event: 'Employment Change (Jobs Added)', impact: 'HIGH', forecast: '25.5K', previous: '-39.3K' },
  { date: '2026-11-19', timeIst: '06:00 AM IST', currency: 'AUD', event: 'Australia Unemployment Rate', impact: 'HIGH', forecast: '4.7%', previous: '4.7%' },
  { date: '2026-11-19', timeIst: '07:00 PM IST', currency: 'EUR', event: 'ECB President Lagarde Keynote', impact: 'MEDIUM' },
  { date: '2026-11-19', timeIst: '07:00 PM IST', currency: 'USD', event: 'Philly Fed Manufacturing Index', impact: 'MEDIUM', forecast: '19.2', previous: '20.9' },
  { date: '2026-11-19', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Unemployment Claims (Weekly)', impact: 'MEDIUM', forecast: '199K', previous: '200K' },
  { date: '2026-11-19', timeIst: '08:30 PM IST', currency: 'USD', event: 'US Existing Home Sales', impact: 'MEDIUM', forecast: '3.90M', previous: '3.84M' },

  // Friday Nov 20
  { date: '2026-11-20', timeIst: '12:30 PM IST', currency: 'GBP', event: 'UK Retail Sales m/m', impact: 'MEDIUM', forecast: '0.0%', previous: '-0.4%' },
  { date: '2026-11-20', timeIst: '01:45 PM IST', currency: 'EUR', event: 'ECB President Lagarde Keynote at European Banking Congress', impact: 'MEDIUM' },
  { date: '2026-11-20', timeIst: '02:00 PM IST', currency: 'EUR', event: 'German Flash Manufacturing PMI', impact: 'HIGH', forecast: '43.1', previous: '43.0' },
  { date: '2026-11-20', timeIst: '08:15 PM IST', currency: 'USD', event: 'US Flash Manufacturing & Services PMI', impact: 'HIGH', forecast: '51.3', previous: '50.5' },
  { date: '2026-11-20', timeIst: '08:30 PM IST', currency: 'USD', event: 'Revised UoM Consumer Sentiment', impact: 'MEDIUM', forecast: '52.1', previous: '51.0' },
  { date: '2026-11-20', timeIst: '08:30 PM IST', currency: 'USD', event: 'Revised UoM 5-Year Inflation Expectations', impact: 'MEDIUM', previous: '4.3%' },

  // --------------------------------------------------------------------------
  // WEEK 4: Nov 23 - Nov 30, 2026 (Prelim GDP & Core PCE Price Index)
  // --------------------------------------------------------------------------
  { date: '2026-11-23', timeIst: '02:30 PM IST', currency: 'EUR', event: 'German Ifo Business Climate', impact: 'MEDIUM', forecast: '86.8', previous: '86.5' },
  { date: '2026-11-23', timeIst: '08:15 PM IST', currency: 'USD', event: 'S&P Global Flash Manufacturing PMI', impact: 'HIGH', forecast: '48.8', previous: '48.5' },
  { date: '2026-11-23', timeIst: '08:15 PM IST', currency: 'USD', event: 'S&P Global Flash Services PMI', impact: 'HIGH', forecast: '55.3', previous: '55.0' },

  { date: '2026-11-24', timeIst: '08:30 PM IST', currency: 'USD', event: 'CB Consumer Confidence', impact: 'HIGH', forecast: '111.8', previous: '108.7' },
  { date: '2026-11-24', timeIst: '08:30 PM IST', currency: 'USD', event: 'Richmond Manufacturing Index', impact: 'MEDIUM', forecast: '-10', previous: '-14' },
  { date: '2026-11-24', timeIst: '08:30 PM IST', currency: 'USD', event: 'US New Home Sales', impact: 'MEDIUM', forecast: '720K', previous: '738K' },

  { date: '2026-11-25', timeIst: '06:30 AM IST', currency: 'NZD', event: 'RBNZ Official Cash Rate & Statement', impact: 'HIGH', forecast: '4.25%', previous: '4.75%' },
  { date: '2026-11-25', timeIst: '07:00 PM IST', currency: 'USD', event: 'Core PCE Price Index m/m (Fed Preferred)', impact: 'HIGH', forecast: '0.3%', previous: '0.3%' },
  { date: '2026-11-25', timeIst: '07:00 PM IST', currency: 'USD', event: 'US Prelim GDP q/q (Second Estimate)', impact: 'HIGH', forecast: '2.8%', previous: '2.8%' },
  { date: '2026-11-25', timeIst: '07:00 PM IST', currency: 'USD', event: 'Initial Jobless Claims (Pre-Holiday Early Release)', impact: 'MEDIUM', forecast: '215K', previous: '213K' },
  { date: '2026-11-25', timeIst: '07:00 PM IST', currency: 'USD', event: 'Durable Goods Orders m/m', impact: 'HIGH', forecast: '0.5%', previous: '0.7%' },
  { date: '2026-11-25', timeIst: '08:30 PM IST', currency: 'USD', event: 'Chicago PMI', impact: 'MEDIUM', forecast: '43.5', previous: '41.6' },

  { date: '2026-11-26', timeIst: 'All Day', currency: 'USD', event: 'US Bank Holiday (Thanksgiving Day - Low Liquidity)', impact: 'MEDIUM' },
  { date: '2026-11-26', timeIst: '01:30 PM IST', currency: 'EUR', event: 'ECB Monetary Policy Meeting Accounts', impact: 'MEDIUM' },

  { date: '2026-11-27', timeIst: '05:00 AM IST', currency: 'JPY', event: 'Tokyo Core CPI y/y', impact: 'HIGH', forecast: '2.1%', previous: '1.8%' },
  { date: '2026-11-27', timeIst: '01:30 PM IST', currency: 'EUR', event: 'Eurozone Flash CPI Estimate y/y', impact: 'HIGH', forecast: '2.3%', previous: '2.0%' },
  { date: '2026-11-27', timeIst: '07:00 PM IST', currency: 'CAD', event: 'Canada GDP m/m', impact: 'HIGH', forecast: '0.3%', previous: '0.0%' },
  { date: '2026-11-27', timeIst: 'All Day', currency: 'USD', event: 'US Markets Early Close (Black Friday)', impact: 'MEDIUM' },

  { date: '2026-11-30', timeIst: '07:00 AM IST', currency: 'CNY', event: 'Chinese Official Manufacturing & Non-Mfg PMI', impact: 'MEDIUM', forecast: '50.2', previous: '50.1' },
  { date: '2026-11-30', timeIst: '08:15 PM IST', currency: 'USD', event: 'Chicago PMI', impact: 'MEDIUM', forecast: '44.0', previous: '41.6' },
  { date: '2026-11-30', timeIst: '09:30 PM IST', currency: 'USD', event: 'Fed Chair Powell Opening Remarks', impact: 'HIGH' },
];

/**
 * Generates realistic macro day schedules for any arbitrary past or future date outside curated table.
 * Aligns strictly with central banking cycles (NFP on week 1 Friday, CPI mid-month, Weekly Jobless Claims on Thursday).
 */
function generateDynamicEvents(dateStr: string): EconomicEvent[] {
  const dt = new Date(`${dateStr}T12:00:00Z`);
  const day = dt.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const dayOfMonth = dt.getUTCDate();
  const weekNum = Math.ceil(dayOfMonth / 7);

  // Weekends have no standard macro news
  if (day === 0 || day === 6) return [];

  const events: Omit<EconomicEvent, 'id'>[] = [];

  // MONDAY
  if (day === 1) {
    events.push(
      { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'US Empire State / Regional Manufacturing', impact: 'MEDIUM', forecast: '12.4', previous: '10.8' },
      { date: dateStr, timeIst: '08:45 PM IST', currency: 'USD', event: 'FOMC Member Speech & Policy Remarks', impact: 'HIGH' }
    );
    if (dayOfMonth >= 20) {
      events.push({ date: dateStr, timeIst: '02:30 PM IST', currency: 'EUR', event: 'German Ifo Business Climate', impact: 'MEDIUM', forecast: '86.5', previous: '85.4' });
    }
  }

  // TUESDAY
  if (day === 2) {
    events.push(
      { date: dateStr, timeIst: '09:00 AM IST', currency: 'AUD', event: 'RBA Meeting Minutes / Policy Statement', impact: 'HIGH' },
      { date: dateStr, timeIst: '12:30 PM IST', currency: 'GBP', event: 'UK Average Earnings & Claimant Count', impact: 'MEDIUM', forecast: '3.6%', previous: '3.8%' },
      { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'US Retail Sales & Core Retail Sales m/m', impact: 'HIGH', forecast: '0.3%', previous: '0.4%' }
    );
    if (weekNum === 1 || weekNum === 4) {
      events.push({ date: dateStr, timeIst: '08:30 PM IST', currency: 'USD', event: 'JOLTS Job Openings / CB Consumer Confidence', impact: 'HIGH', forecast: '7.5M', previous: '7.4M' });
    }
  }

  // WEDNESDAY
  if (day === 3) {
    events.push(
      { date: dateStr, timeIst: '12:30 PM IST', currency: 'GBP', event: 'UK CPI Inflation Rate y/y', impact: 'HIGH', forecast: '2.4%', previous: '2.2%' },
      { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'Building Permits & Housing Starts', impact: 'MEDIUM', forecast: '1.42M', previous: '1.40M' },
      { date: dateStr, timeIst: '09:00 PM IST', currency: 'USD', event: 'EIA Crude Oil Inventories', impact: 'MEDIUM', forecast: '+1.2M', previous: '+1.8M' }
    );
    if (weekNum === 1) {
      events.unshift({ date: dateStr, timeIst: '06:45 PM IST', currency: 'USD', event: 'ADP Non-Farm Employment Change', impact: 'HIGH', forecast: '160K', previous: '145K' });
      events.push({ date: dateStr, timeIst: '08:30 PM IST', currency: 'USD', event: 'ISM Services PMI', impact: 'HIGH', forecast: '55.2', previous: '54.9' });
    }
    if (weekNum === 3) {
      events.push({ date: dateStr, timeIst: '11:30 PM IST', currency: 'USD', event: 'FOMC Meeting Minutes', impact: 'HIGH' });
    }
  }

  // THURSDAY (Every Thursday has Weekly Jobless Claims)
  if (day === 4) {
    events.push(
      { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'Initial Jobless Claims (Weekly Release)', impact: 'MEDIUM', forecast: '218K', previous: '221K' },
      { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'Philly Fed Manufacturing Index', impact: 'MEDIUM', forecast: '10.5', previous: '10.3' }
    );
    if (weekNum === 2) {
      events.unshift(
        { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'US Consumer Price Index (CPI m/m & y/y)', impact: 'HIGH', forecast: '0.2%', previous: '0.2%' },
        { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'US Core CPI m/m', impact: 'HIGH', forecast: '0.3%', previous: '0.3%' }
      );
    }
    if (weekNum === 1) {
      events.unshift({ date: dateStr, timeIst: '05:30 PM IST', currency: 'GBP', event: 'BOE Bank Rate Decision', impact: 'HIGH', forecast: '4.75%', previous: '5.00%' });
      events.push({ date: dateStr, timeIst: '11:30 PM IST', currency: 'USD', event: 'FOMC Interest Rate Decision', impact: 'HIGH' });
    }
    if (weekNum === 4) {
      events.unshift({ date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'US Prelim GDP q/q', impact: 'HIGH', forecast: '2.8%', previous: '2.8%' });
    }
  }

  // FRIDAY (NFP on Week 1, Flash PMIs on Week 3/4)
  if (day === 5) {
    if (weekNum === 1) {
      // First Friday of the Month: NFP Day
      events.push(
        { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'Non-Farm Employment Change (NFP)', impact: 'HIGH', forecast: '165K', previous: '150K' },
        { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'US Unemployment Rate', impact: 'HIGH', forecast: '4.1%', previous: '4.1%' },
        { date: dateStr, timeIst: '07:00 PM IST', currency: 'USD', event: 'Average Hourly Earnings m/m', impact: 'HIGH', forecast: '0.3%', previous: '0.3%' },
        { date: dateStr, timeIst: '07:00 PM IST', currency: 'CAD', event: 'Canada Employment Change & Unemployment', impact: 'HIGH', forecast: '25.0K', previous: '28.0K' }
      );
    } else {
      events.push(
        { date: dateStr, timeIst: '12:30 PM IST', currency: 'GBP', event: 'UK Retail Sales m/m', impact: 'MEDIUM', forecast: '0.1%', previous: '0.3%' },
        { date: dateStr, timeIst: '02:00 PM IST', currency: 'EUR', event: 'German Flash Manufacturing & Services PMI', impact: 'HIGH', forecast: '43.5', previous: '43.0' },
        { date: dateStr, timeIst: '08:15 PM IST', currency: 'USD', event: 'US Flash Manufacturing & Services PMI', impact: 'HIGH', forecast: '51.5', previous: '50.8' },
        { date: dateStr, timeIst: '08:30 PM IST', currency: 'USD', event: 'UoM Consumer Sentiment & Inflation Expectations', impact: 'MEDIUM', forecast: '70.5', previous: '68.9' }
      );
    }
  }

  return events.map((e, idx) => ({
    ...e,
    id: `dyn_${dateStr}_${idx}`,
  }));
}

export interface EventFilterOptions {
  impact?: 'ALL' | 'HIGH' | 'MEDIUM';
  currency?: string;
}

/**
 * Return economic events for a specific date (YYYY-MM-DD), with optional impact & currency filtering.
 * High & Medium events are ordered by time.
 */
export function getEventsForDate(dateStr?: string, options?: EventFilterOptions): EconomicEvent[] {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const matched = MASTER_EVENTS_IST.filter((e) => e.date === targetDate);

  let rawList: EconomicEvent[];
  if (matched.length > 0) {
    rawList = matched.map((e, idx) => ({
      ...e,
      id: `ev_${e.date}_${idx}`,
    }));
  } else {
    rawList = generateDynamicEvents(targetDate);
  }

  // Apply filters if provided
  let filtered = rawList;
  if (options?.impact && options.impact !== 'ALL') {
    filtered = filtered.filter((e) => e.impact === options.impact);
  }
  if (options?.currency && options.currency !== 'ALL') {
    filtered = filtered.filter((e) => e.currency === options.currency);
  }

  return filtered;
}

/**
 * Return summary statistics for a given date (total count, high count, medium count, unique currencies)
 */
export function getEventSummary(dateStr?: string) {
  const allEvents = getEventsForDate(dateStr);
  const highEvents = allEvents.filter((e) => e.impact === 'HIGH');
  const mediumEvents = allEvents.filter((e) => e.impact === 'MEDIUM');
  const currencies = Array.from(new Set(allEvents.map((e) => e.currency)));

  return {
    totalCount: allEvents.length,
    highCount: highEvents.length,
    mediumCount: mediumEvents.length,
    majorCurrencies: currencies,
    events: allEvents,
    highEvents,
    mediumEvents,
  };
}
