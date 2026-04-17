---
title: "Why Apache Iceberg's Hidden Partitioning Changes Everything"
titleDe: "Warum Apache Icebergs Hidden Partitioning alles verändert"
date: "2025-04-01"
tags: ["iceberg", "lakehouse", "data-engineering"]
readingTime: 8
excerpt: "Traditional partition schemes force business logic into query syntax. Iceberg's hidden partitioning separates storage optimization from query authoring — here's why that matters in production."
---

## The Problem with Traditional Partitioning

In Hive-style tables, if you partition by `dt` (date), every query that filters on date must know this:

```sql
SELECT * FROM events WHERE dt = '2025-04-01'
```

The partition column leaks into your query layer. Application engineers need to know storage implementation details.

## Iceberg's Approach

With Iceberg hidden partitioning, you define the partition transform at the table level:

```sql
CREATE TABLE events (
  event_time TIMESTAMP,
  user_id BIGINT,
  ...
) USING iceberg
PARTITIONED BY (days(event_time));
```

Queries just filter on `event_time`:

```sql
SELECT * FROM events WHERE event_time >= '2025-04-01'
```

Iceberg prunes partitions automatically. The query has no knowledge of physical storage layout.

## Why This Matters for Data Platform Teams

**Schema evolution without query rewrites**: changing from daily to hourly partitioning is a metadata operation. Existing queries continue working unchanged.

**Multi-engine consistency**: Spark, Trino, and Flink all respect the same partition spec. No risk of one engine bypassing partition pruning.

**Partition evolution**: you can change partition granularity over time as data volume grows, without rewriting historical data.

## Production Considerations

One gotcha: hidden partitioning works well for append-only patterns, but merge-on-read (MOR) for CDC requires careful thought about partition boundaries and compaction scheduling.

In our lakehouse platform, we run compaction as a scheduled Spark job every 4 hours on high-throughput tables to keep small-file count under control.
