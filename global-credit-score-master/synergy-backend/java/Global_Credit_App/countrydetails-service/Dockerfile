# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /src

COPY pom.xml ./pom.xml
COPY countrydetails-service/pom.xml countrydetails-service/pom.xml
RUN mvn -q -DskipTests -f countrydetails-service/pom.xml dependency:go-offline

COPY countrydetails-service/src countrydetails-service/src
RUN mvn -q -DskipTests -f countrydetails-service/pom.xml -am package

FROM eclipse-temurin:21-jre
WORKDIR /app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
COPY --from=build /src/countrydetails-service/target/*.jar /app/app.jar
EXPOSE 8083
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
