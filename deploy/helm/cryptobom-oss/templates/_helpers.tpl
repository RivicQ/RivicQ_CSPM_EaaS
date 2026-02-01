{{/*
Expand the name of the chart.
*/}}
{{- define "cryptobom-oss.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "cryptobom-oss.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "cryptobom-oss.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "cryptobom-oss.labels" -}}
helm.sh/chart: {{ include "cryptobom-oss.chart" . }}
{{ include "cryptobom-oss.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "cryptobom-oss.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cryptobom-oss.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "cryptobom-oss.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "cryptobom-oss.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create database connection URL
*/}}
{{- define "cryptobom-oss.databaseURL" -}}
{{- if .Values.database.enabled }}
postgresql://{{ .Values.database.postgresql.auth.username }}:{{ .Values.database.postgresql.auth.postgresPassword }}@{{ include "cryptobom-oss.fullname" . }}-postgresql:5432/{{ .Values.database.postgresql.auth.database }}
{{- else if .Values.database.externalHost }}
{{ .Values.database.externalHost }}:{{ .Values.database.externalPort }}
{{- end }}
{{- end }}