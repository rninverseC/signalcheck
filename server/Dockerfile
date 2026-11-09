# Runs on any container host (for example a Hugging Face Docker Space on port 7860).
# Train first (see README.md) so server/model/email exists.
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py encoder.py ./
COPY model/email ./model/email
ENV PORT=7860 TORCH_THREADS=2
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT} --no-access-log"]
