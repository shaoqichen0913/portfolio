---
title: "Streaming Analytics Platform"
titleDe: "Streaming-Analytics-Plattform"
description: "Real-time analytics platform with Kafka deep-dive: partition strategy, consumer group rebalancing, exactly-once semantics, and live monitoring via InfluxDB + Grafana."
descriptionDe: "Echtzeit-Analytics-Plattform mit Kafka-Tiefeneinblick: Partitionsstrategie, Consumer-Group-Rebalancing, Exactly-Once-Semantics und Live-Monitoring via InfluxDB + Grafana."
impact: "End-to-end latency under 200ms at 50k events/second. Consumer lag alerting detects processing bottlenecks within 30 seconds. Partition strategy reduced cross-partition joins by 80%."
impactDe: "End-to-End-Latenz unter 200 ms bei 50.000 Events/Sekunde. Consumer-Lag-Alerting erkennt Verarbeitungsengpässe innerhalb von 30 Sekunden."
tags: ["Kafka", "Spark Streaming", "InfluxDB", "Grafana", "Python", "Docker"]
github: "https://github.com/shaoqichen0913/streaming-analytics"
order: 4
---

## Overview

A deep-dive into production Kafka operations, going beyond basic producer/consumer patterns to address the operational concerns that matter at scale.

## Partition Strategy

Partition key selection is the most consequential Kafka design decision. This project demonstrates three strategies and their trade-offs:

- **Entity-keyed**: all events for a user/device land on the same partition → ordering guaranteed, hotspot risk
- **Time-bucketed**: events distributed by time window → even distribution, no ordering guarantee
- **Composite key**: hash(entity_id + time_bucket) → balance between distribution and locality

## Exactly-Once Semantics

Achieving EOS requires coordination across producer, broker, and consumer:

1. **Idempotent producer**: `enable.idempotence=true` deduplicates at broker level
2. **Transactional API**: groups multiple topic writes into atomic transactions
3. **Read-committed isolation**: consumers only see committed transactions

## Observability Stack

Consumer lag is the primary health signal. The monitoring setup tracks:
- Per-partition lag with alerting thresholds
- Produce/consume throughput (msgs/sec, bytes/sec)  
- Rebalance frequency and duration
- Under-replicated partitions

All metrics flow to InfluxDB via a custom Kafka metrics exporter, visualized in Grafana with pre-built dashboards.
