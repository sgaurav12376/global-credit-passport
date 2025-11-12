# Use official Python image
FROM python:3.10

# Set working directory
WORKDIR /app

# Copy all files to the container
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port FastAPI runs on
EXPOSE 8000

# Run the FastAPI app with uvicorn
CMD ["uvicorn", "com.synergy_resources.credit_app.main.main:app", "--host", "0.0.0.0", "--port", "8000"]