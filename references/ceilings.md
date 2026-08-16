# Ceilings

Some numbers do not move, and the reason is more useful than the numbers that
did.

## The observed case

Removing a filter tripled how many people each user could see. Matches went from
131 to 132.

That is not a failed change. It is a measurement of where the constraint sits.
Reach was limiting who could be *seen*; it was never limiting who said yes back.
At that density, mutual willingness was the ceiling, and no amount of ranking,
filtering or ordering lifts a mutual-willingness ceiling. Only more people do.

Shipping another ranking change after seeing that would have been the mistake.

## How to tell a ceiling from a bug

Run the change and compare two things:

1. **Exposure.** How many candidates each account was offered.
2. **Outcome.** How many reached the state the product exists for.

| Exposure | Outcome | Reading |
|---|---|---|
| up | up | The change worked. |
| up | flat | Exposure was not the constraint. Look one layer in. |
| flat | flat | The change did not reach the mechanism you thought. |
| flat | up | Something else changed. Find out what before believing it. |

The second row is the one that gets misread, because the change did work and the
graph still looks disappointing. Say plainly that the constraint is elsewhere and
name it.

## Common ceilings

- **Density.** Two-sided products need both sides present. Below a threshold no
  feature substitutes for people, and every product change is noise against it.
- **Reciprocity.** Any outcome needing two independent yeses is bounded by the
  product of two rates, and improving one side barely moves it.
- **Intent.** A segment that arrived to look rather than to act converts at its
  own rate regardless. Measure it separately and stop trying to fix it.
- **Frequency.** If the action is rare by nature, a session-level metric cannot
  show improvement no matter what changed.

## What to do instead

When exposure moves and outcome does not, the honest next steps are usually not
product changes at all:

- Increase density in a narrow slice rather than broadly, so the same total
  users produce more viable pairs.
- Convert one-sided intent into outcomes: surface that somebody already acted,
  so a return visit closes the loop instead of starting over.
- Reduce the number of independent yeses an outcome requires.

Say which one you are recommending, and say that the previous change was still
correct on its own terms. Both things are true, and a report that only says one
of them is misleading.
