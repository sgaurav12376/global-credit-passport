# Use official Java image
FROM openjdk:21-jdk-slim

WORKDIR /app

COPY login-service.jar app.jar

EXPOSE 8082

# Run the app
ENTRYPOINT ["java", "-jar", "app.jar"]
