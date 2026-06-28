#!/usr/bin/env node
const API_BASE = 'https://hackatime.hackclub.com/api/hackatime/v1';
const API_KEY = process.env.HACKATIME_API_KEY || '61133e79-66b6-4682-b3eb-3e1008a9f823';

const range = process.argv[2] || 'last_7_days';
const validRanges = ['last_7_days', 'last_30_days', 'last_6_months', 'last_year'];

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
HackaTime CLI - View your coding stats

Usage: node cli.js [range]

Ranges:
  last_7_days    Last 7 days (default)
  last_30_days   Last 30 days
  last_6_months  Last 6 months
  last_year      Last year

Environment:
  HACKATIME_API_KEY  Your API key (or edit cli.js)
`);
    process.exit(0);
}

if (!validRanges.includes(range)) {
    console.error(`Invalid range: ${range}`);
    console.error(`Valid: ${validRanges.join(', ')}`);
    process.exit(1);
}

async function main() {
    const resp = await fetch(`${API_BASE}/users/current/stats/${range}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    if (!resp.ok) {
        console.error(`API error: ${resp.status}`);
        process.exit(1);
    }

    const { data } = await resp.json();

    const bar = (pct, width = 20) => {
        const filled = Math.round((pct / 100) * width);
        return '█'.repeat(filled) + '░'.repeat(width - filled);
    };

    console.log(`\n  ╔══════════════════════════════════════╗`);
    console.log(`  ║        HackaTime Stats               ║`);
    console.log(`  ╚══════════════════════════════════════╝\n`);
    console.log(`  Range:    ${data.human_readable_range}`);
    console.log(`  Period:   ${new Date(data.start).toLocaleDateString()} — ${new Date(data.end).toLocaleDateString()}`);
    console.log(`  Total:    ${data.human_readable_total}`);
    console.log(`  Daily:    ${data.human_readable_daily_average}\n`);

    console.log(`  ── Languages ──────────────────────────\n`);
    for (const lang of data.languages.slice(0, 10)) {
        const pct = lang.percent.toFixed(1).padStart(5);
        console.log(`  ${pct}% ${bar(lang.percent)} ${lang.name} (${lang.text})`);
    }

    console.log(`\n  ── Editors ────────────────────────────\n`);
    for (const ed of data.editors.slice(0, 6)) {
        const pct = ed.percent.toFixed(1).padStart(5);
        console.log(`  ${pct}% ${bar(ed.percent)} ${ed.name} (${ed.text})`);
    }

    console.log(`\n  ── Projects ───────────────────────────\n`);
    for (const proj of data.projects.slice(0, 8)) {
        const pct = proj.percent.toFixed(1).padStart(5);
        console.log(`  ${pct}% ${bar(proj.percent)} ${proj.name} (${proj.text})`);
    }

    console.log('');
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
