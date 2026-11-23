FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . .

RUN chmod +x shift-backend/gradlew
RUN chmod +x common-service/gradlew

WORKDIR /app/common-service

RUN ./gradlew clean jar --no-daemon -x test

WORKDIR /app/shift-backend

RUN ./gradlew clean bootJar --no-daemon -x test

EXPOSE 8080

CMD ["java", "-jar", "build/libs/shift-master-0.0.1-SNAPSHOT.jar"]