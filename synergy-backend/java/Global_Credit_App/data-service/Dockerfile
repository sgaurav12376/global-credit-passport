# ===== build stage =====
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Copy parent POM and data-service module
COPY pom.xml ./pom.xml
COPY data-service/pom.xml data-service/pom.xml
COPY data-service/src data-service/src

# Download deps & build ONLY the data-service module
RUN mvn -q -DskipTests -f data-service/pom.xml dependency:go-offline
RUN mvn -q -DskipTests -f data-service/pom.xml package

# ===== run stage =====
FROM eclipse-temurin:21-jre
WORKDIR /app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
COPY --from=build /build/data-service/target/*.jar /app/app.jar
EXPOSE 8085
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
