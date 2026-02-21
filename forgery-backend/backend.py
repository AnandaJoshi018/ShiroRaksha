import uvicorn
import numpy as np
import cv2
import tensorflow as tf
import base64
import os
import glob
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from skimage.transform import resize
from skimage import measure
from io import BytesIO
from PIL import Image

# -------------------------------------------------------
# CONFIG
# -------------------------------------------------------
IMG_SIZE = 128
CLASS_MAP = {0: 'Authentic', 1: 'Retouching', 2: 'Splicing', 3: 'Object Removal'}

THRES_SPLICING_RATIO = 1.5
THRES_REMOVAL_RATIO  = 0.5

# -------------------------------------------------------
# FASTAPI
# -------------------------------------------------------
app = FastAPI()

@app.on_event("startup")
async def startup_event():
    """Load models on startup for faster first request"""
    print("Starting backend...")
    load_ensemble()
    if models:
        print(f"Backend ready with {len(models)} model(s)")
    else:
        print("Warning: No models loaded. Check for .keras files in the directory.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

models = []
last_model_error = "No .keras files found or attempted"

# -------------------------------------------------------
# LOSS DEFINITIONS (for loading models)
# -------------------------------------------------------
def dice_coef(y_true, y_pred, s=1e-7):
    y_true_f = tf.cast(tf.reshape(y_true, [-1]), tf.float32)
    y_pred_f = tf.cast(tf.reshape(y_pred, [-1]), tf.float32)
    return (2. * tf.reduce_sum(y_true_f * y_pred_f) + s) / (tf.reduce_sum(y_true_f) + tf.reduce_sum(y_pred_f) + s)

def dice_loss(y,p): return 1 - dice_coef(y,p)
def hybrid_loss(y,p): return tf.keras.losses.BinaryCrossentropy()(y,p) + dice_loss(y,p)

# -------------------------------------------------------
# LOAD ENSEMBLE
# -------------------------------------------------------
def load_ensemble():
    global models, last_model_error
    if models:
        return

    # Use absolute path relative to this script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "forensic_quad_core.keras")
    
    print(f"DEBUG: Backend Script Path: {os.path.abspath(__file__)}")
    print(f"DEBUG: Looking for model at: {model_path}")
    print(f"DEBUG: Directory contents: {os.listdir(base_dir)}")
    
    if not os.path.exists(model_path):
        msg = f"ERROR: The model file was NOT found at {model_path}!"
        print(msg)
        last_model_error = msg
        return

    print("SUCCESS: Found forensic_quad_core.keras!")
    print("Loading Model...")
    try:
        m = tf.keras.models.load_model(
            model_path,
            custom_objects={"hybrid_loss": hybrid_loss, "dice_coef": dice_coef}
        )
        models.append(m)
        print("Loaded: forensic_quad_core.keras")
    except Exception as e:
        err_msg = f"Failed loading forensic_quad_core.keras: {str(e)}"
        print(err_msg)
        last_model_error = err_msg

    print(f"Ensemble ready with {len(models)} models.")

# -------------------------------------------------------
# PHYSICS ENGINE
# -------------------------------------------------------
def analyze_texture_physics(img, mask_bin):
    fg_pixels = img[mask_bin > 0]
    if len(fg_pixels) < 10:
        return "Authentic", 0, 0, 1.0

    bg_mask = (mask_bin == 0) & (img > 10)
    bg_pixels = img[bg_mask]
    if len(bg_pixels) < 10:
        bg_pixels = img[mask_bin == 0]

    fg_var = np.var(fg_pixels)
    bg_var = np.var(bg_pixels)
    if bg_var == 0:
        bg_var = 0.1

    ratio = fg_var / bg_var

    if ratio > THRES_SPLICING_RATIO:
        return "SPLICING", fg_var, bg_var, ratio
    elif ratio < THRES_REMOVAL_RATIO:
        return "OBJECT_REMOVAL", fg_var, bg_var, ratio
    else:
        return "RETOUCHING", fg_var, bg_var, ratio

# -------------------------------------------------------
# HELPERS
# -------------------------------------------------------
def to_base64(img):
    """Convert numpy image to PNG base64."""
    if img.dtype != np.uint8:
        img = (img * 255).astype(np.uint8)

    pil_img = Image.fromarray(img)
    buff = BytesIO()
    pil_img.save(buff, format="PNG")
    return base64.b64encode(buff.getvalue()).decode()

# -------------------------------------------------------
# API ROUTES
# -------------------------------------------------------
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "models_loaded": len(models),
        "message": "MedScan Backend API is running"
    }

