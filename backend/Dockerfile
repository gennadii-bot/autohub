# AvtoHub KZ Backend — production Docker image
FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application
COPY . .
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Gunicorn + Uvicorn workers for production
CMD ["gunicorn", "app.main:app", "--bind", "0.0.0.0:8000", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--access-logfile", "-", "--error-logfile", "-", "--capture-output"]
