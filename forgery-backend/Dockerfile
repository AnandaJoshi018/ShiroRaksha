FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies - suppress hash checking
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

# Copy all files (including model files)
COPY . .
# Verify model files are present after copy - FAIL BUILD if missing
RUN ls -la *.keras && echo "✅ Model files found in container" || (echo "❌ ERROR: No .keras files found! Build will fail." && exit 1)

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8000"]
