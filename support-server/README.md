# PlayHub Support Server

A standalone feedback collection server for PlayHub.

## Features
- **Feedback API**: Accepts feedback submissions via POST `/api/feedback`.
- **Dashboard**: View and filter feedback at `http://localhost:3000/dashboard.html`.
- **Data Export**: Export feedback to CSV via Dashboard or `/api/feedback/export`.
- **Security**: Rate limiting, Helmet headers, and simple API Key authentication.
- **Persistence**: Stores data in `data/feedback.json`.

## Prerequisites
- Node.js (v14 or higher)
- npm

## Setup & Run

1. Navigate to this directory:
   ```bash
   cd support-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   Or for development (auto-restart):
   ```bash
   npm run dev
   ```

The server will run on **http://localhost:3000**.

## Authentication

- **API Submissions**: Requires header `X-API-Key: playhub-secret-key`.
- **Dashboard Access**: Requires Basic Auth.
  - Username: `admin`
  - Password: `password`

## Directory Structure
- `src/server.js`: Main Express application.
- `src/public/`: Static files for the Dashboard.
- `data/feedback.json`: JSON storage for feedback entries.
