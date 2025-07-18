# Empire’s Edge

![GitHub repo size](https://img.shields.io/github/repo-size/puppyprogrammer/EmpiresEdge)
![GitHub last commit](https://img.shields.io/github/last-commit/puppyprogrammer/EmpiresEdge)
![Vercel](https://img.shields.io/badge/deployed%20on-vercel-000000?logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/database-supabase-3ecf8e?logo=supabase&logoColor=white)
![React](https://img.shields.io/badge/frontend-react-61dafb?logo=react&logoColor=black)
![JavaScript](https://img.shields.io/badge/language-javascript-yellow?logo=javascript&logoColor=black)
![PHP](https://img.shields.io/badge/backend-php-777bb4?logo=php&logoColor=white)

---

## Project Overview

**Empire’s Edge** is a nation-building multiplayer PvP idle game featuring a dynamic 100x100 tile map rendered with React and Vite. The backend uses Supabase for real-time data and authentication, deployed seamlessly on Vercel for fast and reliable hosting.

This repo contains the frontend React application, which fetches tile data from Supabase and renders the interactive game map without relying on Tailwind CSS for styling.

---

## Tech Stack

- **Frontend:** React (functional components, hooks), Vite for fast development and optimized builds
- **Backend:** Supabase (PostgreSQL, realtime, auth)
- **Deployment:** Vercel (frontend hosting)
- **Languages:** JavaScript (ES6+), optionally PHP backend for additional APIs or server-side logic
- **Styling:** Custom CSS and inline styles (no Tailwind)

---

## Getting Started

### Prerequisites

- Node.js v18+ recommended
- npm or yarn
- Supabase project setup with public `tiles` table

### Installation

```bash
git clone https://github.com/puppyprogrammer/EmpiresEdge.git
cd EmpiresEdge/empire-edge-frontend
npm install
