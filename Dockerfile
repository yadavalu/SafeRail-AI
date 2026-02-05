# Use a lightweight Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port (Render expects 10000 by default, or you can configure it)
EXPOSE 3000

# Run with Gunicorn (Production server) instead of app.run()
# 4 workers allows handling multiple requests simultaneously
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:3000", "server:app"]