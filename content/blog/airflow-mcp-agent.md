---
title: "I Gave an AI Agent the Keys to My Airflow. Here's What Happened."
titleDe: "Ich gab einem KI-Agenten die Schlüssel zu meinem Airflow"
date: "2026-05-08"
tags: ["airflow", "mcp", "ai-agents", "data-engineering"]
readingTime: 12
excerpt: "A real POC connecting an AI agent to local Airflow: reading logs, classifying failures, retrying or escalating, tracing bugs to GitHub commits, and exposing the production guardrails needed before trust."
---

I've spent years in data engineering, DevOps, and data platform work. Most of that time was spent building pipelines, debugging DAG failures at 2am, and writing runbooks that nobody reads until something breaks.

So when MCP (Model Context Protocol) started getting serious traction, I paid attention.

Not because it's hype. Because I know exactly how much toil lives in the infrastructure layer, and I wanted to see if an agent could actually absorb some of it.


## What MCP Changes (In Theory)

The premise is simple. Instead of an AI that just talks about your infrastructure, you give it tools that connect directly to it.

For data platforms, that means an agent that can actually call your Airflow API, read logs, inspect task states, and, when the tool path works and permissions allow it, trigger operational actions. Not describe how you'd do those things, but do them.

The setup is a single config file. You tell Claude Code which MCP server to use and how to reach your Airflow instance:

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

That's it. Now the agent has live access to your Airflow instance. It can get DAGs, read logs, inspect runs, and, depending on the MCP server behavior and permissions you allow, attempt state-changing operations such as triggering runs or updating run state.

![Architecture diagram showing Claude Code, MCP servers, Airflow, GitHub, and incident memory](/blog/airflow-mcp-agent/architecture-diagram.png)

*Figure 1: The local agent connects to Airflow and GitHub through MCP servers, while also reading and writing a small incident memory file.*

That's a different kind of useful.


## Where the Agent Actually Runs

Before getting into results, a question I'd have asked reading this: is this agent running in some cloud sandbox? A GitHub Actions container? A managed service?

No. It's Claude Code, Anthropic's CLI tool, running locally on my laptop.

The trigger scripts call `claude -p`, Claude Code's non-interactive print mode. It spins up a Claude session, feeds it a prompt, and pipes the output to a log file:

```bash
claude -p "$PROMPT" 2>&1 | tee "$LOG_FILE"
```

That's it. No container, no CI pipeline, no cloud infra. The agent runs in the same process context as your terminal, with access to your local filesystem and whatever network your machine can reach.

This matters because it means the agent isn't isolated. If you give it `Bash` access and `Write` access, it can do what your shell can do. Which brings up permissions.

### The Permission Model

By default, Claude Code is conservative about actions that can change your environment. Read-only operations can run with less friction, but shell commands, file writes, and many external tool calls require approval unless you explicitly allow them. That's fine for interactive sessions. It is not fine for autonomous agents running unattended.

The fix is a pre-authorized allow list in `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__airflow__get_dags",
      "mcp__airflow__get_log",
      "mcp__airflow__post_dag_run",
      "mcp__airflow__update_dag_run_state",
      "mcp__github__create_issue",
      "mcp__github__list_commits",
      "Write",
      "Bash"
    ]
  }
}
```

Tools matched by the `allow` list can run without prompting, subject to higher-priority deny rules and Claude Code's permission mode. Tools outside the allow list may still run if they are read-only, but write operations and shell commands will usually ask for human approval.

I separated read and write operations deliberately. Read ops (`get_dags`, `get_log`, `get_task_instances`) have lower blast radius than writes, but they are not risk-free: logs, XComs, variables, configs, and DAG source can contain secrets or sensitive business data. Write ops (`post_dag_run`, `update_dag_run_state`, `create_issue`) are the ones that actually change state. You could run a read-only agent with no write approval at all, and only escalate to write-capable mode when confidence is high.

In this POC, I pre-authorized everything the scenarios needed. In production, you'd want to be more surgical.


## What I Tested

I set up a local Airflow 2.9.3 instance and ran four scenarios. All POC-level. All intentionally constrained. The question wasn't "can this replace my team." It was "does this actually close the loop without a human in the middle?"

