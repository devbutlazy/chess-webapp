FROM python:3.12.6-slim

WORKDIR /app

COPY ../requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY .. /app

EXPOSE 3434

CMD ["python", "-m", "main"]
