# wallet-backend — the canonical App(Wallet) custody server. Static Go binary,
# distroless runtime. No plaintext keys: custody is MPC (M-Chain).
# Built by platform native CI (NO GitHub Actions).
FROM golang:1.26-alpine AS build
WORKDIR /src

# The module lives at apps/backend in the wallet monorepo; build it standalone
# (GOWORK=off) so the image doesn't need the monorepo go.work.
COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download
COPY apps/backend/ ./
ENV GOWORK=off CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /out/wallet-backend ./cmd/wallet-backend

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/wallet-backend /wallet-backend
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/wallet-backend"]