The four scenarios:

- **S1, Autonomous Ops**, receive an alert, diagnose, decide: retry or escalate
- **S2, Multi-tool Workflow**, trace a DAG failure back to a specific git commit, open a GitHub Issue
- **S3, Scheduled Health Review**, generate a daily DAG status report, unprompted
- **S4, Stateful Agent**, same as S1, but with memory of past incidents

Before looking at the results, here's the operational loop I was testing across the scenarios.

![Scenario flow diagram showing alert, log retrieval, classification, retry, escalation, and human handoff paths](/blog/airflow-mcp-agent/scenario-flow-diagram.png)

*Figure 2: The core loop is simple: inspect the failed run, classify the error, then retry, escalate, or stop when confidence is too low.*


## What Actually Happened

### S1, Retry vs. Escalate

This one was the core test of autonomous judgment.

I gave the agent two failing DAGs and a prompt that defined the decision logic:

```
Classify the error as one of:
- TRANSIENT: network timeout, connection refused, HTTP 5xx, rate limit exceeded
- DETERMINISTIC: KeyError, TypeError, schema mismatch, logic bug

If TRANSIENT: trigger a new run and poll until success or failure.
If DETERMINISTIC: do NOT retry. Output a structured escalation report.
```

![Decision tree for classifying Airflow task failures as transient, deterministic, or ambiguous](/blog/airflow-mcp-agent/decision-tree.png)

*Figure 3: The core risk is not retry vs. escalate; it is making sure ambiguous cases have a safe path.*

**DAG 1** failed with a `ConnectionError: External API timeout`. The agent classified it as **TRANSIENT**, triggered a retry via the Airflow REST API after the MCP write tool hit a request-body compatibility issue, and watched it succeed. Total time: 27 seconds.

**DAG 2** failed with a `KeyError: 'user_id'`. The agent read the source code, saw that `schema_dict` was built from `["username", "email", "created_at"]` and `user_id` simply wasn't there. It classified this as **DETERMINISTIC** and wrote a precise escalation report pointing to the exact line.

What surprised me: I never told it to read the DAG source. It did that on its own to build confidence in its classification.

### S2, Crossing Tool Boundaries

This one required the agent to move across two systems: Airflow and GitHub. The prompt defined the full chain:

```
Step 1: Get the failed run from Airflow (mcp__airflow__get_dag_runs)
Step 2: Extract the error from task logs (mcp__airflow__get_log)
Step 3: List recent commits on the DAG path (mcp__github__list_commits, path=dags/)
Step 4: Match the bug to a commit
Step 5: Open a GitHub Issue (mcp__github__create_issue)
```

A DAG failed with `KeyError: 'event_timestamp'`. The agent pulled the logs, listed the last 10 commits to `dags/`, and matched the failure to a commit titled `refactor: rename event_timestamp to ts in pipeline schema`.

The commit had updated the data records but missed the consumer code on line 15. Classic partial rename bug.

The agent opened a GitHub Issue with the commit SHA, the author, the traceback, and a one-line fix. No human looked at a log. No one manually ran `git log`. The issue just appeared.

### S3, The Health Report

I ran a script that fired a prompt at the agent. No other instruction. The prompt told it what to query and what format to use:

```
You are an Airflow operations reviewer generating the daily DAG health report for {{DATE}}.
Query all active DAGs and their run history for the past 24 hours.
No human will review your work before it is published.
```

It queried 7 DAGs, pulled run history, identified 3 failures, analyzed each one, checked SLA compliance, and wrote a structured markdown report. One thing I would tighten in the next version: the prompt asked for the past 24 hours, but the saved report labeled a wider absolute review window. That's exactly the kind of output-validation check a production version would need. Even so, the report surfaced that one DAG had exhausted all 3 retries on every attempt, and recommended not re-triggering until the external API is confirmed reachable.

The output looked like something a senior engineer would write after a Monday morning review. Except it took under 5 minutes and nobody had to be awake for it.

### S4, Memory Changes Everything

Same scenario as S1, but now the agent checks an incident log before doing anything:

