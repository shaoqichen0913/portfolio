---
title: "I Gave an AI Agent the Keys to My Airflow. Here's What Happened."
titleDe: "Ich gab einem KI-Agenten die Schlüssel zu meinem Airflow"
date: "2026-05-08"
tags: ["airflow", "mcp", "ai-agents", "data-engineering"]
readingTime: 10
excerpt: "I connected an AI agent to a local Airflow setup and tested whether it could diagnose failed DAGs, retry transient failures, escalate deterministic bugs, trace issues to GitHub commits, and use incident memory without a human in the loop."
---

> **Repo:** Code, DAG files, prompts, and raw test logs are in the [GitHub repo](https://github.com/shaoqichen0913/airflow-mcp-agent-poc).

I've spent years in data engineering, DevOps, and data platform work. A lot of that work has the same shape: a DAG fails, someone opens Airflow, reads the log, decides whether to retry or escalate, and writes the same kind of note again.

That loop is not intellectually hard. That's the frustrating part. It is just slow, repetitive, and usually happens when nobody wants to be awake.

So when MCP started making it practical for agents to call real tools instead of just suggesting commands, I wanted to test one narrow question: could an agent close that Airflow failure loop without a human in the middle?

Not "can AI replace on-call engineers." Not "is autonomous ops the future." Just this: if I give an agent access to Airflow logs, DAG runs, GitHub commits, and a tiny incident memory file, can it diagnose, act, and know when not to act?

I built a local POC to find out. Some parts worked better than I expected. One part broke in exactly the way production systems tend to break.

## What MCP Actually Changes

For most of the past two years, "AI and infrastructure" has meant: type a question, get a command, run it yourself. The agent advises. You execute.

MCP changes that specific thing. Instead of describing what to run, the agent can call tools against the system directly. You give it a tool that calls Airflow — not a prompt that produces a curl command you then paste into your terminal. The `get_log` tool returns the actual log. The `post_dag_run` tool triggers an actual run. The difference is that the loop closes.

The setup is a config file:

```json
{
  "mcpServers": {
    "airflow": {
      "command": "uvx",
      "args": ["mcp-server-apache-airflow"],
      "env": {
        "AIRFLOW_HOST": "http://localhost:8080",
        "AIRFLOW_USERNAME": "admin",
        "AIRFLOW_PASSWORD": "admin"
      }
    }
  }
}
```

That's it. The agent now has live access to your Airflow instance.

Here's what that looks like in practice:

![Architecture diagram showing Claude Code connected to Airflow and GitHub through MCP servers, with an incident memory file on the local filesystem](/blog/airflow-mcp-agent/architecture-diagram.png)

*Every connection is outbound from the agent — no inbound hooks, no always-on process. The agent is invoked on demand. That boundary matters when you think about production triggering.*


## Where This Actually Runs

Before the scenarios: the agent is not in a cloud. It's not in a container. It's Claude Code — Anthropic's CLI tool — running on my laptop, invoked via a bash script:

```bash
claude -p "$PROMPT" 2>&1 | tee "$LOG_FILE"
```

That's the "trigger." A script substitutes a DAG ID into a markdown prompt template and calls `claude -p`. Print mode, non-interactive. No human in the loop.

This matters because it means the agent runs with access to your local filesystem and network. If you pre-authorize write tools, it can do what your shell can do. In this POC, I pre-authorized the tools each scenario needed. In production, you'd want tighter scopes.


## The Four Scenarios

I ran them in order of complexity. Each one answers a different question.

**S1 — Retry or escalate.** The agent gets a failing DAG. It reads the log, classifies the error as transient or deterministic, and acts: retry if it's transient, escalate if it's not. No human input after the initial trigger.

**S2 — Trace the blame.** A pipeline fails. The agent follows the error from the log to the git history, matches it to a specific commit, and opens a GitHub Issue tagged to the author. No human reads a log. No one runs `git log`.

**S3 — Unsolicited report.** A script fires a prompt. No failure, no alert, no context beyond a date. The agent queries all active DAGs, pulls 24-hour history, and writes a structured health report. Nobody asked it to do this; the script is the only trigger.

**S4 — Memory.** Same as S1, but before diagnosing, the agent reads an incident log. If it finds a prior entry for the same DAG and error type, it uses that to skip steps it's already done and escalate faster.

Here's the decision shape all four scenarios share:

![Scenario flow diagram showing the agent's decision path: inspect failed run, classify error, then branch to retry, escalate, or stop](/blog/airflow-mcp-agent/scenario-flow-diagram.png)

*The loop is the same across scenarios. What differs is how the agent fills in the classify step.*


## What Happened

### The Retry Decision (S1)

Two DAGs, both failing. The agent ran them in parallel.

The important part of the prompt was deliberately small. I didn't give it a runbook for each DAG; I gave it a decision boundary:

```text
Classify the error as one of:
- TRANSIENT: network timeout, connection refused, HTTP 5xx, rate limit exceeded
- DETERMINISTIC: KeyError, TypeError, schema mismatch, logic bug

If TRANSIENT: trigger a new run and poll until success or failure.
If DETERMINISTIC: do NOT retry. Output a structured escalation report.
```

**DAG 1** threw `ConnectionError: External API timeout: failed to reach data-service after 3 retries`. The agent classified this as **TRANSIENT** — an infrastructure failure, not a code defect — triggered a new run, and watched it succeed. Total time from first failure to confirmed recovery: 27 seconds.

**DAG 2** threw `KeyError: 'user_id'`. The agent's classification rationale referenced the DAG source directly — `schema_dict` built from `["username", "email", "created_at"]`, then an access to `schema_dict["user_id"]` on line 9, a key that was never in the dict. The prompt said to classify the error; pulling the source for higher confidence was the agent's own move. Classified as **DETERMINISTIC**. No retry. Escalation report with a two-option fix and the exact line number.

That source reference was the first sign this was more than prompt-following. The agent used it to build confidence before committing to a structured report. That's useful judgment.

### The GitHub Issue (S2)

This one required crossing two systems without human handoff.

A pipeline DAG failed with `KeyError: 'event_timestamp'`. The agent pulled the task log, extracted the error, listed the last 10 commits to the `dags/` directory, and found this one:

> `refactor: rename event_timestamp to ts in pipeline schema` — `ebdc95cd`

The commit had updated the sample record dictionaries (`event_timestamp` → `ts`) but missed the corresponding read on line 15. A partial rename — the most common kind.

The agent opened GitHub Issue #1 with the commit SHA, the traceback, the author, and a one-line fix. From DAG failure to GitHub Issue: about 4 minutes end-to-end, including environment setup. No human looked at a log.

### The Health Report (S3)

The prompt said: "Query all active DAGs and their run history for the past 24 hours. No human will review your work before it is published."

It queried 7 DAGs, identified 3 failures, analyzed each, checked SLA compliance, and wrote a structured markdown report. One DAG had exhausted all 3 retries on its only run in the window — the external API appeared consistently unreachable, not intermittently. The report recommended not re-triggering until connectivity was confirmed.

One thing I'd tighten next time: the report header described a 48-hour review window when the prompt specified 24 hours. Small discrepancy, but exactly the kind of output drift that a production system would need to validate against.

### The Memory Recall (S4)

Here's where the behavior became surprising.

The first time `dag_code_bug` failed, the agent completed a full diagnosis, escalated to a human, and wrote a record to `incident_log.json`. Outcome: "pending human fix."

The second time the same DAG failed, the agent checked the incident log first, matched the current failure to the prior entry, confirmed the error was identical, and escalated immediately — citing the prior incident, skipping the retry analysis entirely. Faster, and more specific.

Here's what changed at each decision point. The stateless side is the stateful agent's own estimate of what it would have done without incident history; S4 only ran the stateful version.

![Comparison chart showing how incident memory changes retry, analysis, escalation, and human messaging decisions](/blog/airflow-mcp-agent/stateful-memory-decision-path.png)

*Incident memory turns the same failure from a fresh diagnosis into a known recurrence.*

The third time — during the concurrent-run session where I was running S1 and S4 simultaneously — the agent escalated with **URGENT**. The prompt told it to use history to inform decisions. Three records in, all showing "pending human fix," it inferred that stronger language was warranted. That specific inference wasn't in any prompt instruction; it came from reading the pattern across accumulated entries.

A file-based memory — not a vector store, not a knowledge graph, just a JSON array — produced behavior that felt like institutional knowledge.


## What Broke

### The MCP Server Trade-off

There is no official Apache Airflow MCP server yet, so this POC had to choose between community implementations. That matters more than it sounds: different servers make different trade-offs around Airflow 2.x compatibility, authentication, API coverage, maintenance, and whether they need a proxy layer.

In my early tests, one package worked for some read paths but did not handle the Airflow 2.x trigger path cleanly without a proxy, which led to a `post_dag_run` failure. The final setup uses `mcp-server-apache-airflow`, which connects directly to Airflow with Basic Auth and works with my local Airflow 2.9.3 instance.

The lesson is not "MCP trigger is broken." It is that the Airflow MCP ecosystem is still community-led. Before trusting an agent workflow, you need to test the exact server package, version, and Airflow version you plan to use.

### The Race Condition

When I re-ran scenarios to capture raw logs, I ran S1 and S4 for the same DAG at the same time.

Both agents read the same Airflow Variable counter. Both made decisions based on the same stale value. One agent triggered a retry after the other had already resolved the failure.

![Race condition timeline showing two agents responding to the same Airflow alert and taking duplicate action](/blog/airflow-mcp-agent/race-condition-timeline.png)

*Two agents, one counter, no coordination. The late-arriving agent didn't know the incident was already resolved.*

The agent that caused the race condition was the one that noticed it. It wrote:

> *"The ops agent design has no deduplication guard — if the original alert is already resolved, a late-arriving agent will still trigger unnecessary remediation."*

I didn't design this finding. It emerged from the test setup. And it's exactly the kind of edge case that would cause real damage in production — not a crash, just silent duplicate work that corrupts the incident state.


## What Production Actually Needs

The loop works. The judgment is useful. The gaps are engineering problems, not model problems.

![POC vs. production gap comparing local Claude Code setup with a hardened production runtime](/blog/airflow-mcp-agent/poc-vs-production-gap.png)

*The POC proves the loop can close. Production is mostly about blast radius and auditability.*

**Deduplication.** The race condition above isn't a corner case — it's what happens whenever two alert sources fire for the same incident. Any production agent needs an "is this already resolved?" check before taking action. Not optional.

**Audit trail.** The agent writes to `incident_log.json`. That's good. In production, every action — every DAG trigger, every state change — needs an append-only log with timestamps and decision rationale. Not for compliance theater. Because when something goes wrong at 2 AM, you need to reconstruct exactly what the agent did and why.

**Blast radius scoping.** Right now the agent has broad credentials and pre-authorized write tools. In production: read-only by default, explicit allowlists per DAG or per team for write operations. The transient/deterministic split is a natural boundary — read-only for classification, write approval for remediation.

**The "not sure" path.** The agent classified every error confidently in these constrained fixtures. Real logs are messier. A production system needs a "not confident enough to act — escalate and wait" branch, not just a binary. None of the four scenarios tested the ambiguous case — it's a known gap, not a finding.

**Triggering.** In this POC, a human ran the trigger script. In production, you'd wire the agent to Airflow's `on_failure_callback`:

```python
def trigger_ops_agent(context):
    dag_id = context["dag"].dag_id
    run_agent(dag_id=dag_id, prompt=OPS_PROMPT.format(dag_id=dag_id))

dag = DAG("my_pipeline", on_failure_callback=trigger_ops_agent, ...)
```

That closes the final gap — a DAG fails, the callback fires, the agent runs without anyone being paged first.

**The runtime.** Claude Code is a developer tool. In production, you'd replace it with a direct Anthropic API call + MCP Python SDK client loop, so you control the tool-calling loop and can add your own guardrails — max tool calls, dry-run mode, per-team allowlists — without depending on the CLI permission model.


## The Honest Takeaway

The classification logic held up across every run. Transient vs. deterministic is a clean enough signal that an agent can act on it confidently, and the escalation reports were precise enough to hand directly to an engineer.

But the finding that stayed with me is simpler than that.

A JSON file made the agent smarter over time. Not smarter in general — smarter about a specific DAG, a specific error, a specific history. That's what "institutional knowledge" actually is: a structured record of prior decisions that lets you skip re-deriving what you already know.

The surprising thing isn't that the agent can be stateful. It's that the state is so small. Three incident entries — a few hundred bytes of JSON — produced behavior that felt like it took months to calibrate. The agent didn't learn anything new. It just remembered what it already knew.

That's worth building on.
