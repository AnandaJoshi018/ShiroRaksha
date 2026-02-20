# MedScan / ShiroRaksha — Complete Project Documentation

**Project Name:** MedScan (ShiroRaksha)  
**Type:** Image forgery detection & tampering analysis  
**Stack:** React (frontend) + FastAPI + TensorFlow (backend)

---

## 1. Problem Statement

- **Trust in digital images:** Photos and screenshots are used as evidence in news, courts, and social media. Manipulated images can spread misinformation and harm trust.
- **Need for accessible verification:** Non-experts need a simple way to check if an image is likely authentic or tampered, and what kind of manipulation (splicing, retouching, object removal) was applied.
- **Gap in tools:** Many forensic tools are research-only or desktop-only; there is a need for a web-based, user-friendly tool that gives a clear verdict and visual explanation (e.g. heatmaps).

**In short:** Build a web app that lets users upload an image and get an automated assessment of whether it is authentic or tampered, with type of tampering and a visual heatmap.

---

## 2. Solution Overview

- **Web application:** Users upload an image; the system returns a verdict (Authentic / Tampered), tampering type (Retouching, Splicing, Object Removal), and visual outputs (heatmap, mask).
- **Backend logic:**
  - **AI:** Pre-trained deep learning model(s) in TensorFlow/Keras that do:
    - **Classification:** 4 classes — Authentic, Retouching, Splicing, Object Removal.
    - **Segmentation:** Predict a mask of likely tampered regions.
  - **Physics-based check:** Texture variance (foreground vs background) is used to refine the decision (e.g. splicing vs object removal) and improve robustness.
- **Frontend:** React app for upload, progress, and display of results (verdict, type, heatmap overlay, basic stats).

---

## 3. Tools & Technologies Used

### 3.1 Frontend
| Tool | Purpose |
|------|--------|
| **React 19** | UI framework |
| **Create React App (react-scripts 5.0.1)** | Build and dev server |
| **Axios** | HTTP client for API calls to backend |
| **Framer Motion** | Animations and transitions |
| **Lucide React** | Icons |
| **Node.js / npm** | Runtime and package management |

### 3.2 Backend
| Tool | Purpose |
|------|--------|
| **Python 3.11** | Backend runtime |
| **FastAPI** | REST API (e.g. `/predict`, `/health`) |
| **Uvicorn** | ASGI server |
| **TensorFlow 2.14** | Load and run Keras models (inference) |
| **Keras** | Model format (`.keras`), custom loss (hybrid_loss, dice_coef) |
| **NumPy** | Array operations |
| **OpenCV (opencv-python-headless)** | Image processing, morphology, resize |
| **scikit-image** | Resize, connected components (e.g. `measure.label`, `regionprops`) |
| **Pillow (PIL)** | Image I/O and conversion |
| **python-multipart** | File upload (multipart/form-data) |

### 3.3 Model Training (Inferred from Code)
| Tool | Purpose |
|------|--------|
| **TensorFlow 2.x / Keras** | Training and saving models |
| **Custom losses** | `hybrid_loss` (Binary Cross-Entropy + Dice), `dice_coef` for segmentation |
| **Output design** | Model outputs: (1) classification logits/probs for 4 classes, (2) segmentation mask (128×128×1) |
| **Input** | Grayscale images resized to 128×128 |
| **Ensemble** | Backend can load multiple `.keras` files and average predictions (classification + mask) |

*Note: The repository ships a pre-trained model (`forensic_quad_core.keras`); the exact training script/dataset is not in the repo but the architecture is compatible with the above.*

### 3.4 Deployment & DevOps
| Tool | Purpose |
|------|--------|
| **Docker** | Backend container (Python 3.11, dependencies, app + model) |
| **Render** | Host backend (Docker, free tier) |
| **Vercel** | Host frontend (static + serverless if needed) |
| **GitHub** | Source control and CI triggers |
| **Environment variables** | e.g. `REACT_APP_API_URL`, `PORT` for backend |

---

## 4. Datasets — Information & Where to Get Them

The project uses a **pre-trained model**; the exact dataset used to train it is not specified in the repo. For **re-training or research**, you would typically use public image forgery / manipulation datasets. Below are common options.

### 4.1 Generic image forgery / tampering
- **CASIA v1 / v2**  
  - Tampered vs authentic images; various manipulations.  
  - Often used in papers; availability via academic request or mirrors (search “CASIA tampering dataset”).
- **COVERAGE**  
  - Copy-move forgery.  
  - Search “COVERAGE dataset copy move forgery” for papers and links.
