# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /src

# Parent + module POMs for caching and parent resolution
COPY pom.xml ./pom.xml
COPY login-service/pom.xml login-service/pom.xml

# Warm deps for just this module (do NOT scan siblings)
RUN mvn -q -DskipTests -f login-service/pom.xml dependency:go-offline

# Add sources and build the module
COPY login-service/src login-service/src
RUN mvn -q -DskipTests -f login-service/pom.xml -am package

FROM eclipse-temurin:21-jre
WORKDIR /app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
COPY --from=build /src/login-service/target/*.jar /app/app.jar
EXPOSE 8082
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
