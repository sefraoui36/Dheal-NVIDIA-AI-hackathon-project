# DHeal Bio-Trust

A family health platform that verifies every health reading (SHA-256 hash chain, per-user baseline, anomaly detection) before AI is allowed to reason over it. Built for the Nebius x NVIDIA Global AI Hackathon.

**Live demo:** https://dheal-nvidia-ai-hackathon-project.vercel.app
**API docs:** https://dheal-nvidia-ai-hackathon-project-1.onrender.com/docs

## Stack
- Frontend: React 19, TypeScript, Vite, Tailwind, Recharts (`/frontend`)
- Backend: FastAPI, Python 3.11 (`/backend`)
- AI: NVIDIA Nemotron via Nebius Token Factory

## Run locally

Backend:
    cd backend
    pip install -r requirements.txt
    export NEBIUS_API_KEY=your_key_here
    uvicorn main:app --reload

Frontend:
    cd frontend
    npm install
    npm run dev

## Try it
Open the live demo and click **Simulate Attack** to inject a tampered 198 BPM reading. The trust layer flags it and Nemotron refuses to reason over it.

## License
MIT
