---
name: adversarial-sim
description: Find product defects before a launch does, by driving a large synthetic population through a real staging instance and checking invariants on every response. Use when a product is near launch, when a simulation found suspiciously few problems, or when you need to know how a change affects segments rather than averages. Triggers include "simulate users", "will this survive launch", "synthetic users", "adversarial simulation", "what will break".
license: MIT
---

# Adversarial simulation

A launch is a population meeting a product. Most pre-launch testing is one
careful person meeting a product, which is why launches still surprise people.

This skill runs the population instead: hundreds of synthetic accounts across a
dozen segments, several of which exist to misbehave, driven through a real
staging instance while invariants are checked on every response.

## The rule that matters most

**A simulation finds only what its population contains.**

The first run of the simulation this skill came from used forty agreeable,
English-speaking accounts on the happy path. It found one defect. The same
product, given four hundred accounts across twelve segments including
non-English countries and four adversarial ones, gave up three more defects
immediately, one of which was a dead market on three continents.

If a run finds almost nothing, suspect the population before congratulating the
product.

## Method

1. **Enumerate every hard filter first.** Write them down before running
   anything. Every rule that removes somebody from a result is a candidate
   defect, and they hide behind each other: see `references/filter-ladder.md`.
2. **Build the population from segments, not averages.** Ten to fifteen
   segments, each with its own behaviour, at least three of which misbehave.
   `references/populations.md` has the archetypes and why each earns its place.
3. **Seed the randomness.** A defect found once must be findable again, and two
   versions must be comparable. Same seed, same cohort, same order.
4. **Run against the real thing.** A staging instance with a real database, real
   HTTP, real auth. Mocks agree with your assumptions, which is the problem.
5. **Assert invariants, do not collect metrics.** An invariant is a sentence
   that must be true of every response. `references/invariants.md` lists the
   ones that generalise, and how to phrase new ones.
6. **Report by segment and by minority.** Averages hide the failure. Sort by the
   worst-served group, not the mean.
7. **Fix, then re-run the same seed.** The diff between two runs is the evidence
   that the fix worked and did not cost something elsewhere.

## What to check beyond correctness

Correctness invariants (nobody sees a blocked user, no write crosses accounts)
are the easy half and usually hold. The defects that reach launch are these:

- **Starvation.** Some segment sees almost nothing. Find it by sorting the
  per-segment and per-country results ascending, never by reading the mean.
- **Rules that count the wrong thing.** A rate limit that counts a day of
  activity will not notice forty messages sent to one person in a minute.
  Ask what the abusive *behaviour* is, then check the limit counts that.
- **Dead options.** A three-way choice where the middle value behaves exactly
  like one of the ends. Detect by grouping outcomes by the option's value.
- **Rules that reject what the system would have fixed.** Validation that
  refuses input a normaliser was about to clean. Grep for a reject and a
  truncate on the same field.
- **Ceilings the product cannot lift.** If a change moves reach but not
  outcomes, the constraint is elsewhere. Say so rather than shipping another
  ranking change: see `references/ceilings.md`.

## Honesty rules

These exist because each one was violated at least once before it was written.

- **Simulants are agreeable.** They fill every field, they answer, they never
  abandon halfway. Real dropoff is worse than any number a simulation produces.
  Model abandonment explicitly and still treat the result as a ceiling.
- **A number that did not move is a finding.** Report it as loudly as the ones
  that did, and name what the real constraint is.
- **Proof media must show the thing it claims.** A recording with a fixed number
  of steps runs the same length whatever it contains, which makes a caption a
  lie. Drive the flow until the state it is demonstrating actually arrives, and
  let the running time be the evidence.
- **Do not simulate against production.** Ever. Seed a separate database.

## Deliverable

A report that leads with defects, then the per-segment table, then what did not
move and why. `references/report-shape.md` has the structure and the sentences
worth stealing.