```
Step 0, Check incident history FIRST
Read incident_log.json. Search for entries matching dag_id={{DAG_ID}}.
If a matching entry exists: reference it and use it to inform your decision.
If no matching entry: proceed with full diagnosis.

Step 7, Write to incident log
Append a new entry to incident_log.json after every run.
```

The incident log is just a JSON file:

```json
{
  "timestamp": "2026-05-06T14:23:00Z",
  "dag_id": "dag_code_bug",
  "error_type": "KeyError",
  "diagnosis": "Deterministic code bug, retrying will always fail.",
  "action_taken": "Escalated to human.",
  "outcome": "pending human fix"
}
```

The difference was immediate. Instead of re-deriving the diagnosis from scratch, the agent matched the current failure to yesterday's entry, confirmed the current run showed the same error, and escalated without retrying, citing the prior incident and flagging it as a recurrence.

When I ran it a third time, it added an **URGENT** flag on its own. Nobody told it to escalate urgency. It inferred from the pattern that three identical escalations with no resolution warranted a stronger signal.

That's the kind of behavior that makes this interesting.

![Results matrix summarizing the four POC scenarios, agent actions, outcomes, and production lessons](/blog/airflow-mcp-agent/results-matrix.png)

*Figure 4: The most useful result was not a single success case, but seeing where each workflow closed the loop and where production controls were missing.*


## An Unexpected Finding

When I re-ran the scenarios to generate raw logs, I ran S1 and S4 for the same DAG concurrently.

Both agents grabbed the same Airflow Variable counter. Both made decisions based on stale state. One agent triggered an unnecessary retry after the other had already resolved the issue.

![Race condition timeline showing two agents responding to the same Airflow alert and taking duplicate action](/blog/airflow-mcp-agent/race-condition-timeline.png)

*Figure 5: The race condition came from duplicate responders acting on stale state without a deduplication lock or resolved-incident check.*

The agent that caused the race condition caught it, analyzed it, and reported it:

> *"The ops agent design has no deduplication guard. If the original alert is already resolved, a late-arriving agent will still trigger unnecessary remediation."*

I didn't design this finding. It emerged from the test. And it's exactly the kind of edge case that would surface in production.


## If This Were Production

Here's where I have to be honest about the gap.

The gap is less about whether the agent can act, and more about whether the surrounding system makes those actions safe.

![POC vs production gap diagram comparing local Claude Code setup with hardened production runtime](/blog/airflow-mcp-agent/poc-vs-production-gap.png)

*Figure 6: The POC proves the loop can work; production is mostly about limiting blast radius, preserving auditability, and making actions idempotent.*

**What works at POC scale:**
- The reasoning was useful within these constrained fixtures. The transient/deterministic classification held up across every run I tested.
- Memory actually improves decisions, not marginally, noticeably.
- Cross-tool workflows close loops that would otherwise require human handoff.

**What needs work before I'd trust this in production:**

**Deduplication and idempotency.** The race condition above isn't a corner case. It's what happens when multiple alerts fire for the same incident. Any production agent needs a lock or a "is this already resolved?" check before acting.

**Audit trail.** The agent writes to `incident_log.json`. In production, every action needs to land in an append-only log with timestamps and decision rationale: every DAG trigger, every state change, every decision. Not for compliance theater. Because when something goes wrong, you need to know exactly what the agent did and why.

**Blast radius controls.** Right now the agent has broad credentials and pre-authorized write tools; when the MCP write path failed, it could still fall back to direct Airflow REST calls. In production, you'd want scoped permissions, maybe read-only by default, with explicit allowlists for write operations per DAG or per team.

**Confidence thresholds.** The agent classifies errors as transient or deterministic with high confidence. But what about the ambiguous cases? A production system needs a "not sure, escalate and wait" path, not just a binary.

**Cost and latency.** Each scenario ran 10–40 tool calls. At scale, with hundreds of DAGs and continuous monitoring, that adds up. You'd want to think carefully about when to invoke the agent versus simpler rule-based alerting.


## What Production Actually Looks Like

In this POC, I triggered every scenario manually with a shell script calling `claude -p`. That's fine for testing. It's not a real deployment.

In production, two things need to change: how the agent gets triggered, and what runs the agent.

### Triggering: Scheduled or Event-Driven

