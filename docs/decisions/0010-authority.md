# 0010 — Authority

**Date:** 2026-11-16
**Status:** Accepted (working)
**Closes:** the last incomplete area — nothing said who may deliver an event to what.

## The split

Authority has two halves, and putting either half in the wrong place breaks something.

| Half | Lives in | Why |
|---|---|---|
| **What is allowed** — roles and their grants | the World document | a World must carry its own rules to be portable and testable |
| **Who is acting** — principals and role bindings | the host session | identities are deployment-specific and change per session |

A World that embedded principals would not be portable. A host that embedded the rules would make
the World's behaviour depend on where it was opened.

## D-042 — Policy is a template in the World; bindings are session state

A World MAY declare `policy: { roles: [...] }`. Each role has an id and a list of grants.

Principals are never World entities (C-27). The host issues a principal for each session and binds
it to one or more roles. Session bindings are runtime state and never enter the document.

A World with no policy is operable only by the host's owner principal.

## D-043 — Four verbs, three scopes, deny by default

| Verb | Allows |
|---|---|
| `deliver` | submit an event to an endpoint |
| `read` | read a value from an endpoint, and subscribe to committed generations containing it |
| `mutate` | document operations: create, delete, move, group, instantiate, membership, connections, presentation, designation |
| `run` | attach, cancel, suspend, resume |

| Scope | Covers |
|---|---|
| `{ world: true }` | every endpoint in the World |
| `{ entities: [...] }` | those entities and their **public** interfaces |
| `{ endpoints: [...] }` | exactly those ports or aliases |

A grant on a Composite covers its aliases only. It never reaches a member port, a member's state,
or a nested Composite's internals. The boundary is the reason the scope exists.

Nothing is granted by default. A role with no matching grant is denied.

## D-044 — Authority is checked at the boundary, once

An external event or command is authorised when it enters the World. After that, internal routing
— alias resolution, forwarding, dispatch, child notification — is authorised by structure, not
re-checked against the acting principal.

Reasons:

- a manager dispatching to a member would otherwise need the *original actor* to hold `deliver` on
  that member's input, which would make delegation impossible;
- re-checking per hop would make authority depend on route shape, and routes are internal;
- one check at one place is auditable; N checks along a path are not.

The manager's right to dispatch was authorised once, at designation (S-14).

The event envelope keeps `origin` (the acting principal) and `emitter` (the entity or run that most
recently created the event) separate, so a delegated action is still attributable after the fact.

## D-045 — The file holder is not governed by policy

Whoever opens a World owns it: the owner principal has implicit `mutate` and `run` on any World it
loads. Policy governs *sessions*, not the person holding the file.

This is not a security model for untrusted documents — it is a model for multi-party sessions over
a document someone already trusts. Pretending otherwise would be theatre: a file holder can edit
the document, including its policy.

A renderer is never an enforcement point. It may hide a control, but the runtime decides.

## Consequences

- The audience-voting scenario becomes expressible: role `audience` with `deliver` on the two
  button endpoints and `read` on the Composite's public outputs.
- A presenter view can hold `read` at world scope without gaining any write authority.
- An agent session can be given `mutate` on one Composite and nothing else.
- Authority never implies attention, and attention never implies authority.
