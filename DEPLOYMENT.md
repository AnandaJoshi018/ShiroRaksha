# MedScan Deployment Guide

This project has two parts: a **React frontend** and a **FastAPI backend** (with TensorFlow). Deploy them separately and connect the frontend to the backend URL.

---

## Overview

| Part      | Tech        | Deploy to                          |
|-----------|-------------|------------------------------------|
| Frontend  | React (CRA) | Vercel, Netlify, or any static host |
| Backend   | FastAPI     | Railway, Render, Fly.io, AWS, GCP, or any VPS |

**Important:** Set the frontend env var `REACT_APP_API_URL` to your **deployed backend URL including `/predict`**, e.g. `https://your-backend.railway.app/predict`.

---

## 1. Deploy Frontend (Vercel)

### Option A: Vercel (recommended)

1. **Push your code** to GitHub (if not already).

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
   - **Add New Project** → Import your repository.

3. **Configure the project**
   - **Root Directory:** Click **Edit** and set to `forgery-frontend` (required).
   - **Framework Preset:** Vercel usually detects Create React App.
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

4. **Environment variable**
   - In Project → **Settings** → **Environment Variables**, add:
   - **Name:** `REACT_APP_API_URL`
   - **Value:** `https://YOUR-BACKEND-URL/predict` (your deployed backend + `/predict`)
   - Apply to Production (and Preview if you want).

5. **Deploy**
   - Click **Deploy**. After the build, the app will be at `https://your-project.vercel.app`.

### SPA routing (optional)

If you use client-side routes and want all paths to serve `index.html`, add this in `forgery-frontend/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Option B: Netlify

1. Connect the repo at [netlify.com](https://netlify.com).
2. **Base directory:** `forgery-frontend`
3. **Build command:** `npm run build`
4. **Publish directory:** `forgery-frontend/build`
5. Add env var: `REACT_APP_API_URL` = `https://YOUR-BACKEND-URL/predict`

---

## 2. Deploy Backend

The backend uses **TensorFlow** and serves **.keras model files**. It needs enough memory (e.g. 1GB+ RAM) and must be able to run Python 3.11 and the dependencies in `forgery-backend/requirements.txt`.

### Option A: Docker (any cloud or VPS)

The repo includes `forgery-backend/Dockerfile`.

1. **Ensure model files** are in `forgery-backend` (see `forgery-backend/MODEL_UPLOAD_GUIDE.md` or `download_model.py` if needed).

2. **Build and run locally (test):**
   ```bash
   cd forgery-backend
   docker build -t medscan-backend .
   docker run -p 8000:8000 medscan-backend
   ```

3. **Deploy to a host that supports Docker:**
   - **Railway:** Connect repo, set root to `forgery-backend`, use Dockerfile or Nixpacks.
   - **Render:** New Web Service → Connect repo, root `forgery-backend`, use Docker.
   - **Fly.io:** `fly launch` in `forgery-backend`, use Dockerfile.
   - **AWS ECS, Google Cloud Run, etc.:** Build image from Dockerfile and deploy as usual.

4. **CORS:** The backend already allows all origins (`allow_origins=["*"]`). For production you can restrict this to your frontend domain in `backend.py` if you want.

5. **Base URL:** Use the URL your host gives (e.g. `https://medscan-api.railway.app`). The frontend must use `https://medscan-api.railway.app/predict` for `REACT_APP_API_URL`.

### Option B: Railway (simple, no Docker required)

1. Go to [railway.app](https://railway.app) and create a project.
2. **New** → **GitHub Repo** → select repo.
3. Set **Root Directory** to `forgery-backend`.
4. Railway will detect Python; ensure **Start Command** is:
   ```bash
   uvicorn backend:app --host 0.0.0.0 --port $PORT
   ```
   (Use `$PORT` if Railway provides it; otherwise `8000`.)
5. Add a **Public Domain** in the service settings.
6. Put your **.keras** model files in the repo (or use a build step to download them; see `download_model.py`).
7. Use the public URL + `/predict` as `REACT_APP_API_URL` in the frontend.

### Option C: Render

1. [Render](https://render.com) → **New** → **Web Service**.
2. Connect repo, set **Root Directory** to `forgery-backend`.
3. **Environment:** Python 3.
4. **Build:** `pip install -r requirements.txt`
5. **Start:** `uvicorn backend:app --host 0.0.0.0 --port $PORT` (use `$PORT` if Render sets it).
6. Ensure model files are present (in repo or via build script).
7. Use the Render URL + `/predict` for the frontend.

### Option D: VPS (Ubuntu example)

```bash
# On the server
sudo apt update && sudo apt install -y python3.11 python3.11-venv
git clone YOUR_REPO_URL && cd medscan-main/forgery-backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Add your .keras model files
# Run with a process manager (e.g. systemd or screen)
uvicorn backend:app --host 0.0.0.0 --port 8000
```

Use Nginx as reverse proxy with HTTPS (e.g. Let’s Encrypt) and point the frontend’s `REACT_APP_API_URL` to `https://your-domain.com/predict`.

---

## 3. Connect Frontend and Backend

1. **Backend:** Deploy first and note the **base URL** (e.g. `https://api.medscan.example.com`).
2. **Frontend:** Set `REACT_APP_API_URL` to the **full predict URL**:  
   `https://api.medscan.example.com/predict`
3. **Redeploy the frontend** after changing `REACT_APP_API_URL` so the new value is baked into the build.

---

## 4. Checklist

- [ ] Backend deployed and returning 200 at `GET /` or `/docs`.
- [ ] `.keras` model files present where the backend runs (see `forgery-backend/MODEL_UPLOAD_GUIDE.md`).
- [ ] `REACT_APP_API_URL` set to `https://YOUR-BACKEND-URL/predict` in the frontend host (Vercel/Netlify).
- [ ] Frontend redeployed after changing env vars.
- [ ] CORS allows your frontend origin if you tightened it in `backend.py`.

---

## 5. Quick reference

| Item | Value |
|------|--------|
| Frontend API env var | `REACT_APP_API_URL` |
| Full API endpoint | `https://your-backend/predict` |
| Backend port (default) | 8000 |
| Vercel root directory | `forgery-frontend` |
| Backend root for deploy | `forgery-backend` |
