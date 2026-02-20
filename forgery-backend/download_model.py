import os
import gdown

# Download model from Google Drive (or any cloud storage)
# You'll need to upload your .keras file to Google Drive and get the share link

def download_model():
    """
    Download the model file if it doesn't exist locally.
    Replace MODEL_ID with your actual Google Drive file ID.
    """
    model_path = "forensic_quad_core.keras"
    
    if os.path.exists(model_path):
        print(f"✅ Model file found: {model_path}")
        return
    
    # Upload your model to Google Drive and get the share link
    # Extract the file ID from: https://drive.google.com/file/d/FILE_ID/view
    MODEL_ID = "YOUR_GOOGLE_DRIVE_FILE_ID"
    
    try:
        print("🔄 Downloading model from cloud storage...")
        gdown.download(f'https://drive.google.com/uc?id={MODEL_ID}', model_path, quiet=False)
        print(f"✅ Model downloaded: {model_path}")
    except Exception as e:
        print(f"❌ Failed to download model: {e}")
        raise

if __name__ == "__main__":
    download_model()
