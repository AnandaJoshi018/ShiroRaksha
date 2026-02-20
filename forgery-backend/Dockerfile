FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies - suppress hash checking
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

# Copy application (including model files)
COPY . .
# Verify model files are present
RUN ls -la *.keras 2>/dev/null || echo "Warning: No .keras files found"

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8000"]
