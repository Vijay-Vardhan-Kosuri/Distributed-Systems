# LoadSphere Enterprise Production Container Image
FROM python:3.11-slim

LABEL maintainer="LoadSphere Enterprise Systems <dev@loadsphere.enterprise>"
LABEL description="Dynamic Load Balancing and Server Monitoring Platform"

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Expose ports
EXPOSE 8000 8001 8002 8003

# Default entry point
CMD ["python", "main.py"]
