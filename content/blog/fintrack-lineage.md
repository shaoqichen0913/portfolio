---
title: "From dbt Lineage to Regulatory-Grade Reproducibility"
titleDe: "Von dbt-Lineage zu regulatorischer Reproduzierbarkeit"
date: "2026-05-25"
tags: ["dbt", "data-lineage", "cdc", "iceberg", "airflow", "aws"]
readingTime: 18
excerpt: "dbt makes transformation lineage visible, but a regulated report needs more than a graph. This project turns that gap into an end-to-end AWS lakehouse workflow with DMS, Iceberg, dbt, Airflow, audit evidence, and a lineage API."
coverImage: "/blog/fintrack-lineage/architecture.png"
---

> **Public repo:** Code, infrastructure, dbt models, Airflow DAGs, and lineage API implementation are in [dbt-iceberg-lineage-demo](https://github.com/shaoqichen0913/dbt-iceberg-lineage-demo).

<div class="toc">
    <div class="toc-title">Contents</div>
    <ol>
      <li><a href="#tldr">TL;DR</a></li>
      <li><a href="#background">Background</a></li>
      <li><a href="#question">The question I wanted to answer</a></li>
      <li><a href="#architecture">The architecture I built</a></li>
      <li><a href="#dbt">What dbt gives you, and what it does not</a></li>
      <li><a href="#snapshot-role">The snapshot role design</a></li>
      <li><a href="#cdc">What CDC changed</a></li>
      <li><a href="#airflow">Moving orchestration to Airflow</a></li>
      <li><a href="#lineage-api">Lineage API as the delivery</a></li>
      <li><a href="#validation">Validation evidence</a></li>
      <li><a href="#tradeoffs">Tradeoffs and limits</a></li>
      <li><a href="#lessons">Design takeaways</a></li>
    </ol>
  </div>

  <h2 id="tldr">1. TL;DR</h2>
  <p>
    I started this project from a simple curiosity: dbt makes lineage visible, but does that lineage prove enough
    when a regulated report needs to be reproduced later? The answer I found was no. A dbt graph is an excellent
    map of transformation dependencies, but it is not the full evidence trail for a specific run.
  </p>
  <p>
    To test that gap, I built a small AWS-first lakehouse workflow around PostgreSQL, AWS Database Migration Service
    (DMS), S3, Glue, Athena, Iceberg, dbt, Airflow, and a PostgreSQL audit store. The important part was not the
    number of tools. It was the contract between them: ingestion produces Iceberg snapshots, dbt consumes explicitly
    captured snapshots, and the lineage API answers from audit evidence instead of rereading business tables.
  </p>
  <p>
    Change Data Capture (CDC) made the project more interesting. Once orders can be updated and cash movements can
    be deleted, lineage is no longer just “which batch loaded this data?” It becomes “which source changes, merge
    rules, snapshots, dbt invocation, code version, and tests produced this current-state mart?” The final Airflow
    demo proves that path end to end, including cleanup of cost-bearing AWS resources after the run.
  </p>

  <h2 id="background">2. Background</h2>
  <p>
    I have been interested in data lineage for a long time. The idea sounds simple: when a number appears in a
    report, I want to know where it came from. But the more I looked into it, the more I realized that “where it
    came from” can mean many different things.
  </p>
  <p>
    It can mean the source table. It can mean the upstream model. It can mean the ingestion job. It can mean the
    code version. It can mean the exact data snapshot that the transformation read. In a regulatory setting, those
    distinctions matter. If someone asks why a report value existed three weeks ago, a screenshot of a DAG or a
    dbt lineage graph is not enough.
  </p>
  <p>
    Recently, while working more with dbt, I started to understand this tension more clearly. dbt is good at showing
    how models depend on sources and other models. It also produces artifacts like <code>manifest.json</code> and
    <code>run_results.json</code>, which are extremely useful for audit. But dbt alone does not automatically tell me
    which physical version of the source data was read at execution time.
  </p>
  <div class="callout realization">
    <strong>Initial realization</strong>
    <div class="callout-heading">Model lineage is necessary, but not sufficient</div>
    <p>
      The dbt graph can tell me that
      <code>mart_daily_trading_reconciliation</code> depends on staging and intermediate models. It can also tell me
      those models ultimately depend on Iceberg source tables like <code>orders</code>, <code>trades</code>, and
      <code>cash_movements</code>. But if those source tables changed over time, the graph alone does not answer
      which table snapshot was used for a specific run.
    </p>
  </div>

  <h2 id="question">3. The question I wanted to answer</h2>
  <p>I framed the project around one concrete regulatory question:</p>
  <div class="diagram">For this report value, which source records, ingestion run, lakehouse snapshot,
dbt code version, and transformation path produced it?</div>
  <p>
    This question forced me to think beyond a local dbt project. I needed a production-like data path, not just a
    transformation layer. I also wanted the project to be AWS-first, because the goal was to build something close
    to a deployable data engineering workflow, not only a local toy.
  </p>
  <p>
    I chose a small fintech scenario: an operational PostgreSQL source with <code>orders</code>, <code>trades</code>,
    and <code>cash_movements</code>. The main mart reconciles daily trading activity with settlement cash movements.
    It is small enough for a demo, but rich enough to create real lineage questions.
  </p>

  <div class="domain-graph">
    <div class="domain-row">
      <div class="entity-card">
        <h3>orders</h3>
        <div class="muted">order intent and state</div>
        <ul>
          <li><code>order_id</code> primary key</li>
          <li><code>user_id</code>, <code>instrument_id</code>, <code>side</code></li>
          <li><code>quantity</code>, <code>limit_price</code>, <code>status</code></li>
          <li><code>created_at</code>, <code>updated_at</code></li>
        </ul>
      </div>
      <div class="relationship">
        <span class="arrow">→</span><code>order_id</code><br>1 order -> 0..n<br>trades
      </div>
      <div class="entity-card">
        <h3>trades</h3>
        <div class="muted">executed market activity</div>
        <ul>
          <li><code>trade_id</code> primary key</li>
          <li><code>order_id</code> foreign key</li>
          <li><code>quantity</code>, <code>execution_price</code></li>
          <li><code>executed_at</code> -> <code>business_date</code></li>
        </ul>
      </div>
      <div class="relationship">
        <span class="arrow">→</span><code>trade_id</code>, optional<br>1 trade -> 0..n<br>settlement<br>movements
      </div>
      <div class="entity-card">
        <h3>cash_movements</h3>
        <div class="muted">settlement and corrections</div>
        <ul>
          <li><code>movement_id</code> primary key</li>
          <li><code>trade_id</code> nullable foreign key</li>
          <li><code>movement_type</code>, <code>amount</code>, <code>currency</code></li>
          <li><code>booked_at</code> -> <code>booked_date</code></li>
        </ul>
      </div>
    </div>
    <div class="mart-card">
      <h3>mart_daily_trading_reconciliation</h3>
      <div class="muted">compares trading activity with cash settlement and exposes exceptions for audit review</div>
      <ul>
        <li>left join settlements on <code>trades.trade_id = cash_movements.trade_id</code></li>
        <li>filter settlement movements with <code>movement_type = 'TRADE_SETTLEMENT'</code></li>
        <li>aggregate orders by <code>date(created_at)</code></li>
        <li>join order counts to trade reconciliation by <code>business_date</code></li>
        <li>output <code>settlement_difference</code> and <code>unreconciled_trade_count</code></li>
      </ul>
    </div>
    <figcaption>Data modeling graph for the demo domain: order intent, trade execution, and cash settlement create the reconciliation story.</figcaption>
  </div>

  <p>
    The relationships are intentionally simple. Orders provide order lifecycle context, trades produce executed
    exposure, and cash movements provide settlement evidence. The executable dependency is expressed in dbt through
    <code>source()</code> and <code>ref()</code>, not by relying on the drawing.
  </p>

  <h2 id="architecture">4. The architecture I built</h2>
  <p>
    The key point in the architecture is that no single tool owns lineage. Each layer records the evidence it can prove:
    DMS captures source changes, Glue validates accepted files, Iceberg records table snapshots, dbt records transformation
    artifacts, and the audit store joins those facts into a queryable proof.
  </p>
  <figure>
    <img src="/blog/fintrack-lineage/architecture.png" alt="FinTrack lineage AWS architecture">
    <figcaption>High-level AWS architecture: operational PostgreSQL is captured by DMS, validated and materialized into Iceberg, transformed by dbt, and proven through an audit-backed lineage API.</figcaption>
  </figure>
  <p>
    I used Terraform for infrastructure, GitHub Actions for CI/CD and safety workflows, Airflow for the full data
    workflow, and a Cost Guard workflow to make sure DMS and RDS do not stay open after testing. This mattered because
    cost control was part of the engineering requirement, not an afterthought.
  </p>
  <p>The important design choice was separating control-plane and data-plane concerns:</p>
  <table>
    <thead>
      <tr><th>Concern</th><th>Handled by</th></tr>
    </thead>
    <tbody>
      <tr><td>Cloud resources</td><td>Terraform</td></tr>
      <tr><td>CI/CD and safety checks</td><td>GitHub Actions</td></tr>
      <tr><td>Full data workflow orchestration</td><td>Airflow</td></tr>
      <tr><td>Raw/Iceberg SQL execution</td><td>Athena runner scripts</td></tr>
      <tr><td>Validation and promotion</td><td>AWS Glue Spark job</td></tr>
      <tr><td>Transformation logic</td><td>dbt on Athena</td></tr>
      <tr><td>Lineage proof</td><td>PostgreSQL audit schema and FastAPI query layer</td></tr>
    </tbody>
  </table>

  <h2 id="dbt">5. What dbt gives you, and what it does not</h2>
  <p>
    dbt was the starting point for the learning. It gives a structured way to build transformations, test assumptions,
    and expose a lineage graph. In this project, dbt builds staging models, an intermediate reconciliation model, and
    marts such as <code>mart_daily_trading_reconciliation</code>.
  </p>
  <figure>
    <img src="/blog/fintrack-lineage/dbt-data-lineage.png" alt="dbt-style lineage graph">
    <figcaption>dbt-style lineage graph: sources feed staging models, staging feeds the reconciliation intermediate model, and marts expose report-facing outputs.</figcaption>
  </figure>
  <p>
    The dbt code makes those dependencies explicit. A staging model starts from an Iceberg source table, normalizes
    financial fields, derives a business date, and carries CDC metadata forward. The following block is an abridged
    excerpt, not the complete file.
  </p>
  <pre><code class="language-sql"><span class="comment">-- simplified excerpt from dbt/models/staging/stg_trades.sql</span>
<span class="kw">select</span>
  trade_id,
  order_id,
  user_id,
  instrument_id,
  side,
  <span class="func">cast</span>(quantity <span class="kw">as</span> decimal(<span class="num">18</span>, <span class="num">6</span>)) <span class="kw">as</span> trade_quantity,
  <span class="func">cast</span>(execution_price <span class="kw">as</span> decimal(<span class="num">18</span>, <span class="num">6</span>)) <span class="kw">as</span> execution_price,
  <span class="func">cast</span>(quantity <span class="op">*</span> execution_price <span class="kw">as</span> decimal(<span class="num">18</span>, <span class="num">6</span>)) <span class="kw">as</span> trade_amount,
  <span class="func">cast</span>(
    <span class="kw">case</span>
      <span class="kw">when</span> side <span class="op">=</span> <span class="lit">'BUY'</span> <span class="kw">then</span> <span class="op">-</span><span class="num">1</span> <span class="op">*</span> quantity <span class="op">*</span> execution_price
      <span class="kw">else</span> quantity <span class="op">*</span> execution_price
    <span class="kw">end</span> <span class="kw">as</span> decimal(<span class="num">18</span>, <span class="num">6</span>)
  ) <span class="kw">as</span> expected_cash_amount,
  executed_at,
  <span class="func">cast</span>(<span class="func">date</span>(executed_at) <span class="kw">as</span> date) <span class="kw">as</span> business_date,
  op <span class="kw">as</span> source_operation,
  <span class="func">coalesce</span>(<span class="func">try_cast</span>(_dms_loaded_at <span class="kw">as</span> timestamp), source_updated_at, _ingested_at) <span class="kw">as</span> source_commit_ts,
  <span class="kw">case when</span> <span class="func">coalesce</span>(op, <span class="lit">'I'</span>) <span class="op">=</span> <span class="lit">'D'</span> <span class="kw">then</span> true <span class="kw">else</span> false <span class="kw">end</span> <span class="kw">as</span> is_deleted,
  <span class="kw">case</span>
    <span class="kw">when</span> <span class="func">coalesce</span>(op, <span class="lit">'I'</span>) <span class="op">=</span> <span class="lit">'D'</span>
      <span class="kw">then</span> <span class="func">coalesce</span>(<span class="func">try_cast</span>(_dms_loaded_at <span class="kw">as</span> timestamp), source_updated_at, _ingested_at)
    <span class="kw">else</span> null
  <span class="kw">end</span> <span class="kw">as</span> deleted_at,
  _batch_id,
  load_date
<span class="kw">from</span> <span class="jinja">{{ source(<span class="lit">'iceberg'</span>, <span class="lit">'trades'</span>) }}</span>
<span class="kw">where</span> <span class="func">coalesce</span>(op, <span class="lit">'I'</span>) <span class="op">&lt;&gt;</span> <span class="lit">'D'</span></code></pre>

  <p>
    The intermediate model is where dbt is useful as a transformation layer: the business rule is readable, testable,
    and connected to upstream models through <code>ref()</code>. This snippet keeps the columns later used by the mart,
    including <code>currency</code> and <code>trade_amount</code>.
  </p>
  <pre><code class="language-sql"><span class="comment">-- simplified excerpt from dbt/models/intermediate/int_trade_cash_movements.sql</span>
<span class="kw">with</span> trades <span class="kw">as</span> (
  <span class="kw">select</span> <span class="op">*</span> <span class="kw">from</span> <span class="jinja">{{ ref(<span class="lit">'stg_trades'</span>) }}</span>
),
settlements <span class="kw">as</span> (
  <span class="kw">select</span>
    trade_id,
    currency,
    <span class="func">sum</span>(amount) <span class="kw">as</span> actual_cash_amount,
    <span class="func">max</span>(booked_at) <span class="kw">as</span> last_booked_at,
    <span class="func">count</span>(<span class="op">*</span>) <span class="kw">as</span> settlement_movement_count
  <span class="kw">from</span> <span class="jinja">{{ ref(<span class="lit">'stg_cash_movements'</span>) }}</span>
  <span class="kw">where</span> movement_type = <span class="lit">'TRADE_SETTLEMENT'</span>
    <span class="kw">and</span> trade_id <span class="kw">is not null</span>
  <span class="kw">group by</span> <span class="num">1</span>, <span class="num">2</span>
)
<span class="kw">select</span>
  trades.trade_id,
  trades.order_id,
  trades.business_date,
  <span class="func">coalesce</span>(settlements.currency, <span class="lit">'EUR'</span>) <span class="kw">as</span> currency,
  trades.trade_amount,
  trades.expected_cash_amount,
  settlements.actual_cash_amount,
  <span class="func">cast</span>(<span class="func">coalesce</span>(settlements.actual_cash_amount, <span class="num">0</span>) <span class="op">-</span> trades.expected_cash_amount <span class="kw">as</span> decimal(<span class="num">18</span>, <span class="num">6</span>)) <span class="kw">as</span> difference,
  <span class="kw">case</span>
    <span class="kw">when</span> settlements.trade_id <span class="kw">is null then</span> <span class="lit">'MISSING_CASH_MOVEMENT'</span>
    <span class="kw">when</span> <span class="func">abs</span>(<span class="func">coalesce</span>(settlements.actual_cash_amount, <span class="num">0</span>) <span class="op">-</span> trades.expected_cash_amount) <span class="op">&lt;=</span> <span class="num">0.000001</span>
      <span class="kw">and</span> <span class="func">date_diff</span>(<span class="lit">'day'</span>, trades.executed_at, settlements.last_booked_at) <span class="op">&lt;=</span> <span class="num">2</span> <span class="kw">then</span> <span class="lit">'MATCHED'</span>
    <span class="kw">when</span> <span class="func">abs</span>(<span class="func">coalesce</span>(settlements.actual_cash_amount, <span class="num">0</span>) <span class="op">-</span> trades.expected_cash_amount) <span class="op">&lt;=</span> <span class="num">0.000001</span>
      <span class="kw">and</span> <span class="func">date_diff</span>(<span class="lit">'day'</span>, trades.executed_at, settlements.last_booked_at) <span class="op">&gt;</span> <span class="num">2</span> <span class="kw">then</span> <span class="lit">'LATE_SETTLEMENT'</span>
    <span class="kw">else</span> <span class="lit">'AMOUNT_MISMATCH'</span>
  <span class="kw">end</span> <span class="kw">as</span> reconciliation_status
<span class="kw">from</span> trades
<span class="kw">left join</span> settlements
  <span class="kw">on</span> trades.trade_id = settlements.trade_id</code></pre>

  <p>The mart then aggregates the reconciliation result into report-facing metrics:</p>
  <pre><code class="language-sql"><span class="comment">-- simplified excerpt from dbt/models/marts/mart_daily_trading_reconciliation.sql</span>
<span class="kw">with</span> trade_reconciliation <span class="kw">as</span> (
  <span class="kw">select</span> <span class="op">*</span> <span class="kw">from</span> <span class="jinja">{{ ref(<span class="lit">'int_trade_cash_movements'</span>) }}</span>
),
orders <span class="kw">as</span> (
  <span class="kw">select</span>
    <span class="func">cast</span>(<span class="func">date</span>(created_at) <span class="kw">as</span> date) <span class="kw">as</span> business_date,
    <span class="func">count</span>(<span class="op">*</span>) <span class="kw">as</span> total_orders,
    <span class="func">sum</span>(<span class="kw">case when</span> order_status_raw <span class="kw">in</span> (<span class="lit">'FILLED'</span>, <span class="lit">'PARTIALLY_FILLED'</span>) <span class="kw">then</span> <span class="num">1</span> <span class="kw">else</span> <span class="num">0</span> <span class="kw">end</span>) <span class="kw">as</span> filled_orders
  <span class="kw">from</span> <span class="jinja">{{ ref(<span class="lit">'stg_orders'</span>) }}</span>
  <span class="kw">group by</span> <span class="num">1</span>
)
<span class="kw">select</span>
  trade_reconciliation.business_date,
  trade_reconciliation.currency,
  <span class="func">coalesce</span>(<span class="func">max</span>(orders.total_orders), <span class="num">0</span>) <span class="kw">as</span> total_orders,
  <span class="func">coalesce</span>(<span class="func">max</span>(orders.filled_orders), <span class="num">0</span>) <span class="kw">as</span> filled_orders,
  <span class="func">count</span>(<span class="op">*</span>) <span class="kw">as</span> total_trades,
  <span class="func">cast</span>(<span class="func">sum</span>(trade_reconciliation.trade_amount) <span class="kw">as</span> decimal(<span class="num">18</span>, <span class="num">6</span>)) <span class="kw">as</span> gross_trade_amount,
  <span class="func">cast</span>(<span class="func">sum</span>(<span class="func">coalesce</span>(trade_reconciliation.actual_cash_amount, <span class="num">0</span>)) <span class="kw">as</span> decimal(<span class="num">18</span>, <span class="num">6</span>)) <span class="kw">as</span> total_cash_settlement,
  <span class="func">cast</span>(<span class="func">sum</span>(trade_reconciliation.difference) <span class="kw">as</span> decimal(<span class="num">18</span>, <span class="num">6</span>)) <span class="kw">as</span> settlement_difference,
  <span class="func">sum</span>(<span class="kw">case when</span> trade_reconciliation.reconciliation_status <span class="op">!=</span> <span class="lit">'MATCHED'</span> <span class="kw">then</span> <span class="num">1</span> <span class="kw">else</span> <span class="num">0</span> <span class="kw">end</span>) <span class="kw">as</span> unreconciled_trade_count
<span class="kw">from</span> trade_reconciliation
<span class="kw">left join</span> orders
  <span class="kw">on</span> trade_reconciliation.business_date = orders.business_date
<span class="kw">group by</span> <span class="num">1</span>, <span class="num">2</span></code></pre>

  <p>
    I used <code>dbt build</code> rather than separate <code>dbt run</code> and <code>dbt test</code> because I wanted
    one auditable invocation that contains models and tests in dependency order. The audit writer records dbt invocation
    id, manifest path, manifest checksum, run results path, model results, test results, and model lineage.
  </p>
  <p>
    But dbt does not solve everything. It can tell me that a model depends on a source. It does not automatically capture
    the Iceberg snapshot id for that source right before the run. That became a key design point.
  </p>
  <div class="note">
    In this project, dbt lineage explains the transformation path. Iceberg snapshot audit explains the exact source table
    version. Both are required for reproducibility.
  </div>

  <h2 id="snapshot-role">6. The snapshot role design</h2>
  <p>The most interesting design decision was adding <code>snapshot_role</code> to <code>audit.iceberg_snapshots</code>.</p>
  <p>Originally, the audit table stored only:</p>
  <div class="diagram">run_id
table_name
snapshot_id
snapshot_timestamp</div>
  <p>That worked, but the meaning was slightly mixed. The same Iceberg snapshot can play two different roles:</p>
  <table>
    <thead>
      <tr><th>Role</th><th>Meaning</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>PRODUCED_BY_INGESTION</code></td>
        <td>The snapshot created by Raw -> Iceberg materialization after ingestion and validation.</td>
      </tr>
      <tr>
        <td><code>CONSUMED_BY_DBT</code></td>
        <td>The snapshot captured immediately before dbt build, representing the stable input version read by dbt.</td>
      </tr>
    </tbody>
  </table>
  <p>
    This distinction looks small, but it matters. If the lineage API wants to prove a dbt mart is reproducible, it should
    use <code>CONSUMED_BY_DBT</code>, not just any snapshot that the ingestion process produced earlier. In the current
    full-load demo, the produced and consumed snapshot ids are the same because no other writer changes the table between
    ingestion and dbt. But the two records still represent different facts.
  </p>
  <div class="diagram">CONSUMED_BY_DBT        3 records
PRODUCED_BY_INGESTION 3 records</div>
  <p>
    The lineage query now explicitly filters for <code>snapshot_role = 'CONSUMED_BY_DBT'</code>. That makes the API
    answer a narrower and more useful question: what did dbt actually consume?
  </p>
  <p>
    The implementation is intentionally small. The audit table models the semantic role directly, and both ingestion audit
    and dbt snapshot capture write to the same table with different roles:
  </p>
  <pre><code class="language-sql"><span class="comment">-- db/schema/002_audit.sql</span>
<span class="kw">CREATE TABLE IF NOT EXISTS</span> audit.iceberg_snapshots (
    run_id TEXT <span class="kw">NOT NULL REFERENCES</span> audit.pipeline_runs(run_id),
    table_name TEXT <span class="kw">NOT NULL</span>,
    snapshot_id TEXT <span class="kw">NOT NULL</span>,
    snapshot_timestamp TIMESTAMPTZ,
    snapshot_role TEXT <span class="kw">NOT NULL DEFAULT</span> <span class="lit">'PRODUCED_BY_INGESTION'</span>
        <span class="kw">CHECK</span> (snapshot_role <span class="kw">IN</span> (<span class="lit">'PRODUCED_BY_INGESTION'</span>, <span class="lit">'CONSUMED_BY_DBT'</span>)),
    <span class="kw">PRIMARY KEY</span> (run_id, table_name, snapshot_id, snapshot_role)
);</code></pre>
  <pre><code class="language-sql"><span class="comment">-- src/fintrack_lineage/audit/dbt_source_snapshots.py</span>
<span class="kw">INSERT INTO</span> audit.iceberg_snapshots (
    run_id, table_name, snapshot_id, snapshot_timestamp, snapshot_role
)
<span class="kw">VALUES</span> (%s, %s, %s, %s, <span class="lit">'CONSUMED_BY_DBT'</span>)
<span class="kw">ON CONFLICT</span> (run_id, table_name, snapshot_id, snapshot_role)
<span class="kw">DO UPDATE SET</span> snapshot_timestamp = EXCLUDED.snapshot_timestamp;</code></pre>

  <h2 id="cdc">7. What CDC changed</h2>
  <p>
    After the first full-load demo worked, CDC became the next important step. Full-load lineage is useful: a batch of
    source data produced raw files, Iceberg snapshots, dbt marts, and audit records. But real operational systems do not
    only move in clean batches. Orders get updated. Trades arrive late. Cash movements can be corrected or deleted.
    A full-load snapshot tells one story; CDC tells a sequence of changes.
  </p>
  <figure>
    <img src="/blog/fintrack-lineage/cdc-workflow.png" alt="CDC workflow semantics diagram">
    <figcaption>CDC workflow semantics: insert, update, and delete events are validated, merged into current-state Iceberg tables, and recorded as audit evidence.</figcaption>
  </figure>
  <p>
    I implemented a bounded CDC window with DMS <code>full-load-and-cdc</code>. The workflow waits for full load to
    reach 100%, then applies deterministic source mutations:
  </p>
  <div class="diagram">insert order:          O-20260520-CDC-airflow-test-20260520-012812
insert trade:          T-20260520-CDC-airflow-test-20260520-012812
insert cash movement:  M-20260520-CDC-airflow-test-20260520-012812
update order:          O-20260520-000001 -> CANCELLED
delete cash movement:  M-20260520-000004</div>
  <p>
    DMS writes full-load and CDC files to S3. Glue validates that each record has usable CDC metadata, especially
    <code>op</code> with one of <code>I</code>, <code>U</code>, or <code>D</code>. Athena then MERGEs the validated
    rows into source-shaped Iceberg current-state tables.
  </p>
  <table>
    <thead>
      <tr><th>Operation</th><th>Iceberg current-state behavior</th><th>Why it matters for lineage</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>I</code></td>
        <td>Insert a new primary-key row.</td>
        <td>The new source fact becomes available to dbt.</td>
      </tr>
      <tr>
        <td><code>U</code></td>
        <td>Update the existing primary-key row if the CDC event is newer.</td>
        <td>The mart reflects the corrected current state, not the stale value.</td>
      </tr>
      <tr>
        <td><code>D</code></td>
        <td>Retain as a soft-delete marker only when the key already exists; a delete-only key is not inserted into the current-state table.</td>
        <td>Business marts can exclude deleted rows while audit can still explain what happened.</td>
      </tr>
    </tbody>
  </table>
  <div class="callout design-choice">
    <strong>Design choice</strong>
    <div class="callout-heading">Consume current state, preserve change meaning</div>
    <p>
      For this project, dbt consumes merged current-state Iceberg tables,
      not raw CDC files. That keeps the transformation layer simple and still supports validation. The CDC semantics remain
      visible through <code>source_operation</code>, <code>source_commit_ts</code>, <code>is_deleted</code>,
      <code>deleted_at</code>, Athena query ids, operation counts, and Iceberg snapshots.
    </p>
  </div>
  <p>
    The most important CDC implementation detail is the Iceberg MERGE. It deduplicates events per primary key, applies
    only the latest source event, updates existing rows when the event is newer, and inserts only live <code>I</code>/<code>U</code>
    rows when the key is not already present. A delete event for an existing key becomes the latest soft-delete marker in
    the Iceberg current-state table.
  </p>
  <pre><code class="language-sql"><span class="comment">-- simplified excerpt from sql/athena/002_refresh_iceberg_from_raw.sql</span>
<span class="kw">MERGE INTO</span> ${ICEBERG_DATABASE}.orders target
<span class="kw">USING</span> (
  <span class="kw">SELECT</span> *
  <span class="kw">FROM</span> (
    <span class="kw">SELECT</span>
      op,
      order_id,
      status,
      source_updated_at,
      _dms_loaded_at,
      _batch_id,
      coalesce(try_cast(_dms_loaded_at <span class="kw">AS</span> timestamp), source_updated_at, _ingested_at) <span class="kw">AS</span> source_commit_ts,
      row_number() <span class="kw">OVER</span> (
        <span class="kw">PARTITION BY</span> order_id
        <span class="kw">ORDER BY</span> coalesce(try_cast(_dms_loaded_at <span class="kw">AS</span> timestamp), source_updated_at, _ingested_at) <span class="kw">DESC</span>, _batch_id <span class="kw">DESC</span>
      ) <span class="kw">AS</span> event_rank
    <span class="kw">FROM</span> ${RAW_DATABASE}.raw_postgres_orders
    <span class="kw">WHERE</span> load_date = <span class="lit">'${LOAD_DATE}'</span>
      <span class="kw">AND</span> op <span class="kw">IN</span> (<span class="lit">'I'</span>, <span class="lit">'U'</span>, <span class="lit">'D'</span>)
      <span class="kw">AND</span> order_id <span class="kw">IS NOT NULL</span>
  )
  <span class="kw">WHERE</span> event_rank = 1
) source
<span class="kw">ON</span> target.order_id = source.order_id
<span class="kw">WHEN MATCHED</span>
  <span class="kw">AND</span> source.source_commit_ts &gt;= coalesce(try_cast(target._dms_loaded_at <span class="kw">AS</span> timestamp), target.source_updated_at, target._ingested_at)
<span class="kw">THEN UPDATE SET</span>
  op = source.op,
  status = source.status,
  source_updated_at = source.source_updated_at,
  _dms_loaded_at = source._dms_loaded_at,
  _batch_id = source._batch_id
<span class="kw">WHEN NOT MATCHED AND</span> source.op <span class="kw">IN</span> (<span class="lit">'I'</span>, <span class="lit">'U'</span>)
<span class="kw">THEN INSERT</span> (...);</code></pre>
  <p>
    I also record the merge as audit evidence, because operation counts and query ids are part of the CDC lineage proof.
    This is an abridged schema excerpt; the real table also records fields such as error details and timestamps.
  </p>
  <pre><code class="language-sql"><span class="comment">-- simplified excerpt from db/schema/002_audit.sql</span>
<span class="kw">CREATE TABLE IF NOT EXISTS</span> audit.cdc_merge_runs (
    merge_run_id TEXT <span class="kw">PRIMARY KEY</span>,
    run_id TEXT <span class="kw">NOT NULL REFERENCES</span> audit.pipeline_runs(run_id),
    source_table TEXT <span class="kw">NOT NULL</span>,
    iceberg_table TEXT <span class="kw">NOT NULL</span>,
    status TEXT <span class="kw">NOT NULL CHECK</span> (status <span class="kw">IN</span> (<span class="lit">'STARTED'</span>, <span class="lit">'SUCCESS'</span>, <span class="lit">'FAILED'</span>, <span class="lit">'SKIPPED'</span>)),
    input_event_count BIGINT,
    deduped_event_count BIGINT,
    insert_event_count BIGINT,
    update_event_count BIGINT,
    delete_event_count BIGINT,
    athena_query_execution_id TEXT <span class="kw">REFERENCES</span> audit.athena_queries(query_execution_id),
    produced_snapshot_id TEXT
);</code></pre>
  <p>This changed the lineage question. It is no longer enough to ask which batch produced the mart. The better question is:</p>
  <div class="diagram">Which source changes, operation types, merge rules, Iceberg snapshots,
dbt invocation, and code version produced this current-state mart?</div>

  <h2 id="airflow">8. Moving orchestration to Airflow</h2>
  <p>
    I first implemented the full demo in GitHub Actions because it gave me a simple, repeatable way to deploy resources,
    run the pipeline, prove lineage, and stop cost-bearing services. That was useful for the first production-style proof.
    But as the workflow became more data-oriented, the boundary became clear.
  </p>
  <p>
    GitHub Actions is a good place for CI/CD, Terraform checks, one-click triggers, and scheduled safety workflows.
    Airflow is a better place to express data dependencies, retries, task-level observability, and a data workflow graph.
    So I moved the Full Demo orchestration into a local Airflow DAG.
  </p>
  <div class="diagram">open_infra_window
  -> wait_rds_available
  -> apply_postgres_schema
  -> seed_operational_source
  -> run_ingestion_validation_iceberg_audit
  -> capture_source_snapshots_for_dbt
  -> dbt_build
  -> record_dbt_audit_evidence
  -> prove_lineage_query
  -> close_infra_window
  -> fail_if_pipeline_task_failed</div>
  <p>
    Airflow is useful here because the workflow is not just a script that happens to run many commands. Each task
    represents an operational checkpoint: infrastructure is opened for a bounded window, source data is prepared,
    ingestion and validation run, Iceberg snapshots are captured, dbt builds the marts, audit evidence is written,
    the lineage API is queried, and cleanup closes the expensive resources.
  </p>
  <div class="note">
    The value of Airflow in this project is operational clarity. It gives the demo a data workflow graph, task-level logs,
    explicit retry boundaries, and a visible cleanup step. GitHub Actions still owns CI/CD and safety checks; Airflow owns
    the data run.
  </div>

  <h2 id="lineage-api">9. Lineage API as the delivery</h2>
  <p>The most concrete way to present the project is not the architecture diagram. It is the API question a reviewer can ask after a run finishes:</p>
  <pre><code class="language-text">GET /lineage?run_id={run_id}&amp;model=mart_daily_trading_reconciliation</code></pre>
  <p>
    First, I read the response as a dbt reproducibility view. It proves that the mart was built from a successful pipeline
    run, successful dbt model execution, passing tests, complete dbt upstream lineage, and three Iceberg source snapshots
    captured with <code>snapshot_role = CONSUMED_BY_DBT</code>.
  </p>
  <pre><code class="language-text">GET /lineage?run_id=airflow-test-20260520-012812&amp;model=mart_daily_trading_reconciliation</code></pre>
  <p><em>Abridged response:</em></p>
  <pre><code class="language-json">{
  <span class="key">"run"</span>: {
    <span class="key">"run_id"</span>: <span class="str">"airflow-test-20260520-012812"</span>,
    <span class="key">"status"</span>: <span class="str">"SUCCESS"</span>,
    <span class="key">"orchestrator"</span>: <span class="str">"airflow"</span>,
    <span class="key">"git_sha"</span>: <span class="str">"dbcb28afadc9510515722a19974f38c74a170970"</span>
  },
  <span class="key">"model"</span>: {
    <span class="key">"model_name"</span>: <span class="str">"mart_daily_trading_reconciliation"</span>,
    <span class="key">"model_status"</span>: <span class="str">"SUCCESS"</span>
  },
  <span class="key">"lineage"</span>: {
    <span class="key">"upstream_models"</span>: [
      <span class="str">"model.fintrack_lineage.int_trade_cash_movements"</span>,
      <span class="str">"model.fintrack_lineage.stg_orders"</span>,
      <span class="str">"model.fintrack_lineage.stg_trades"</span>,
      <span class="str">"model.fintrack_lineage.stg_cash_movements"</span>
    ],
    <span class="key">"source_snapshots"</span>: [
      {
        <span class="key">"source_node"</span>: <span class="str">"source.fintrack_lineage.iceberg.orders"</span>,
        <span class="key">"table_name"</span>: <span class="str">"fintrack_lineage_dev_iceberg.orders"</span>,
        <span class="key">"snapshot_role"</span>: <span class="str">"CONSUMED_BY_DBT"</span>
      },
      {
        <span class="key">"source_node"</span>: <span class="str">"source.fintrack_lineage.iceberg.trades"</span>,
        <span class="key">"table_name"</span>: <span class="str">"fintrack_lineage_dev_iceberg.trades"</span>,
        <span class="key">"snapshot_role"</span>: <span class="str">"CONSUMED_BY_DBT"</span>
      },
      {
        <span class="key">"source_node"</span>: <span class="str">"source.fintrack_lineage.iceberg.cash_movements"</span>,
        <span class="key">"table_name"</span>: <span class="str">"fintrack_lineage_dev_iceberg.cash_movements"</span>,
        <span class="key">"snapshot_role"</span>: <span class="str">"CONSUMED_BY_DBT"</span>
      }
    ]
  },
  <span class="key">"warnings"</span>: [],
  <span class="key">"reproducible"</span>: <span class="bool">true</span>
}</code></pre>
  <p>
    In this API, <code>reproducible</code> means the audit store has the evidence needed to reproduce the run:
    a successful pipeline run, successful dbt model result, required source snapshot bindings, and no lineage warnings.
    It is an evidence-completeness check, not a re-execution of the business metric.
  </p>
  <p>
    The same run can also be read as a CDC merge-evidence view. It still answers the dbt reproducibility question, but it
    also shows what changed before dbt read the current-state Iceberg tables. That is why I expose CDC merge audit evidence:
    operation counts, Athena MERGE query ids, and produced Iceberg snapshots.
  </p>
  <pre><code class="language-text">GET /lineage?run_id=airflow-test-20260520-012812&amp;model=mart_daily_trading_reconciliation</code></pre>
  <p><em>Abridged response:</em></p>
  <pre><code class="language-json">{
  <span class="key">"run"</span>: {
    <span class="key">"run_id"</span>: <span class="str">"airflow-test-20260520-012812"</span>,
    <span class="key">"status"</span>: <span class="str">"SUCCESS"</span>,
    <span class="key">"orchestrator"</span>: <span class="str">"airflow"</span>
  },
  <span class="key">"lineage"</span>: {
    <span class="key">"source_snapshots"</span>: [
      {
        <span class="key">"table_name"</span>: <span class="str">"fintrack_lineage_dev_iceberg.orders"</span>,
        <span class="key">"snapshot_role"</span>: <span class="str">"CONSUMED_BY_DBT"</span>
      },
      {
        <span class="key">"table_name"</span>: <span class="str">"fintrack_lineage_dev_iceberg.trades"</span>,
        <span class="key">"snapshot_role"</span>: <span class="str">"CONSUMED_BY_DBT"</span>
      },
      {
        <span class="key">"table_name"</span>: <span class="str">"fintrack_lineage_dev_iceberg.cash_movements"</span>,
        <span class="key">"snapshot_role"</span>: <span class="str">"CONSUMED_BY_DBT"</span>
      }
    ]
  },
  <span class="key">"cdc_merge_runs"</span>: [
    {
      <span class="key">"source_table"</span>: <span class="str">"orders"</span>,
      <span class="key">"status"</span>: <span class="str">"SUCCESS"</span>,
      <span class="key">"insert_event_count"</span>: 101,
      <span class="key">"update_event_count"</span>: 1,
      <span class="key">"delete_event_count"</span>: 0,
      <span class="key">"athena_query_execution_id"</span>: <span class="str">"b2ae0a3c-e41a-4c08-9eeb-fe7662b05033"</span>
    },
    {
      <span class="key">"source_table"</span>: <span class="str">"cash_movements"</span>,
      <span class="key">"status"</span>: <span class="str">"SUCCESS"</span>,
      <span class="key">"insert_event_count"</span>: 103,
      <span class="key">"update_event_count"</span>: 0,
      <span class="key">"delete_event_count"</span>: 1,
      <span class="key">"athena_query_execution_id"</span>: <span class="str">"4efe148d-08be-47de-a25f-cc5ccb1f6e81"</span>
    }
  ],
  <span class="key">"warnings"</span>: [],
  <span class="key">"reproducible"</span>: <span class="bool">true</span>
}</code></pre>
  <p>
    This is the delivery I want from the project: not only “the DAG was green”, but a queryable proof object. The first
    view proves the snapshot-to-dbt reproducibility path. The second view adds the CDC evidence that produced the current
    state before dbt consumed it.
  </p>

  <h2 id="validation">10. Validation evidence</h2>
  <p>
    After the API proof, I still wanted a separate validation section, but with a different purpose. This section is about
    whether the demo really ran end to end and whether the cost-bearing resources were cleaned up, not about repeating the
    lineage response.
  </p>
  <table>
    <thead>
      <tr><th>Check</th><th>Evidence</th></tr>
    </thead>
    <tbody>
      <tr><td>Airflow DAG completed</td><td><code>fintrack_full_demo</code>, run id <code>airflow-test-20260520-012812</code></td></tr>
      <tr><td>CDC mode was exercised</td><td><code>full-load-and-cdc</code> with deterministic source mutations enabled</td></tr>
      <tr><td>dbt transformations and tests passed</td><td><code>PASS=41 WARN=0 ERROR=0 SKIP=0 TOTAL=41</code></td></tr>
      <tr><td>Lineage API was covered by local tests</td><td>response shape, missing snapshot warning, unknown run/model 404</td></tr>
      <tr><td>Cost-bearing resources were closed</td><td>DMS resources deleted, DMS API state not found, RDS final state <code>stopped</code></td></tr>
    </tbody>
  </table>
  <p>
    I kept GitHub Actions for CI/CD and safety workflows. The lightweight checks compile the Python entry points, run the
    local lineage query tests, and parse workflow YAML. The full data path lives in Airflow, while CI protects the code
    and configuration that make that path repeatable.
  </p>

  <h2 id="tradeoffs">11. Tradeoffs and limits</h2>
  <p>
    This project intentionally proves a narrow lineage contract instead of trying to build a universal lineage platform.
    That made the demo concrete, but it also leaves several production questions open:
  </p>
  <table>
    <thead>
      <tr><th>Decision</th><th>Tradeoff</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>dbt reads current-state Iceberg tables</td>
        <td>Simpler marts and tests, but raw event replay would need an additional append-only CDC history table.</td>
      </tr>
      <tr>
        <td>Audit store is PostgreSQL</td>
        <td>Easy to query and run locally, but a larger system would need retention, partitioning, and access control policies.</td>
      </tr>
      <tr>
        <td>Lineage API reads audit metadata only</td>
        <td>Fast and stable for proof queries, but it does not recompute business metrics or validate row-level values by itself.</td>
      </tr>
      <tr>
        <td>DMS runs only during demo windows</td>
        <td>Keeps cost bounded, but production CDC would need a long-running replication posture and stronger operational monitoring.</td>
      </tr>
    </tbody>
  </table>
  <p>
    The next version I would build is a side-by-side comparison of latest-state CDC and event-history CDC. Latest-state
    tables are good for dbt marts; event-history tables are better for replay, debugging, and explaining every intermediate
    change that led to the current state.
  </p>

  <h2 id="lessons">12. Design takeaways</h2>
  <ul>
    <li>Lineage is evidence, not only a graph. A graph shows dependencies; audit evidence proves a specific run.</li>
    <li>dbt artifacts need data version context. The manifest explains transformation dependencies; Iceberg snapshots identify the source table versions.</li>
    <li>Control plane and data plane should stay separate. Terraform manages resources; Athena/dbt/Glue execute data operations.</li>
    <li>Airflow should own data dependencies. GitHub Actions remains useful for CI/CD and safety workflows, but the full data path is clearer as an Airflow DAG.</li>
    <li>Snapshot semantics matter. Produced snapshots and consumed snapshots answer different questions.</li>
    <li>Cost control is part of the architecture. DMS and RDS were run-window resources, not permanent demo infrastructure.</li>
    <li>CDC is not just “more ingestion”. It changes idempotency, merge semantics, table state, and audit requirements.</li>
  </ul>
