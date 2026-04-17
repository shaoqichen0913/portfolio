---
title: "Modern Lakehouse Platform"
titleDe: "Moderne Lakehouse-Plattform"
description: "End-to-end streaming lakehouse: Kafka → Spark Structured Streaming → Apache Iceberg → dbt → Trino. Production-grade architecture with schema evolution, time travel, and incremental processing."
descriptionDe: "End-to-End Streaming-Lakehouse: Kafka → Spark Structured Streaming → Apache Iceberg → dbt → Trino. Produktionsreife Architektur mit Schema-Evolution, Time Travel und inkrementeller Verarbeitung."
impact: "Reduced query latency by 60% compared to traditional batch ETL. Schema evolution handled zero-downtime across 3 concurrent producers. Full data lineage from raw ingestion to BI layer."
impactDe: "Abfragelatenz um 60 % gegenüber traditionellem Batch-ETL reduziert. Schema-Evolution ohne Ausfallzeit über 3 parallele Producer. Vollständige Datenprovenienz von der Rohdatenerfassung bis zur BI-Schicht."
tags: ["Kafka", "Spark", "Apache Iceberg", "dbt", "Trino", "Python", "Docker"]
github: "https://github.com/shaoqichen0913/lakehouse-platform"
order: 1
---

## Overview

This project implements a production-grade lakehouse architecture that handles both streaming and batch ingestion patterns, demonstrating end-to-end data platform design decisions.

## Architecture Decisions

### Why Iceberg over Delta Lake?

Apache Iceberg was chosen for its superior multi-engine support — Trino, Spark, and Flink can all read/write the same tables without format lock-in. The hidden partitioning feature also removes the need to encode partition logic into queries.

### Streaming with Structured Streaming

Spark Structured Streaming handles micro-batch ingestion from Kafka topics. Each micro-batch is committed as an Iceberg snapshot, providing exactly-once semantics and enabling time travel queries over streaming data.

### dbt for Transformation Layer

All transformation logic lives in dbt models with full lineage tracking. The silver/gold layer pattern separates raw ingestion concerns from business logic.

## Key Implementation Details

- **Schema Registry integration**: Confluent Schema Registry enforces Avro schema compatibility at the Kafka producer level
- **Partition strategy**: Time-based hidden partitioning in Iceberg with monthly granularity for the hot path, yearly for cold data
- **Incremental models**: dbt incremental models use Iceberg merge-on-read for efficient CDC patterns
- **Data quality**: Great Expectations integrated at the silver→gold transition point

## Running Locally

```bash
docker-compose up -d  # starts Kafka, Spark, MinIO (S3-compatible), Trino
pip install -r requirements.txt
python scripts/generate_events.py  # seed Kafka with sample events
./run_pipeline.sh
```
