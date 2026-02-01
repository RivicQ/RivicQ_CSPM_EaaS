package observability

import (
	"context"
	"log"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func InitOTEL(serviceName, version string) (func(context.Context) error, error) {
	// Create trace provider
	tp := trace.NewTracerProvider(
		trace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String(serviceName),
			semconv.ServiceVersionKey.String(version),
		)),
	)

	// Register as global trace provider
	otel.SetTracerProvider(tp)

	log.Println("OpenTelemetry initialized successfully")

	return tp.Shutdown, nil
}
