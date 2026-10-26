# ==============================================================================
# ASTRA — Backend Production Dockerfile (Multi-Stage)
# ==============================================================================
# Build: docker build -t astra-backend:latest ./backend
# ==============================================================================

# Stage 1: Build the Spring Boot executable jar
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Install dos2unix to ensure Windows CRLF line endings in mvnw don't fail in Linux
RUN apk add --no-cache dos2unix

# Copy Maven wrapper and POM to pre-fetch dependencies (caching layer)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

RUN dos2unix mvnw && chmod +x mvnw

# Copy source code and build production artifact
COPY src src
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Production JRE runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install curl for Actuator health checks
RUN apk add --no-cache curl

# Run as dedicated unprivileged user for security hardening
RUN addgroup -S astra && adduser -S astrasvc -G astra
USER astrasvc:astra

# Copy executable jar from builder
COPY --from=builder --chown=astrasvc:astra /workspace/target/*.jar /app/app.jar

# Container runtime environment (defaults to port 8080, overrides via host-provided PORT on Render)
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
