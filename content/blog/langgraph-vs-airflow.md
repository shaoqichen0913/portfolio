---
title: "LangGraph vs. Airflow: Thinking About AI Workflows Differently"
titleDe: "LangGraph vs. Airflow: KI-Workflows anders denken"
date: "2025-03-15"
tags: ["langgraph", "airflow", "ai-engineering"]
readingTime: 6
excerpt: "If you come from data engineering, LangGraph feels familiar — it's a DAG executor. But the key difference is that LangGraph nodes can decide their own next step at runtime. Here's what that changes."
---

## The Familiar Mental Model

As a data engineer, my first instinct when learning LangGraph was: this is just Airflow for LLMs. Both have nodes (tasks), edges (dependencies), and state that flows between them.

That mental model gets you 80% of the way there. But there's one crucial difference.

## Static vs. Dynamic Edges

In Airflow, the DAG structure is fixed at parse time. `task_a >> task_b >> task_c` — the execution order is determined before any data flows.

In LangGraph, edges can be **conditional**:

```python
workflow.add_conditional_edges(
    "grade_documents",
    decide_next_step,  # this function runs at runtime
    {
        "relevant": "generate",
        "not_relevant": "rewrite_query",
    }
)
```

The `decide_next_step` function examines the current state — including the LLM's assessment of retrieved documents — and returns the next node name. The graph structure is dynamic.

## Why This Matters for RAG

In a RAG pipeline, you don't know in advance whether the retrieved documents will be useful. A static pipeline would always generate a response regardless of retrieval quality.

With conditional edges, you can implement self-correction:
1. Retrieve documents
2. Grade their relevance (LLM call)
3. If relevant → generate response
4. If not relevant → rewrite query → retrieve again (loop)

This isn't possible in Airflow without hacks (XCom + BranchPythonOperator gets messy fast).

## Where the Analogy Breaks Down

Airflow is designed for deterministic, schedulable batch work. LangGraph is designed for interactive, stateful reasoning where execution paths depend on LLM outputs.

Don't try to use LangGraph for your nightly ETL. Don't try to use Airflow for your multi-turn AI agent. They solve different problems.
