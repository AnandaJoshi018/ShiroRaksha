# MedScan Project Setup and Run Instructions

This project consists of a React frontend and a Python FastAPI backend.

## Prerequisites

- Node.js and npm installed.
- Python installed (3.8+ recommended).

## 1. Backend Setup (`forgery-backend`)

The backend is a FastAPI application that uses TensorFlow and other libraries for image analysis.

### Steps:

1.  **Navigate to the backend directory:**
    ```bash
    cd forgery-backend
    ```

2.  **Activate the Virtual Environment:**
    - **Windows (PowerShell):**
      ```powershell
      .\venv\Scripts\activate
      ```
    - **Windows (Command Prompt):**
      ```cmd
      .\venv\Scripts\activate.bat
      ```
    - **Linux/macOS:**
      ```bash
      source venv/bin/activate
      ```

3.  **Install Dependencies:**
    ```bash
    pip install uvicorn numpy opencv-python tensorflow fastapi scikit-image pillow python-multipart
    ```

4.  **Run the Server:**
    ```bash
    python backend.py
    ```
    The server will start at `http://0.0.0.0:8000`.

## 2. Frontend Setup (`forgery-frontend`)

The frontend is a React application.

### Steps:

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../forgery-frontend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Start the Development Server:**
    ```bash
    npm start
    ```
    The application will open in your browser at `http://localhost:3000`.

## 3. Vercel Deployment

To deploy the frontend on Vercel:

1.  Connect your GitHub repository to Vercel.
2.  **Crucial:** Set the **Root Directory** to `forgery-frontend` in the project settings on Vercel.
3.  Add the environment variable `REACT_APP_API_URL` (pointing to your hosted backend) in Vercel settings.

## Troubleshooting

-   **Backend Port Conflict:** If port 8000 is in use, modify the `port` argument in `backend.py`.
-   **Missing Models:** Ensure the `.keras` model files are present in the `forgery-backend` directory.

