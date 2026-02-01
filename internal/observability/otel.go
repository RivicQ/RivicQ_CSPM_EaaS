package observability

import (
	"context"
	"log"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func InitOTEL(serviceName, version string) (func(context.Context) error, error) {
	ctx := context.Background()

	// Initialize Prometheus exporter
	promExporter, err := prometheus.New()
	if err != nil {
		return nil, err
	}

	// Create meter provider
	mp := metric.NewMeterProvider(
		metric.WithReader(promExporter),
		metric.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String(serviceName),
			semconv.ServiceVersionKey.String(version),
		)),
	)

	// Register as global meter provider
	otel.SetMeterProvider(mp)

	log.Println("OpenTelemetry initialized successfully")

	return mp.Shutdown, nil
}
