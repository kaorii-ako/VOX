const API_BASE = 'https://hackatime.hackclub.com/api/hackatime/v1';
const API_KEY = '61133e79-66b6-4682-b3eb-3e1008a9f823';

const COLORS = [
    '#58a6ff', '#bc8cff', '#f778ba', '#3fb950', '#d29922',
    '#f85149', '#39d353', '#79c0ff', '#d2a8ff', '#ff7b72',
    '#ffa657', '#7ee787'
];

let charts = {};

async function fetchStats(range = 'last_7_days') {
    const resp = await fetch(`${API_BASE}/users/current/stats/${range}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    return (await resp.json()).data;
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function renderStats(data) {
    document.getElementById('totalTime').textContent = data.human_readable_total;
    document.getElementById('dailyAvg').textContent = data.human_readable_daily_average;
    document.getElementById('username').textContent = data.username;
    document.getElementById('dateRange').textContent =
        `${new Date(data.start).toLocaleDateString()} — ${new Date(data.end).toLocaleDateString()}`;
}

function createChart(canvasId, items, legendId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const top = items.slice(0, 8);

    if (charts[canvasId]) charts[canvasId].destroy();

    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: top.map(i => i.name),
            datasets: [{
                data: top.map(i => i.total_seconds),
                backgroundColor: COLORS.slice(0, top.length),
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${formatTime(ctx.raw)} (${((ctx.raw / top.reduce((a, b) => a + b.total_seconds, 0)) * 100).toFixed(1)}%)`
                    }
                }
            }
        }
    });

    const legend = document.getElementById(legendId);
    legend.innerHTML = top.map((item, i) =>
        `<span class="legend-item">
            <span class="legend-dot" style="background:${COLORS[i]}"></span>
            ${item.name} — ${formatTime(item.total_seconds)}
        </span>`
    ).join('');
}

async function load(range = 'last_7_days') {
    document.querySelector('.container').classList.add('loading');
    try {
        const data = await fetchStats(range);
        renderStats(data);
        createChart('langChart', data.languages, 'langLegend');
        createChart('editorChart', data.editors, 'editorLegend');
        createChart('projectChart', data.projects, 'projectLegend');
        createChart('osChart', data.operating_systems, 'osLegend');
    } catch (err) {
        console.error('Failed to load stats:', err);
    } finally {
        document.querySelector('.container').classList.remove('loading');
    }
}

document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        load(btn.dataset.range);
    });
});

load();
