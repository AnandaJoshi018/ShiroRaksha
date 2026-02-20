FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies - suppress hash checking
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

# Copy application files first
COPY *.py .
COPY requirements.txt .
# Copy model files explicitly
COPY *.keras . 2>/dev/null || echo "No .keras files to copy"
# Copy any other files
COPY . .
# Verify model files are present
RUN ls -la *.keras 2>/dev/null && echo "✅ Model files found" || echo "❌ Warning: No .keras files found"

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8000"]
