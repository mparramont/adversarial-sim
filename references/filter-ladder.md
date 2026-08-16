# The filter ladder

Every rule that removes somebody from a result is a candidate defect, and they
hide behind each other. Remove the outermost and the next one becomes the
constraint, usually without anybody noticing that it now is one.

Observed on a dating product, three rounds running:

| Round | Filter removed | What it was hiding |
|---|---|---|
| v1 | Distance: cross-border needed one side willing to move | 492 of 800 possible pairs dropped. Median deck 6. |
| v2 | Language: no shared language meant no card | Thailand, Japan and Italy all on a 0% match rate. |
| v3 | Nothing left to remove at that layer | The pool query itself: only the 200 most recently updated rows were ever considered. |

The pattern is not specific to dating. Any pipeline of the shape
`fetch -> filter -> filter -> rank -> paginate` has it.

## How to enumerate

Write the list before running anything. Include, for each:

1. The rule, as a sentence.
2. What it removes, as a number, measured rather than guessed.
3. Whether it is a product decision or an implementation convenience.

The third column is the one that matters. A product decision stays and gets
tested. An implementation convenience is a defect waiting for the layer above it
to be fixed.

## The filters people forget

- **The pool query.** `LIMIT 200 ORDER BY updated_at DESC` is a filter. At small
  scale it never binds, and the day it does, everyone outside the most recently
  active rows becomes invisible with no code change.
- **The page size.** A cap of 20 makes 20 and 2000 look identical in any metric
  that counts what was returned. Measure the pool before the cap, not after.
- **Client-side hiding.** A row fetched then not rendered is a filter that no
  server test will find.
- **Implicit ordering.** If a tie is broken by id, the same accounts win every
  time. That is a filter that runs once per request forever.

## The test

For each filter, run the simulation with it disabled and compare per-segment
outcomes. If disabling it changes nothing, it is not binding today and should be
noted as a future risk. If it changes a minority segment sharply and the average
barely at all, it is exactly the defect this method exists to find.
