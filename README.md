# HackaTime Dashboard

A web dashboard and CLI tool for viewing your [HackaTime](https://hackatime.hackclub.com) coding stats.

## Setup

Your API key is already configured in `app.js` and `cli.js`. To change it, edit the `API_KEY` constant.

## Web Dashboard

Open `index.html` in your browser:

```bash
# Using Python
python3 -m http.server 8000

# Then open http://localhost:8000
```

Features:
- Total coding time and daily average
- Language breakdown (doughnut chart)
- Editor breakdown
- Project breakdown
- OS breakdown
- Switch between 7-day, 30-day, 6-month, and 1-year ranges

## CLI

```bash
node cli.js                  # Last 7 days (default)
node cli.js last_30_days     # Last 30 days
node cli.js last_6_months    # Last 6 months
node cli.js last_year        # Last year
```

## API Reference

Base URL: `https://hackatime.hackclub.com/api/hackatime/v1`

| Endpoint | Description |
|----------|-------------|
| `/users/current/stats/{range}` | Get coding stats for a time range |
| `/users/{id}/statusbar/today` | Get today's status bar data |

Ranges: `last_7_days`, `last_30_days`, `last_6_months`, `last_year`

Auth: `Authorization: Bearer <api_key>`
