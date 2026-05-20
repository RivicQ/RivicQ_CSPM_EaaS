FROM golang:1.25-alpine AS build
WORKDIR /src
COPY . .
RUN apk add --no-cache git \
  && go build -o /bin/scanner ./cmd/scanner

FROM alpine:3.18
COPY --from=build /bin/scanner /bin/scanner
ENTRYPOINT ["/bin/scanner"]
