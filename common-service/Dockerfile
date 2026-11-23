FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . .

RUN chmod +x gradlew

RUN ./gradlew clean bootJar -x test

EXPOSE 8085

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8085} -jar build/libs/common-service-0.0.1-SNAPSHOT.jar"]