@app.get("/health")
async def health():
    """Health check with model status"""
    return {
        "status": "healthy",
        "models_loaded": len(models),
        "models_ready": len(models) > 0
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    load_ensemble()

    content = await file.read()
    img = Image.open(BytesIO(content)).convert("L")
    img_raw = np.array(img)

    # Resize to model input
    x = resize(img_raw, (IMG_SIZE, IMG_SIZE), anti_aliasing=True).astype(np.float32)
    x_in = np.expand_dims(x, (0, -1))

    # ENSEMBLE INFERENCE
    total_probs = np.zeros((1, 4))
    total_mask = np.zeros((1, 128, 128, 1))

    for m in models:
        p_cls, p_seg = m.predict(x_in, verbose=0)
        total_probs += p_cls
        total_mask += p_seg

    if not models:
        return {
            "diagnosis": "ERROR",
            "type": "NONE",
            "reason": f"No models loaded. Error details: {last_model_error}",
            "ai_probs": [0, 0, 0, 0],
            "heatmap": "",
            "mask": ""
        }

    avg_probs = total_probs / len(models)
    avg_mask = (total_mask / len(models)).squeeze()

    # MASK PROCESSING
    mask_bin = (avg_mask > 0.05).astype(np.uint8)
    kernel = np.ones((3,3), np.uint8)
    mask_clean = cv2.morphologyEx(mask_bin, cv2.MORPH_OPEN, kernel)

    labels = measure.label(mask_clean)
    mask_final = np.zeros_like(mask_clean)
    found_blob = False

    for region in measure.regionprops(labels):
        if region.area >= 20:
            found_blob = True
            minr, minc, maxr, maxc = region.bbox
            mask_final[minr:maxr, minc:maxc] = region.image

    # CLASSIFICATION
    if not found_blob:
        return {
            "diagnosis": "AUTHENTIC",
            "type": "NONE",
            "reason": "No anomalies detected.",
            "ai_probs": avg_probs[0].tolist(),
            "heatmap": to_base64(avg_mask),
            "mask": to_base64(mask_final),
        }

    # Tampering detected
    ai_idx = int(np.argmax(avg_probs))
    ai_vote = CLASS_MAP[ai_idx].upper()

    mask_full = cv2.resize(mask_final, (img_raw.shape[1], img_raw.shape[0]), interpolation=cv2.INTER_NEAREST)
    phys_type, f_var, b_var, ratio = analyze_texture_physics(img_raw, mask_full)

    # DECISION RULE
    if phys_type in ["OBJECT_REMOVAL", "OBJECT REMOVAL"]:
        final_type = "OBJECT REMOVAL"
        reason = f"Patch is {1/ratio:.2f}x smoother than background (Physics)."
    elif phys_type == "SPLICING":
        final_type = "SPLICING"
        reason = f"Patch is {ratio:.2f}x rougher than background (Physics)."
    else:
        # Physics ambiguous → rely on AI consensus
        final_type = ai_vote
        reason = f"Physics ambiguous; AI consensus indicates {final_type}."

    return {
        "diagnosis": "TAMPERED",
        "type": final_type,
        "reason": reason,
        "ai_probs": avg_probs[0].tolist(),
        "heatmap": to_base64(avg_mask),
        "mask": to_base64(mask_final),
    }

# -------------------------------------------------------
# RUN
# -------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
