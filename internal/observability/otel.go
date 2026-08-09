package observability

import (
	"context"
	"log"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// InitOTEL configures OpenTelemetry tracing. When OTEL_EXPORTER_OTLP_ENDPOINT
// is set, spans are exported via OTLP/HTTP (e.g. to Jaeger, Tempo or an OTLP
// collector). Otherwise spans are produced in-process and dropped, so the app
// works standalone with tracing disabled.
func InitOTEL(serviceName, version string) (func(context.Context) error, error) {
	res := resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceNameKey.String(serviceName),
		semconv.ServiceVersionKey.String(version),
	)

	opts := []sdktrace.TracerProviderOption{
		sdktrace.WithResource(res),
	}

	// Export via OTLP/HTTP when an endpoint is configured. Uses the standard
	// OTEL_* env vars (endpoint, headers, compression, protocol).
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint != "" {
		exp, err := otlptracehttp.New(context.Background())
		if err != nil {
			log.Printf("OpenTelemetry OTLP exporter unavailable (tracing disabled): %v", err)
		} else {
			opts = append(opts, sdktrace.WithBatcher(exp))
			log.Printf("OpenTelemetry OTLP exporter configured (endpoint=%s)", endpoint)
		}
	} else {
		log.Println("OpenTelemetry initialized without exporter (set OTEL_EXPORTER_OTLP_ENDPOINT to export)")
	}

	// Create trace provider
	tp := sdktrace.NewTracerProvider(opts...)

	// Register as global trace provider
	otel.SetTracerProvider(tp)

	log.Println("OpenTelemetry initialized successfully")

	return tp.Shutdown, nil
}
