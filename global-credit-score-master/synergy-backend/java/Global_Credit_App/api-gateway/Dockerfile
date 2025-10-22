# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /src

# Parent + module POMs
COPY pom.xml ./pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml

# Download deps for this module only
RUN mvn -q -DskipTests -f api-gateway/pom.xml dependency:go-offline

# Copy module sources and build
COPY api-gateway/src api-gateway/src
RUN mvn -q -DskipTests -f api-gateway/pom.xml -am package

# --- runtime ---
FROM eclipse-temurin:21-jre
WORKDIR /app
# run as non-root (optional)
RUN addgroup --system app && adduser --system --ingroup app app
USER app

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
COPY --from=build /src/api-gateway/target/*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
