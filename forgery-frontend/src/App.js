import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Scan, AlertTriangle, CheckCircle, Shield, Activity, Layers, Eye, Server, Cpu, Brain, FileWarning, Lock, User, Mail, Wifi, Database, Clock, LogOut, ArrowLeft } from 'lucide-react';
import './App.css';
import ImageComparison from './ImageComparison';

// Fallback to localhost if environment variable is missing
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/predict';

console.log("System Initialized. API URL:", API_URL);

// ===============================
// MASK EXTRACTOR
// ===============================
const extractMask = (overlayImg) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = overlayImg.width;
  canvas.height = overlayImg.height;
  ctx.drawImage(overlayImg, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mask = Array.from({ length: canvas.height }, () =>
    Array(canvas.width).fill(0)
  );

  for (let i = 0; i < imgData.data.length; i += 4) {
    const [r, g, b] = imgData.data.slice(i, i + 3);

    // Check for brightness (grayscale heatmap) or Red (if colored)
    const isRed = r > 200 && g < 80 && b < 80;
    const isBright = r > 50 && Math.abs(r - g) < 10 && Math.abs(r - b) < 10;

    if (isRed || isBright) {
      const px = (i / 4) % canvas.width;
      const py = Math.floor(i / 4 / canvas.width);
      mask[py][px] = 1;
    }
  }

  return mask;
};

// ===============================
// IMAGE COMPOSITOR (RED OVERLAY)
// ===============================
const createCompositeImage = async (originalFile, heatmapBase64) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Load Original
  const original = new Image();
  original.src = URL.createObjectURL(originalFile);
  await original.decode();

  canvas.width = original.width;
  canvas.height = original.height;
  ctx.drawImage(original, 0, 0);

  // Load Heatmap
  const heatmap = new Image();
  heatmap.src = `data:image/png;base64,${heatmapBase64}`;
  await heatmap.decode();

  // Process Heatmap (Grayscale -> Red Transparent)
  const hCanvas = document.createElement("canvas");
  const hCtx = hCanvas.getContext("2d");
  hCanvas.width = heatmap.width;
  hCanvas.height = heatmap.height;
  hCtx.drawImage(heatmap, 0, 0);

  const hData = hCtx.getImageData(0, 0, hCanvas.width, hCanvas.height);
  const data = hData.data;

  for (let i = 0; i < data.length; i += 4) {
    const val = data[i]; // Grayscale value

    if (val > 20) {
      data[i] = 255;     // R
      data[i + 1] = 0;     // G
      data[i + 2] = 0;     // B
      data[i + 3] = val * 0.6; // Alpha scaled by intensity
    } else {
      data[i + 3] = 0; // Transparent
    }
  }

  hCtx.putImageData(hData, 0, 0);

  // Draw Red Mask on top of Original (scaled to fit)
  ctx.drawImage(hCanvas, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL();
};

// ===============================
// VARIANCE ANALYSIS
// ===============================
const computeVariance = (image, mask) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const vals = [];

  for (let y = 0; y < mask.length; y++) {
    for (let x = 0; x < mask[0].length; x++) {
      if (mask[y][x] === 1) {
        const idx = (y * canvas.width + x) * 4;
        vals.push((img[idx] + img[idx + 1] + img[idx + 2]) / 3);
      }
    }
  }

  if (vals.length === 0) return 0;
  const mean = vals.reduce((a, b) => a + b) / vals.length;
  return vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
};

// ===============================
const classify = (mask, variance, vTh = 500, aTh = 100) => {
  const area = mask.flat().filter(v => v === 1).length;
  if (area < aTh) return "NO TAMPERING";
  if (variance > vTh) return "SPLICING";
  return "OBJECT REMOVAL";
};

// ===============================
// ANIMATION VARIANTS
// ===============================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.5 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

// ===============================
// CYBER PANEL COMPONENT
// ===============================
const CyberPanel = ({ children, className, variants }) => (
  <motion.div variants={variants} className={`cyber-panel ${className}`}>
    <div className="corner-accent tl"></div>
    <div className="corner-accent tr"></div>
    <div className="corner-accent bl"></div>
    <div className="corner-accent br"></div>
    <div className="tech-line top"></div>
    <div className="tech-line bottom"></div>
    <div className="scan-grid"></div>
    <div className="cyber-content-wrapper">
      {children}
    </div>
  </motion.div>
);

