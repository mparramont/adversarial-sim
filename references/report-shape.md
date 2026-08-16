# Report shape

Lead with what broke. A report that opens with a funnel chart buries the reason
it was written.

## Structure

1. **Headline tiles.** Four numbers, each a before and after. Defects, the
   worst-served segment, an abuse measure, and the one outcome that matters.
2. **The verdict.** Two sentences naming the single most concrete finding, with
   the smallest true number in it. "A Japanese speaker in Japan saw 2 cards and
   now sees 20" beats any percentage.
3. **What the run found.** One block per defect: what happened, the measurement,
   why the previous run missed it. That last clause is what improves the next
   run.
4. **The numbers.** A before-and-after table, then a per-segment table with
   every segment in it, including the ones that did not change.
5. **What did not move, and why.** See `ceilings.md`. This section is not
   optional and is usually the most useful one.
6. **What this still does not tell you.** The limits of the method, stated by
   the person who ran it rather than discovered by the reader.

## Sentences worth stealing

On a population that was too small:

> The first run put forty well-behaved accounts through the happy path and found
> one defect. That is not what a launch does.

On a defect the previous run could not have found:

> The run found it only because the population had non-English countries in it.
> Forty English-speaking accounts never would have.

On a number that did not move:

> Reach was the constraint on who you could see, not on who says yes back. At
> this density, mutual willingness is the ceiling, and no ranking change lifts
> it.

On the method's own limits:

> Simulated people are agreeable. They fill fields, they answer, they do not
> photograph a car. Real dropoff will be worse than any number here.

## Proof media

If the report carries a recording, drive the flow until the state being
demonstrated actually arrives, and let the running time be the evidence. A
recording built from a fixed number of steps lasts the same however much or
little it contains, which turns a caption into a claim the video does not
support. Verify by reading the duration back off the published page, and by
extracting a frame and looking at it.
