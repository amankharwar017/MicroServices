FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . .

RUN chmod +x gradlew
RUN ./gradlew clean bootJar --no-daemon

EXPOSE 8888

CMD ["java", "-jar", "build/libs/config-server-0.0.1-SNAPSHOT.jar"]