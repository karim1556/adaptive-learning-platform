FROM python:3.11-slim

RUN apt-get update && apt-get install -y build-essential ffmpeg git libpango1.0-0 libcairo2 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY render_worker.py /app/render_worker.py

CMD ["python", "/app/render_worker.py"]
