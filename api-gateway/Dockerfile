FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . .

RUN chmod +x gradlew

RUN ./gradlew clean bootJar --no-daemon -x test

EXPOSE 8086

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8086} -jar build/libs/api-gateway-0.0.1-SNAPSHOT.jar"]