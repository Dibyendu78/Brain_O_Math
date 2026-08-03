FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies & Node.js for PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    poppler-utils \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Node dependencies
COPY package.json package-lock.json* /app/
RUN npm install --omit=dev

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . /app

WORKDIR /app/BOM

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