The health report scenario (S3) is a natural cron job. You'd schedule it the same way you schedule any recurring task: an Airflow DAG, a cron entry, whatever your platform uses.

The ops agent (S1, S4) should be event-driven. One direct path is Airflow's `on_failure_callback`. In Airflow 2.x, callbacks are invoked when state changes happen through worker execution, and callback errors show up in scheduler logs rather than task logs, so this needs operational care. Every DAG that you want the agent to watch gets a callback:

```python
def trigger_ops_agent(context):
    dag_id = context["dag"].dag_id
    run_agent(dag_id=dag_id, prompt=OPS_PROMPT.format(dag_id=dag_id))

dag = DAG(
    "my_pipeline",
    on_failure_callback=trigger_ops_agent,
    ...
)
```

If you want a global listener across all DAGs without touching each one individually, Airflow has a plugin listener API. This is more advanced: the listener must be installed as an Airflow plugin, the hook signature has to match Airflow's versioned interface, and in Airflow 2.x the listener API is still documented as experimental.

```python
from airflow.listeners import hookimpl

class OpsAgentListener:
    @hookimpl
    def on_task_instance_failed(self, previous_state, task_instance, session):
        run_agent(dag_id=task_instance.dag_id)
```

Either way, the agent can be triggered directly from Airflow failure events, rather than waiting for a human to notice an alert. You still need deduplication, timeouts, and a failure path for the agent itself.

### The Runtime: Anthropic API + MCP SDK (No Claude Code)

Claude Code is a developer tool. You wouldn't deploy it in production infrastructure.

In production, you'd probably use the **Anthropic API** directly, combined with the **MCP Python SDK** or Anthropic's remote MCP connector depending on how your MCP servers are exposed. If you keep local STDIO MCP servers, you need your own MCP client loop; Anthropic's hosted MCP connector expects publicly reachable HTTP/SSE or Streamable HTTP servers. The architecture is similar, but you're replacing the CLI with your own tool-calling loop:

```python
import anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def run_agent(dag_id: str, prompt: str):
    # Connect to the same MCP server
    server = StdioServerParameters(
        command="uvx",
        args=["mcp-server-apache-airflow"],
        env={"AIRFLOW_HOST": "http://airflow:8080", ...}
    )

    async with stdio_client(server) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()

            client = anthropic.Anthropic()
            messages = [{"role": "user", "content": prompt}]

            # Tool-calling loop
            while True:
                response = client.messages.create(
                    model="<current-claude-model>",
                    max_tokens=2000,
                    tools=[to_anthropic_tool(t) for t in tools.tools],
                    messages=messages,
                )
                if response.stop_reason == "end_turn":
                    break
                # Execute tool calls and feed results back
                messages = handle_tool_calls(response, session, messages)
```

The MCP servers themselves don't have to change if you keep the same STDIO setup. `mcp-server-apache-airflow` and `@modelcontextprotocol/server-github` can remain the tool providers. What changes is who manages the connection: Claude Code did it automatically via `.mcp.json`; now your service does it explicitly. If you use Anthropic's remote MCP connector instead, you would expose those tools over a supported HTTP transport rather than connecting to local STDIO directly.

This also means you control the tool-calling loop directly. You can add your own guardrails: max tool calls per run, allowlisted operations, dry-run mode, audit logging, without depending on Claude Code's permission model.


## Where This Is Actually Going

I'm not convinced MCP agents replace on-call engineers. Not yet.

But I am convinced they can absorb the boring, well-defined part of incident response: the part where a human looks at a log, matches it to a known pattern, and either clicks retry or opens a ticket. That loop, done hundreds of times a month across a data platform, is real toil.

The stateful scenario was the most interesting to me. Not because the recall is impressive; it's just a JSON file. But because it shows the shape of what's possible: an agent that gets better at your specific infrastructure over time, not just a generic assistant that starts from zero every time.

That's the direction worth watching.


*The test code, DAG files, prompts, reports, and raw logs are in the [GitHub repo](https://github.com/shaoqichen0913/airflow-mcp-agent). The repo is intended to make the experiment inspectable and rerunnable, with the caveat that agent behavior and hosted model versions can change over time.*
