# Model Upload Guide for Render

## Step 1: Access Render Shell
1. Go to your Render dashboard
2. Click on your service: **ShiroRaksha**
3. Click the **Shell** tab at the top

## Step 2: Upload Model File
In the shell, you can use commands to:
- Check current directory: `pwd`
- List files: `ls -la`
- Create directories: `mkdir -p /opt/render/project/src`

## Step 3: Upload via Render Dashboard
1. In the Shell tab, look for the **file upload** button
2. Select your local `forensic_quad_core.keras` file
3. Upload to root directory

## Step 4: Verify Upload
```bash
ls *.keras
```

You should see: `forensic_quad_core.keras`

## Step 5: Restart Service
Once uploaded, click **Restart** to reload the backend and load the model.

---

**Alternative: Direct Upload via SSH/SFTP**
If Render's shell doesn't have file upload:
1. Copy the model to your local repo
2. Push to GitHub
3. Render will automatically redeploy

---

**Status Check:**
After restart, visit: `https://shiroraksha.onrender.com/docs`
If the API loads, the backend is ready!
