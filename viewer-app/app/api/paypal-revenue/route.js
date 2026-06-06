import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { runPythonScript } from '@/app/lib/pythonRunner';

export async function GET() {
  const scriptPath = path.join(
    process.cwd(),
    '..',
    '_company',
    '_agents',
    'business',
    'tools',
    'paypal_revenue.py'
  );

  try {
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found at: ${scriptPath}`);
    }

    // Execute with OUTPUT=json to get structured output
    const stdout = await runPythonScript(scriptPath, [], { OUTPUT: 'json' });
    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to run paypal_revenue.py, generating fallback mock data:', error);
    
    // Read configured currency from paypal_revenue.json
    let currency = 'USD';
    const configPath = path.join(
      process.cwd(),
      '..',
      '_company',
      '_agents',
      'business',
      'tools',
      'paypal_revenue.json'
    );
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.CURRENCY) {
          currency = config.CURRENCY.trim().toUpperCase();
        }
      }
    } catch (e) {
      console.error('Failed to read currency config:', e);
    }

    const mockData = generateFallbackMockData(currency);
    return NextResponse.json({
      ...mockData,
      is_mock: true,
      error_details: error.message
    });
  }
}

// Generate high quality mock data in case Python/API credentials fail
function generateFallbackMockData(currency = 'USD') {
  const now = new Date();
  const byDay = {};
  const transactions = [];
  
  // Rate multiplier for non-USD currencies (KRW is roughly 1,400)
  const rate = currency === 'KRW' ? 1400 : 1;
  const isZeroDecimal = currency === 'KRW' || currency === 'JPY';

  const roundVal = (v) => {
    return isZeroDecimal ? Math.round(v) : parseFloat(v.toFixed(2));
  };

  const projects = {
    'neon-survivor': { gross: 0, count: 0, currency: currency, items: { 'Premium Pack': { gross: 0, count: 0 }, 'Revive': { gross: 0, count: 0 } } },
    'chick-game': { gross: 0, count: 0, currency: currency, items: { 'Custom Skin': { gross: 0, count: 0 } } },
    'connect-ai': { gross: 0, count: 0, currency: currency, items: { 'Pro License': { gross: 0, count: 0 } } }
  };

  const templates = [
    { subject: 'Neon Survivor — Premium Pack', value: roundVal(9.99 * rate), project: 'neon-survivor', item: 'Premium Pack' },
    { subject: 'Neon Survivor — Revive', value: roundVal(0.99 * rate), project: 'neon-survivor', item: 'Revive' },
    { subject: 'Chick Game — Custom Skin', value: roundVal(4.99 * rate), project: 'chick-game', item: 'Custom Skin' },
    { subject: 'Connect AI — Pro License', value: roundVal(49.00 * rate), project: 'connect-ai', item: 'Pro License' }
  ];

  let grossSum = 0;
  let countSum = 0;

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    const dayKey = date.toISOString().split('T')[0];
    
    // Number of transactions today (0 to 3)
    const txCount = Math.floor(Math.random() * 4);
    let dayGross = 0;
    
    for (let j = 0; j < txCount; j++) {
      const tpl = templates[Math.floor(Math.random() * templates.length)];
      const value = tpl.value;
      
      grossSum += value;
      countSum++;
      dayGross += value;

      // Update project
      projects[tpl.project].gross = roundVal(projects[tpl.project].gross + value);
      projects[tpl.project].count++;
      projects[tpl.project].items[tpl.item].gross = roundVal(projects[tpl.project].items[tpl.item].gross + value);
      projects[tpl.project].items[tpl.item].count++;

      // Transaction log
      transactions.push({
        id: `MOCKTX${Math.floor(100000 + Math.random() * 900000)}`,
        ts: new Date(date.getTime() - j * 60 * 60 * 1000).toISOString(),
        ts_epoch: Math.floor(date.getTime() / 1000),
        value: value,
        currency: currency,
        subject: tpl.subject,
        event_code: 'T0000',
        is_refund: false
      });
    }

    if (txCount > 0) {
      byDay[dayKey] = {
        [currency]: {
          gross: roundVal(dayGross),
          count: txCount
        }
      };
    }
  }

  // Sort transactions by date descending
  transactions.sort((a, b) => b.ts_epoch - a.ts_epoch);

  const totalGross = roundVal(grossSum);
  const totalRefunds = roundVal(grossSum * 0.03); // assume 3% refund rate
  const totalFees = roundVal(countSum * (0.35 * rate) + grossSum * 0.04);

  return {
    generated_at: now.toISOString(),
    currency_filter: currency,
    totals: {
      by_currency: {
        [currency]: {
          gross: totalGross,
          refunds: totalRefunds,
          fees: totalFees,
          count: countSum
        }
      },
      by_period: {
        today: roundVal(transactions.filter(t => new Date(t.ts).toDateString() === now.toDateString()).reduce((acc, t) => acc + t.value, 0)),
        week: roundVal(transactions.slice(0, 10).reduce((acc, t) => acc + t.value, 0)), // rough estimate
        month: totalGross
      }
    },
    by_project: projects,
    by_day: byDay,
    transactions: transactions.slice(0, 20)
  };
}
