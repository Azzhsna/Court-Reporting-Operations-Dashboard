# Court Reporting Operations Dashboard

A workflow management system for court reporting agencies to manage transcription jobs, assign reporters and editors, track workflow progress, and calculate payouts.

## Features

- Create court reporting jobs
- Assign reporters manually or automatically
- Assign editors manually or automatically
- Track job workflow status
- Calculate reporter and editor payouts
- Dashboard with job statistics and search/filter functionality

## Workflow

```text
NEW
 ↓
ASSIGNED
 ↓
TRANSCRIBED
 ↓
REVIEWED
 ↓
COMPLETED
```

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- CSS
- Lucide React

### Backend
- Node.js
- Express.js
- TypeScript

### Database
- PostgreSQL
- Prisma ORM

## Installation

### Backend

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Server runs at:

```text
http://localhost:3000
```

### Frontend

```bash
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
|----------|----------|----------|
| POST | `/reporters` | Create reporter |
| GET | `/reporters` | Get all reporters |
| POST | `/editors` | Create editor |
| GET | `/editors` | Get all editors |
| POST | `/jobs` | Create job |
| GET | `/jobs` | Get all jobs |
| POST | `/jobs/:id/assign-reporter` | Assign reporter |
| PATCH | `/jobs/:id/status` | Update job status |
| POST | `/jobs/:id/assign-editor` | Assign editor |
| GET | `/jobs/:id/payment` | Calculate payout |

## Payment Rules

- Reporter: Rp 2,000 per minute
- Editor: Flat fee Rp 50,000

Example:

```text
Duration: 120 minutes

Reporter Payment = 120 × 2,000 = Rp 240,000
Editor Payment = Rp 50,000

Total Payout = Rp 290,000
```

## Auto Assignment Logic

### Reporter
- Prefer available reporters in the same city for physical jobs
- Fallback to any available reporter

### Editor
- Assign first available editor if none is selected manually

## Author

Built as a Court Reporting Workflow Manager using React, Express, Prisma, PostgreSQL, and TypeScript.
