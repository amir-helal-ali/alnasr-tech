FROM rust:1.75-alpine AS builder

RUN apk add --no-cache musl-dev pkgconf openssl-dev openssl-libs-static

WORKDIR /app

# Cache dependencies
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --bin alnasr-tech 2>/dev/null || true
RUN rm -rf src

# Build actual binary
COPY . .
RUN touch src/main.rs
RUN cargo build --release --bin alnasr-tech

# ── Runtime ─────────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Africa/Cairo /etc/localtime && \
    echo "Africa/Cairo" > /etc/timezone

RUN addgroup -S alnasr && adduser -S -G alnasr alnasr

COPY --from=builder /app/target/release/alnasr-tech /usr/local/bin/alnasr-tech
COPY --from=builder /app/migrations /migrations

USER alnasr

EXPOSE 3000

ENV RUST_LOG=info
ENV RUST_BACKTRACE=1

CMD ["alnasr-tech"]