- **NIST Nimble 2016/2017**  
  - Manipulation detection.  
  - [NIST Nimble](https://www.nist.gov/itl/iad/mig/nimble-challenge-2017) (check current links).
- **DEFACTO**  
  - Face manipulation.  
  - Search “DEFACTO face forgery dataset”.

### 4.2 Splicing / composite
- **Columbia Uncompressed Image Splicing**  
  - Splicing detection.  
  - Search “Columbia image splicing dataset”.
- **DSO-1**  
  - Splicing.  
  - Often linked from forensic/vision papers.

### 4.3 Object removal / inpainting
- **Image inpainting datasets**  
  - Used to train or evaluate “object removal” type forgeries (e.g. places2, inpainting benchmarks).
- **Custom data**  
  - Create pairs: original vs object-removed (using inpainting tools) and label as “Object Removal”.

### 4.4 Retouching
- **ND-IIITD Retouching**  
  - Face retouching detection.  
  - Search “ND-IIITD retouching dataset”.
- **Custom**  
  - Original vs retouched (e.g. Photoshop, GAN-based) with “Retouching” label.

### 4.5 Practical notes
- **Labels:** For this project you need at least: **Authentic**, **Retouching**, **Splicing**, **Object Removal** (and optionally pixel-level masks for tampered regions).
- **Format:** Training code (not in repo) would typically expect images (e.g. grayscale 128×128) and masks; you’d need to write a data pipeline (e.g. TensorFlow `Dataset` or Keras `ImageDataGenerator`).
- **Pre-trained model:** The included `forensic_quad_core.keras` is likely trained on one or more of the above (or similar); for citation and reproducibility, refer to the original model authors if known.

---

## 5. Model Architecture & Training (Inferred)

- **Input:** Grayscale image, resized to **128×128**.
- **Outputs:**
  - **Classification:** 4 classes — Authentic (0), Retouching (1), Splicing (2), Object Removal (3).
  - **Segmentation:** 128×128×1 mask (tampered region).
- **Loss:** Custom objects used at load time:
  - `dice_coef`, `dice_loss`, `hybrid_loss` (BCE + dice) — typical for segmentation + optional classification head.
- **Inference:** Ensemble of one or more `.keras` models; predictions averaged (class probs + mask).
- **Training tools (typical):** TensorFlow/Keras, GPU optional; data pipeline as above. Exact optimizer, epochs, and augmentation are not in the repo.

---

## 6. System Architecture

```
[User] → [React Frontend (Vercel)]
              ↓ HTTPS POST /predict (multipart image)
         [FastAPI Backend (Render)]
              ↓ Load image, resize to 128×128
         [TensorFlow model(s) .keras]
              ↓ Classification + segmentation
         [Physics module: texture variance]
              ↓ Final type (Splicing / Removal / Retouching)
         [JSON: diagnosis, type, reason, heatmap, mask]
              ↓
         [Frontend] → Display verdict, heatmap, stats
```

- **Frontend:** `forgery-frontend` (React), env: `REACT_APP_API_URL` = backend `/predict` URL.
- **Backend:** `forgery-backend` (FastAPI + TensorFlow), Docker on Render, port from `PORT`.
- **Endpoints:** `GET /`, `GET /health`, `POST /predict` (file upload).

---

## 7. Outcomes

- **Working web app:** Users can upload an image and get:
  - Verdict: Authentic or Tampered.
  - Type: Retouching, Splicing, or Object Removal (with short reason).
  - Heatmap and mask overlays.
  - Basic stats (e.g. tampered %, confidence).
- **Deployment:** Frontend on Vercel, backend on Render, connected via environment variable.
- **API:** REST API suitable for integration with other tools or scripts.
- **Extensibility:** Support for multiple `.keras` models (ensemble) and physics-based refinement.

---

## 8. Future Scope

- **More datasets:** Train or fine-tune on larger and more diverse forgery datasets (splicing, removal, retouching, deepfakes).
- **Deepfake detection:** Extend to video or face-swap detection (different model/head).
- **Explainability:** Gradient-based or attention visualizations to show which regions most influenced the decision.
- **Performance:** Model quantization (TFLite), pruning, or smaller backbone for faster inference and lower cost.
- **UX:** Batch upload, history of past scans, optional user accounts, export report (PDF).
- **Security:** Rate limiting, file type/size checks, optional authentication for API.
- **Research:** Publish results on public benchmarks (e.g. CASIA, NIST) and document dataset and training details for reproducibility.

---

## 9. Repository Structure (Summary)

```
medscan-main/
├── forgery-frontend/          # React app
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   └── ...
│   └── package.json
├── forgery-backend/           # FastAPI + TensorFlow
│   ├── backend.py             # API, model load, inference, physics
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── forensic_quad_core.keras  # Pre-trained model (if added)
│   ├── download_model.py      # Optional: download model from URL
│   └── ADD_MODELS.md
├── render.yaml                # Render deployment config
├── README.md
├── DEPLOYMENT.md
└── PROJECT_DOCUMENTATION.md   # This file
```

---

## 10. Quick Reference

| Item | Detail |
|------|--------|
| **Frontend URL** | e.g. `https://shiroraksha-scan.vercel.app` |
| **Backend URL** | e.g. `https://shiro-raksha-backend.onrender.com` |
| **API base** | `REACT_APP_API_URL` = `https://.../predict` |
| **Model file** | `forensic_quad_core.keras` (in `forgery-backend/`) |
| **Classes** | Authentic, Retouching, Splicing, Object Removal |
| **Input size** | 128×128 grayscale |
| **Backend port** | 8000 (or `PORT` from env) |

---

*This document summarizes the MedScan/ShiroRaksha project: problem, solution, tools, datasets, model design, architecture, outcomes, and future work in one place.*