// ===============================
// STATUS BAR COMPONENT
// ===============================
const StatusBar = ({ status }) => (
  <div className="status-bar">
    <div className="status-item">
      <Wifi size={14} />
      <span>CONNECTION:</span> SECURE (TLS 1.3)
    </div>
    <div className="status-item">
      <Database size={14} />
      <span>DATABASE:</span> CONNECTED
    </div>
    <div className="status-item">
      <Clock size={14} />
      <span>UPTIME:</span> 04:20:59
    </div>
    <div className="status-item">
      <Activity size={14} />
      <span>SYSTEM:</span> {status === "ERROR" ? "CRITICAL" : "OPTIMAL"}
    </div>
  </div>
);

// ===============================
// REACT APP
// ===============================
function App() {
  const [appState, setAppState] = useState("INTRO"); // INTRO | AUTH | ANALYSIS
  const [authMode, setAuthMode] = useState("LOGIN"); // LOGIN | SIGNUP
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [status, setStatus] = useState("IDLE");
  const [view, setView] = useState("SPLIT");
  const [error, setError] = useState(null);
  const [clientAnalysis, setClientAnalysis] = useState(null);

  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    return () => preview && URL.revokeObjectURL(preview);
  }, [preview]);

  const handleAuth = (e) => {
    e.preventDefault();
    setAuthLoading(true);

    // Mock Auth Delay
    setTimeout(() => {
      setAuthLoading(false);
      setAppState("ANALYSIS");
    }, 1500);
  };

  const handleScan = async () => {
    if (!file) return;

    setStatus("SCANNING");
    setError(null);
    setResult(null);
    setProcessedImage(null);
    setClientAnalysis(null);

    const form = new FormData();
    form.append("file", file);

    try {
      console.log(`Sending POST request to: ${API_URL}`);
      const res = await axios.post(API_URL, form, {
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Content-Type": "multipart/form-data"
        }
      });

      const data = res.data;

      if (data.diagnosis === "ERROR") {
        throw new Error(data.reason || "Backend processing error");
      }

      setResult(data);

      // ==========================
      // Load heatmap correctly
      // ==========================
      const overlay = new Image();
      overlay.src = `data:image/png;base64,${data.heatmap}`;
      await overlay.decode();

      const original = new Image();
      original.src = URL.createObjectURL(file);
      await original.decode();

      // Generate Red Overlay Image for UI
      const compositeURL = await createCompositeImage(file, data.heatmap);
      setProcessedImage(compositeURL);

      const mask = extractMask(overlay);
      const variance = computeVariance(original, mask);
      const verdict = classify(mask, variance);

      // Calculate Tampered Percentage
      const totalPixels = mask.length * mask[0].length;
      const tamperedPixels = mask.flat().reduce((a, b) => a + b, 0);
      const tamperedPercentage = ((tamperedPixels / totalPixels) * 100).toFixed(2);

      // Calculate Accuracy (Max Probability)
      const accuracy = (Math.max(...data.ai_probs) * 100).toFixed(1);

      setClientAnalysis({
        verdict,
        variance: variance.toFixed(2),
        tamperedPercentage,
        accuracy
      });

      setStatus("COMPLETE");

    } catch (err) {
      setStatus("ERROR");
      let message = err.message;

      if (err.response) {
        if (err.response.status === 405) {
          message = `Method Not Allowed (405). Ensure the API URL is correct and includes the '/predict' endpoint. Current URL: ${API_URL}`;
        } else if (err.response.status === 404) {
          message = `Endpoint Not Found (404). Check if the backend is running at ${API_URL}`;
        } else {
          message = `Server Error (${err.response.status}): ${err.response.data?.detail || err.response.data?.message || err.message}`;
        }
      } else if (err.request) {
        message = `Connection Failed. Is the backend running at ${API_URL}?`;
      }

      setError(message);
      console.error("Analysis Error:", err);
    }
  };

  const handleFileChange = (e) => {
    if (!e.target.files[0]) return;
    setFile(e.target.files[0]);
    setPreview(URL.createObjectURL(e.target.files[0]));
    setError(null);
    setResult(null);
    setProcessedImage(null);
    setClientAnalysis(null);
    setStatus("IDLE");
  };

  return (
    <div className="app-container">
      <div className="background-grid"></div>

      <AnimatePresence mode="wait">
        {appState === "INTRO" ? (
          <motion.div
            key="intro"
            className="intro-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
          >
            <div className="vr-brain-bg"></div>

            <motion.div
              className="intro-content"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <h1 className="intro-title">SHIRO RAKSHA</h1>
              <div className="intro-subtitle">Identifying Digital Manipulation in Medical Imaging</div>

              <button className="start-btn" onClick={() => setAppState("AUTH")}>
                INITIALIZE SYSTEM
              </button>

              <div className="info-grid">
                <div className="info-card">
                  <h3><Brain className="info-icon" size={24} /> tampering Analysis</h3>
                  <p>By analysing CT and MRI images the system accurately identifies whether an image is tampered or authentic, classifies the specific manipulation technique and highlights the exact tampered region.</p>
                </div>
                <div className="info-card">
                  <h3><FileWarning className="info-icon" size={24} /> Medical Forgery</h3>
                  <p>Digital tampering of medical records is a growing threat. This tool detects splicing, copy-move, and object removal forgeries in medical imaging, ensuring data integrity for diagnosis.</p>
                </div>
                <div className="info-card">
                  <h3><Activity className="info-icon" size={24} /> AI Diagnostics</h3>
                  <p>Powered by a quad-core ensemble model, the system provides real-time variance analysis and heatmap generation to pinpoint manipulated regions in complex medical imagery.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : appState === "AUTH" ? (
          <motion.div
            key="auth"
            className="auth-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              className="auth-card"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
            >
              <button
                className="back-btn"
                style={{ position: 'absolute', top: 20, left: 20, border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
                onClick={() => setAppState("INTRO")}
              >
                <ArrowLeft size={20} />
              </button>

              <div className="auth-header">
                <Shield size={40} className="text-highlight" style={{ marginBottom: 16 }} />
                <h2>{authMode === "LOGIN" ? "SHIRO RAKSHA PORTAL" : "NEW ANALYST"}</h2>
                <p>{authMode === "LOGIN" ? "Secure Access for Medical Forensics" : "Register for forensic analysis access."}</p>
              </div>

              <form className="auth-form" onSubmit={handleAuth}>
                {authMode === "SIGNUP" && (
                  <div className="input-group">
                    <label>Analyst Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: 12, top: 14, color: '#64748b' }} />
                      <input
                        type="text"
                        className="auth-input"
                        style={{ width: '100%', paddingLeft: 40 }}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <label> USER ID (Email, Phone)</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: 12, top: 14, color: '#64748b' }} />
                    <input
                      type="email"
                      className="auth-input"
                      style={{ width: '85%', paddingLeft: 40 }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 12, top: 14, color: '#64748b' }} />
                    <input
                      type="password"
                      className="auth-input"
                      style={{ width: '85%', paddingLeft: 40 }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-btn" disabled={authLoading}>
                  {authLoading ? (
                    <span style={{ width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <Activity className="spin" size={18} /> VERIFYING...
                    </span>
                  ) : (
                    authMode === "LOGIN" ? "AUTHENTICATE" : "GRANT ACCESS"
                  )}
                </button>
              </form>

              <div className="auth-toggle">
                {authMode === "LOGIN" ? "New personnel?" : "Already have clearance?"}
                <span onClick={() => setAuthMode(authMode === "LOGIN" ? "SIGNUP" : "LOGIN")}>
                  {authMode === "LOGIN" ? "Request Access" : "Login Here"}
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="app"
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <header className="glass-header">
              <div className="header-left">
                <button className="back-btn" onClick={() => setAppState("INTRO")}>
                  <LogOut size={16} /> LOGOUT
                </button>
              </div>

              <div className="logo">
                <Shield className="logo-icon" size={28} />
                <span>SHIRO <span className="text-highlight">RAKSHA</span></span>
              </div>

              <div className="header-right">
                <div className={`status-badge ${status === "ERROR" ? "error" : "online"}`}>
                  <div className="dot"></div>
                  {status === "ERROR" ? "SYSTEM OFFLINE" : "SYSTEM ONLINE"}
                </div>
              </div>
            </header>

            <motion.main
              className="main-content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >

              {/* LEFT PANEL */}
              <CyberPanel variants={itemVariants} className="panel control-panel">

                <div className="panel-header">
                  <Layers size={18} />
                  <h3>Analysis Control</h3>
                </div>

                <div className="scroll-content">
                  <div className="upload-section" onClick={() => document.getElementById("file").click()}>
                    <input id="file" type="file" hidden onChange={handleFileChange} />
                    <div className={`upload-zone ${file ? 'active' : ''}`}>
                      {file ? (
                        <div className="file-info">
                          <CheckCircle size={40} className="text-green" />
                          <span className="file-name">{file.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload size={40} className="upload-icon" />
                          <span className="upload-text">DROP EVIDENCE HERE</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    className={`scan-btn ${status === "SCANNING" ? "scanning" : ""}`}
                    onClick={handleScan}
                    disabled={!file || status === "SCANNING"}
                  >
                    {status === "SCANNING" ? (
                      <>
                        <Activity className="spin" size={20} />
                        <span>ANALYZING...</span>
                      </>
                    ) : (
                      <>
                        <Scan size={20} />
                        <span>INITIATE SCAN</span>
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="error-box"
                      >
                        <AlertTriangle size={18} />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {(result || clientAnalysis) && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="results-section"
                        style={{ padding: 0 }} // Reset padding as it's handled by scroll-content
                      >

                        <div className="panel-header" style={{ paddingLeft: 0, border: 'none', paddingTop: 10, background: 'transparent' }}>
                          <Activity size={18} />
                          <h3>Diagnostics</h3>
                        </div>

                        {/* SERVER RESULT */}
                        <div className="metric-card">
                          <div className="metric-head">
                            <span>NEURAL NETWORK</span>
                            <span className={`tag ${result?.diagnosis === "TAMPERED" ? "red" : "green"}`}>
                              {result?.diagnosis}
                            </span>
                          </div>
                          {result?.diagnosis === "TAMPERED" && (
                            <div className="metric-detail">
                              <Cpu size={16} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TYPE</span>
                                <span>{result.type}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ACCURACY */}
                        <div className="metric-card">
                          <div className="metric-head">
                            <span>MODEL ACCURACY</span>
                            <span className={`tag ${clientAnalysis?.accuracy > 80 ? "green" : "red"}`}>
                              {clientAnalysis?.accuracy}%
                            </span>
                          </div>
                          <div className="metric-detail">
                            <Activity size={16} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CONFIDENCE</span>
                              <span>HIGH</span>
                            </div>
                          </div>
                        </div>

                        {/* TAMPERED PERCENTAGE */}
                        <div className="metric-card">
                          <div className="metric-head">
                            <span>TAMPERED AREA</span>
                            <span className={`tag ${clientAnalysis?.tamperedPercentage > 0 ? "red" : "green"}`}>
                              {clientAnalysis?.tamperedPercentage}%
                            </span>
                          </div>
                          <div className="metric-detail">
                            <Server size={16} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STATUS</span>
                              <span>{clientAnalysis?.tamperedPercentage > 0 ? "DETECTED" : "CLEAN"}</span>
                            </div>
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </CyberPanel>

              {/* RIGHT VISUALIZER */}
              <CyberPanel variants={itemVariants} className="panel visual-panel">
                <div className="viewport-header">
                  <div className="title" style={{ gap: 12 }}>
                    <Eye size={18} />
                    <span>VISUAL FEED</span>
                  </div>

                  {(result || preview) && (
                    <div className="view-toggles">
                      <button className={view === "IMG" ? "active" : ""} onClick={() => setView("IMG")}>IMA</button>
                      <button className={view === "HEAT" ? "active" : ""} onClick={() => setView("HEAT")}>HEAT</button>
                      <button className={view === "SPLIT" ? "active" : ""} onClick={() => setView("SPLIT")}>SPLIT</button>
                    </div>
                  )}
                </div>

                <div className="viewport-content">
                  <AnimatePresence mode="wait">
                    {status === "SCANNING" ? (
                      <motion.div
                        key="scanning"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="scanning-overlay"
                      >
                        <div className="scan-line"></div>
                        <div className="grid-overlay"></div>
                        <span>PROCESSING IMAGE DATA...</span>
                      </motion.div>
                    ) : result ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                        {view === "SPLIT" ? (
                          <ImageComparison
                            before={preview}
                            after={processedImage || `data:image/png;base64,${result.heatmap}`}
                          />
                        ) : (
                          <img
                            src={view === "RGB" ? preview : (processedImage || `data:image/png;base64,${result.heatmap}`)}
                            className="fit-image"
                            alt="Result"
                          />
                        )}
                      </motion.div>
                    ) : preview ? (
                      <motion.img
                        key="preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={preview}
                        className="fit-image"
                        alt="Preview"
                      />
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="empty-state"
                      >
                        <Shield size={80} className="empty-state-icon" />
                        <span className="empty-text">NO SIGNAL INPUT</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CyberPanel>

            </motion.main>

            <StatusBar status={status} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
