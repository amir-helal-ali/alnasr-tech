# ── Stage 1: Build ───────────────────────────────────────────────────
FROM rust:1.75-alpine AS builder

RUN apk add --no-cache musl-dev pkgconf openssl-dev openssl-libs-static

WORKDIR /app

# Cache dependencies layer (only rebuilds when Cargo.toml changes)
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --bin alnasr-tech 2>/dev/null || true
RUN rm -rf src

# Build actual binary with full source
COPY . .
RUN touch src/main.rs
RUN cargo build --release --bin alnasr-tech

# ── Stage 2: Runtime ────────────────────────────────────────────────
FROM alpine:3.19

# Security: install only what's needed, set timezone to Cairo
RUN apk add --no-cache ca-certificates tzdata curl && \
    cp /usr/share/zoneinfo/Africa/Cairo /etc/localtime && \
    echo "Africa/Cairo" > /etc/timezone && \
    apk del tzdata

# Create non-root user
RUN addgroup -S alnasr && adduser -S -G alnasr alnasr

# Copy binary and migrations
COPY --from=builder /app/target/release/alnasr-tech /usr/local/bin/alnasr-tech
COPY --from=builder /app/migrations /migrations

# Set ownership
RUN chown -R alnasr:alnasr /migrations /usr/local/bin/alnasr-tech

USER alnasr

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENV RUST_LOG=info
ENV RUST_BACKTRACE=1

CMD ["alnasr-tech"]
