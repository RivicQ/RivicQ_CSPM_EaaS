package middleware

import (
	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
	"go.opentelemetry.io/otel/trace"
)

var Tracer = otel.Tracer("cryptobom-enterprise")

func TracingMiddleware(serviceName string) gin.HandlerFunc {
	propagator := propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	)

	return func(c *gin.Context) {
		ctx := propagator.Extract(c.Request.Context(), propagation.HeaderCarrier(c.Request.Header))

		spanName := c.Request.Method + " " + c.FullPath()
		if spanName == "  " {
			spanName = c.Request.Method + " " + c.Request.URL.Path
		}

		opts := []trace.SpanStartOption{
			trace.WithAttributes(
				semconv.HTTPMethodKey.String(c.Request.Method),
				semconv.HTTPTargetKey.String(c.Request.URL.Path),
				semconv.HTTPRouteKey.String(c.FullPath()),
				semconv.HTTPSchemeKey.String(func() string {
					if c.Request.TLS != nil {
						return "https"
					}
					return "http"
				}()),
				attribute.String("http.host", c.Request.Host),
				attribute.String("service.name", serviceName),
				semconv.UserAgentOriginalKey.String(c.Request.UserAgent()),
			),
			trace.WithSpanKind(trace.SpanKindServer),
		}

		ctx, span := Tracer.Start(ctx, spanName, opts...)
		defer span.End()

		c.Request = c.Request.WithContext(ctx)

		c.Next()

		status := c.Writer.Status()
		span.SetAttributes(semconv.HTTPStatusCodeKey.Int(status))

		if len(c.Errors) > 0 {
			span.SetAttributes(attribute.String("gin.errors", c.Errors.String()))
		}
	}
}
