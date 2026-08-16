# Populations

The population is the instrument. Everything the run can find is decided here,
before a single request goes out.

## Sizing

Hundreds, not dozens. Forty accounts cannot contain a rare segment, and the rare
segment is where the defect is. Four hundred is enough to give a 3% archetype
twelve members, which is enough to see a pattern rather than an anecdote.

## The archetypes that earn their place

Ordinary behaviour, which sets the baseline:

- **The decided.** Knows what they want, uses the product as intended, completes
  everything. The reference case, and usually the only one anybody tests.
- **The flexible.** Says yes to the widest set of options. Often the only
  segment a filtered product serves properly, which disguises the problem.
- **The constrained.** Says no to everything optional: will not move, will not
  compromise. The honest majority, and the first to be starved by a filter.
- **The tourist.** Arrives from a launch post, looks, does not engage, leaves.
  Will dominate day one traffic and will write the public commentary.
- **The lurker.** Signs up, reads, never acts. Invisible in engagement metrics
  and large in reality.
- **The latecomer.** Wants the thing eventually rather than now. Tests whether
  urgency-based ranking quietly excludes them.
- **The edges.** Youngest and oldest permitted. Tests boundary validation and
  whether the product has anything for them.

Misbehaviour, which is where the defects are:

- **The flooder.** Sends the same thing many times to one target. Finds rate
  limits that count the wrong thing.
- **The abuser.** Hostile content to matched users. Finds whether the abuse
  model requires a victim to act.
- **The quitter.** Deletes mid-conversation. Finds dangling references, ghost
  rows, and sessions that outlive their account.
- **The vandal.** Sends what a curious engineer sends from devtools: own id in
  someone else's field, ids that do not exist, values outside enums, empty
  payloads. Finds authorisation defects.

## Input, not just behaviour

The population must also carry awkward *data*, because most validation defects
are input defects:

- Unicode names, RTL scripts, CJK, accented characters, apostrophes.
- Emoji in a name field.
- Names at and beyond the length limit.
- Padded strings with leading and trailing whitespace.
- Empty optional fields, and maximum-length optional fields.
- Single-language speakers, in countries with few other members.
- A deliberately uneven sex or category split. No real population is 50/50, and
  the minority side experiences a different product.

## Geography

If the product is global, the population must contain small markets and
non-English languages. An all-English cohort cannot find a language defect, and
an all-large-market cohort cannot find a density defect. Both were real.
