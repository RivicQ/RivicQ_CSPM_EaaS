FROM python:3.12-slim
WORKDIR /app
COPY demo/mock-api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY demo/mock-api/server.py ./
COPY demo/fixtures /fixtures
ENV FLASK_APP=server.py
EXPOSE 5000
CMD ["python", "server.py"]
