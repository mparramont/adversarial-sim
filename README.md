# adversarial-sim

An agent skill for finding product defects before a launch does, by driving a
large synthetic population through a real staging instance and checking
invariants on every response.

It loads as an agent skill through the `SKILL.md` frontmatter, and the reference
files stand alone as prose.

- `SKILL.md`: the method, and the honesty rules that keep a run truthful.
- `references/filter-ladder.md`: why removing one hard filter reveals the next,
  and how to enumerate them before running anything.
- `references/populations.md`: the segment archetypes, the awkward input, and
  why an all-English cohort cannot find a language defect.
- `references/invariants.md`: the assertions that generalise, and how to phrase
  new ones.
- `references/ceilings.md`: what to do when exposure moves and outcomes do not.
- `references/report-shape.md`: the report structure, and sentences worth
  stealing.
- `example-simulation.mjs`: the real simulation this was extracted from.

## Why it exists

The first run of that simulation used forty agreeable, English-speaking accounts
on the happy path, and found one defect. The same product, given four hundred
accounts across twelve segments including non-English countries and four
adversarial ones, gave up three more immediately, one of which was a dead market
on three continents.

A simulation finds only what its population contains. If a run finds almost
nothing, suspect the population before congratulating the product.

## Install

```sh
npx skills add mparramont/adversarial-sim@adversarial-sim
```

## Licence

MIT.
