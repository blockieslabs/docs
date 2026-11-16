# 0006 — What the traces forced

**Date:** 2026-11-16
**Status:** Accepted (working)
**Source:** `traces/0001-reference-traces.md`
**Closes:** I-001

## D-029 — Process phase scheduling and failure classes

The process phase runs after the event phase drains and before value stabilisation.

**Scheduling**

- Ready runs are processed through their own FIFO. Among runs that become ready at the same
  point, order is ascending run ID (the same deterministic tie-break used elsewhere).
- A run may step **at most once per transaction**.
- A step may append to another run's inbox, or dispatch to a member. If the target run has not
  yet stepped in this transaction, it joins the FIFO. If it has, it is deferred.
- A per-transaction step budget is enforced. When it is exhausted, remaining ready runs are
  deferred to the next transaction; the current transaction still commits a consistent
  generation. The budget is not an error.
- A run that becomes ready after it has already stepped is always deferred. This is what bounds
  the phase and prevents a dispatch loop from running inside one commit.

**Failure classes**

| Event | Class | Result |
|---|---|---|
| Step throws, traps, or exceeds its time or memory budget | run-local | run → `failed`; transaction commits |
| Step returns an undeclared output, an invalid value, or dispatches to an undeclared target | contract violation | transaction aborts |
| Inbox append fails validation (unknown input, wrong payload) | transaction-fatal | transaction aborts |

The split mirrors reducers and compute: a failure of execution is a legitimate outcome and
commits; a violation of the declared contract is a bug and aborts.

## D-030 — Wake semantics: runs never observe mid-transaction values

A wait condition with reason `dependency` is satisfied when one of the observed values changes.
That change becomes visible in the **value phase**, which is after the process phase. Therefore
the satisfied run is scheduled for a **later** transaction, never the current one.

Consequences:

- A run can never observe a value change in the same transaction that produced it.
- A run's step always reads one coherent generation.
- Cascades across runs are transaction-bounded, which is what makes D-029's one-step rule
  sufficient.

This is glitch-freedom by construction. It is not a limitation to be worked around later.

## D-031 — Attention is bindings ∪ sessions

Attention, the last open piece of I-001, is a projection over two sources:

| Observer | Source of attention |
|---|---|
| External actor | session viewport and grant scope (F-13) |
| In-world run | the entities whose outputs its host's declared input ports are connected to |

A run attends to what it can read. An actor attends to what its session covers. Neither confers
membership, management, data access beyond the declared binding, or authority. A Blockie moved
next to a Composite attends to nothing.

## Amendment

F-21's wait reasons gain `inbox`: a run that is alive with an empty inbox and no other pending
condition is `waiting` on `inbox`, which projects to `idle` under D-019. Without it, the commonest
state in the system — a button waiting to be pressed — had no representation.
