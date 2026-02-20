# Railway Deployment Guide for MedScan Backend

This guide walks you through deploying the MedScan backend to Railway.

---

## Prerequisites

- ✅ GitHub repository with your code pushed
- ✅ Railway account ([railway.app](https://railway.app))
- ✅ `.keras` model file(s) ready (e.g., `forensic_quad_core.keras`)

---

## Step-by-Step Deployment

### 1. Create a New Project on Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"** (or **"Deploy"** → **"Deploy from GitHub Repo"**)
3. Select **"Deploy from GitHub Repo"**
4. Choose your repository: `medscan-main` (or your repo name)
5. Railway will create a new project

---

### 2. Configure the Service

After Railway detects your repo, it will try to auto-detect the service. Configure it:

1. **Click on the service** (it might be named after your repo or "backend")
2. Go to **Settings** tab
3. Set **Root Directory** to: `forgery-backend`
   - This tells Railway where your backend code is

---

### 3. Configure Build & Start Commands

Railway will auto-detect Python, but verify these settings:

**In the Settings tab:**

- **Build Command:** (leave empty or Railway auto-detects)
- **Start Command:** 
  ```
  uvicorn backend:app --host 0.0.0.0 --port $PORT
  ```
  - Railway provides `$PORT` automatically

**OR** Railway can use your `Dockerfile`:
- If Railway detects `forgery-backend/Dockerfile`, it will use Docker
- The Dockerfile already has the correct CMD, but Railway will override port with `$PORT`

---

### 4. Add Model Files

The backend needs `.keras` model files in the `forgery-backend` directory. You have **3 options**:

#### Option A: Push to GitHub (Recommended)

1. **Add your `.keras` file(s) to the repo:**
   ```bash
   cd forgery-backend
   # Copy your model file here
   # e.g., cp /path/to/forensic_quad_core.keras .
   git add *.keras
   git commit -m "Add model files"
   git push
   ```

2. Railway will automatically redeploy when you push

#### Option B: Use Railway's Volume (for large files)

1. In Railway dashboard → **Settings** → **Volumes**
2. Create a new volume
3. Mount it to `/app` (or wherever your models are)
4. Upload files via Railway CLI or SSH

#### Option C: Download During Build

Modify `Dockerfile` or add a build script to download models from cloud storage (see `download_model.py`)

---

### 5. Set Environment Variables (Optional)

In Railway → **Settings** → **Variables**, you can add:

- `PORT` - Railway sets this automatically, don't override
- Any other env vars your app needs

---

### 6. Generate Public Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"** or **"Add Domain"**
3. Railway will create a public URL like: `https://your-service.up.railway.app`
4. **Copy this URL** - you'll need it for the frontend!

---

### 7. Deploy

1. Railway will automatically deploy when you:
   - Push to the connected branch (usually `main`)
   - Or manually trigger: **Deployments** → **"Redeploy"**

2. **Watch the logs:**
   - Go to **Logs** tab to see build and runtime output
   - Look for: `✅ Loaded: forensic_quad_core.keras` (or your model filename)
   - If you see `❌ No models found (*.keras)`, the model files aren't in the right place

---

### 8. Verify Deployment

1. **Check the API docs:**
   - Visit: `https://your-service.up.railway.app/docs`
   - You should see FastAPI Swagger UI

2. **Test the endpoint:**
   - Visit: `https://your-service.up.railway.app/predict`
   - Should return 405 (Method Not Allowed) - that's normal, it expects POST

3. **Check logs for model loading:**
   - In Railway → **Logs**
   - Should see: `🚀 Ensemble ready with X models.`

---

### 9. Connect Frontend to Backend

1. Go to your **Vercel** project (frontend)
2. **Settings** → **Environment Variables**
3. Add:
   - **Name:** `REACT_APP_API_URL`
   - **Value:** `https://your-service.up.railway.app/predict`
     - ⚠️ **Important:** Include `/predict` at the end!
4. **Redeploy** the frontend

---

## Troubleshooting

### ❌ "No models found (*.keras)"

**Solution:** Ensure `.keras` files are in `forgery-backend/` directory and pushed to GitHub.

**Check:**
```bash
cd forgery-backend
ls *.keras  # Should list your model files
```

### ❌ Build fails with TensorFlow errors

**Solution:** Railway might be using Python 3.13. The Dockerfile uses Python 3.11 which is compatible with TensorFlow 2.14. Railway should auto-detect the Dockerfile.

**If not using Docker:**
- Railway might need Python 3.11 or 3.12
- Check **Settings** → **Build** → Python version

### ❌ Port binding error

**Solution:** The backend now uses `$PORT` from Railway. If you see port errors, check:
- Start command includes `--port $PORT`
- Railway sets `PORT` automatically (don't override it)

### ❌ Service crashes on startup

**Check logs:**
- Railway → **Logs** tab
- Look for Python errors, missing dependencies, or model loading failures

**Common fixes:**
- Ensure `requirements.txt` has all dependencies
- Verify model files are present
- Check memory limits (TensorFlow needs ~1GB+ RAM)

---

## Railway Configuration Files (Optional)

You can create `railway.json` in `forgery-backend/` for more control:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn backend:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Or use `nixpacks.toml` for Nixpacks (Railway's auto-detector):

```toml
[phases.setup]
nixPkgs = ["python311", "pip"]

[phases.install]
cmds = ["pip install -r requirements.txt"]

[start]
cmd = "uvicorn backend:app --host 0.0.0.0 --port $PORT"
```

---

## Quick Reference

| Item | Value |
|------|-------|
| **Root Directory** | `forgery-backend` |
| **Start Command** | `uvicorn backend:app --host 0.0.0.0 --port $PORT` |
| **Port** | `$PORT` (Railway sets automatically) |
| **Model Files** | `*.keras` in `forgery-backend/` directory |
| **API Endpoint** | `https://your-service.up.railway.app/predict` |
| **API Docs** | `https://your-service.up.railway.app/docs` |

---

## Next Steps

✅ Backend deployed → Get Railway URL  
✅ Set `REACT_APP_API_URL` in Vercel → `https://your-service.up.railway.app/predict`  
✅ Redeploy frontend → Test the full app!

---

**Need help?** Check Railway logs or [Railway Discord](https://discord.gg/railway).
