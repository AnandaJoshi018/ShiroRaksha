# How to Add Model Files to Render Backend

The backend needs `.keras` model files to work. Here are 3 ways to add them:

---

## Option 1: Add Models to GitHub (Recommended if you have the files)

If you have the `.keras` file(s) locally:

1. **Copy your model file(s) to `forgery-backend/` directory:**
   ```bash
   cd forgery-backend
   # Copy your .keras file here (e.g., forensic_quad_core.keras)
   ```

2. **Add to git and push:**
   ```bash
   git add *.keras
   git commit -m "Add model files"
   git push
   ```

3. **Render will auto-redeploy** and the models will be available.

---

## Option 2: Download During Build (If you have a download URL)

If your models are hosted somewhere (Google Drive, S3, etc.), modify the Dockerfile to download them during build.

**Update `Dockerfile`** to add a download step before the CMD:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

# Install gdown for downloading from Google Drive (if needed)
RUN pip install --no-cache-dir gdown

# Copy application
COPY . .

# Download model files if they don't exist
# Replace YOUR_MODEL_URL with your actual download URL
RUN if [ ! -f "forensic_quad_core.keras" ]; then \
        echo "Downloading model files..."; \
        # Example: Download from Google Drive
        # gdown "YOUR_GOOGLE_DRIVE_FILE_ID" -O forensic_quad_core.keras; \
        # Or use wget/curl for direct URLs
        # wget "YOUR_MODEL_URL" -O forensic_quad_core.keras; \
    fi

EXPOSE 8000

CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8000"]
```

Then push to GitHub and Render will rebuild.

---

## Option 3: Upload via Render Shell (Quick fix)

1. Go to Render dashboard → Your service → **Shell** tab
2. Upload your `.keras` file(s) to `/app/` directory
3. Restart the service

**Note:** This is temporary - files will be lost on next deployment. Use Option 1 or 2 for permanent solution.

---

## What Model Files Are Needed?

The backend looks for any `*.keras` files in the `forgery-backend` directory. Common names:
- `forensic_quad_core.keras`
- Or any other `.keras` file(s) your model uses

---

## Verify Models Are Loaded

After adding models, check Render logs for:
- ✅ `✅ Loaded: forensic_quad_core.keras` = Success!
- ❌ `❌ No models found (*.keras)` = Still missing

---

## Need Help?

If you don't have the model files, you'll need to:
1. Train the model and save as `.keras`
2. Or get them from the original project/author
3. Or use a pre-trained model compatible with your backend code
