# Invariants

A metric tells you how a run went. An invariant tells you what broke, and where.
Prefer invariants: they name a defect with the request that caused it, instead
of a number somebody has to interpret afterwards.

An invariant is a sentence that must be true of every response, phrased so that
its violation is obviously a bug rather than a matter of taste.

## Shape

```js
const defects = [];
const violation = (kind, detail) => defects.push({ kind, ...detail });

// Checked on every response, not sampled.
if (card.id === viewer.id) violation("result-contains-self", { who: viewer.id });
```

Report them grouped by kind, with the first example of each kind carrying enough
context to reproduce. A count alone is not actionable.

## The ones that generalise

**Identity and authorisation**

- A write authenticated as A never modifies B's row. Test it by posting B's id
  in the body; this is the single most valuable probe in the set.
- A result set never contains the caller.
- A session belonging to a deleted or suspended account is refused on the very
  next request, not at the next expiry.
- A resource belonging to somebody else answers "not found", not "forbidden".
  Probing ids should teach a stranger nothing.

**Result sets**

- No duplicates.
- Nothing already acted on reappears.
- Nothing excluded by a stated rule appears, in either direction of a
  relationship. Blocking is directional in the data and must be symmetric in
  visibility.
- Nothing belonging to a deleted account appears, anywhere, ever.
- Ordering is deterministic. The same request twice returns the same order.

**Lifecycle**

- Deletion removes what the interface promised it removes, checked by querying
  the store afterwards rather than trusting the response.
- An action that closes a relationship closes it from both sides.
- A flag the client sends that the server also computes must agree, or the
  server must win. Check both.

**Refusals**

- Every deliberately malformed request is refused with the status it should be.
  Collect the probes as a table of `[name, payload, allowed statuses]` and assert
  membership, so a change of status shows up as a diff.
- A refusal is never a 500. A 500 on bad input is a defect even when the input
  was absurd.

## Phrase it at the right layer

An invariant asserted at the wrong layer produces confident nonsense. A first
attempt at the symmetry check above asserted that if B is in A's result page
then A is in B's. It fired 560 times against a product that was working
correctly, because the page is the top twenty after per-viewer ranking, and two
people rank each other differently.

The property that mattered was reachability, one layer down: nobody should be
unreachable by everybody. That is measured by collecting every id offered to
anyone across the whole run and subtracting, not by comparing two pages.

Before adding an invariant, ask which layer owns the property: the row, the
query, the page, or the run. Symmetry belongs to the query. Uniqueness belongs
to the page. "Nobody is invisible" belongs to the run.

Expect this: when a check fires in the hundreds, suspect the check first.

## Writing a new one

Ask: what would make a user say "that should not have happened"? Phrase that as
a sentence about a single response. If the sentence needs the word "usually" or
"mostly", it is a metric, not an invariant; put it in the report instead.
