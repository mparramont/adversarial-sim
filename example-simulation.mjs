// A worked example: the simulation this skill was extracted from.
//
// It drives a synthetic population through a real staging instance of a dating
// product and checks invariants on every response. It is included whole, rather
// than as a sketch, because the useful parts are the awkward ones: the segments
// that misbehave, the unicode in the name list, the tamper probes, the
// never-seen measurement that found a hidden pool filter, and the per-segment
// reporting that puts the worst-served group first.
//
// Nothing here is reusable as a library. Copy the shape, not the endpoints.
//
// ---------------------------------------------------------------------------

// Drive a large, awkward population through the real API and record everything
// that should not have happened.
//
//   npm run simulate            # 400 accounts
//   SIM_SIZE=1000 npm run simulate
//
// The first version of this file counted match rates on forty well-behaved
// accounts and found one defect. That is not what a launch does. A launch sends
// people who type emoji into a name field, who delete an account in the middle
// of somebody else's conversation, who paste the same message two hundred
// times, and who report a stranger for fun. So this version does three things
// the first did not:
//
//   1. Population. Hundreds of accounts across a dozen segments, including ones
//      that exist to misbehave.
//   2. Adversarial input. Names, bios and payloads chosen to break something.
//   3. Invariants, checked continuously. Every violation is a defect with the
//      request that caused it, not a number to interpret afterwards.
//
// Runs against a staging D1 seeded by the harness, never production.

const BASE = process.env.APHRODITE_API ?? "http://localhost:8788/api/aphrodite";
const SIZE = Number(process.env.SIM_SIZE ?? 400);

// Deterministic, so a defect found once can be found again.
let seed = Number(process.env.SIM_SEED ?? 20260816);
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// --------------------------------------------------------------- defects

const defects = [];
/** Something that must never happen, with enough context to reproduce it. */
function violation(kind, detail) {
  defects.push({ kind, ...detail });
}

// ------------------------------------------------------------ population
//
// The awkward parts of a real signup sheet. Every one of these is somebody a
// launch will actually send.

const NAMES = [
  "Praxilla", "Aristos", "Théano", "Søren", "Zoë", "Björn", "李明", "さくら",
  "Ana-María", "O'Brien", "Иван", "Nguyễn", "मीरा", "Ελένη", "İpek", "Þóra",
  "  padded  ", "x", "Ω", "Mary Jane Watson-Parker III",
];
const EMOJI_NAME = "🌸 Rose 🌸";
const LONG_NAME = "A".repeat(60);

const COUNTRIES = [
  "SG", "SG", "SG", "SG", "SG", "US", "US", "US", "GB", "GB", "DE", "ES",
  "JP", "AU", "IN", "BR", "FR", "IT", "NL", "SE", "PL", "MX", "ZA", "NG",
  "KE", "AR", "CL", "PT", "IE", "NZ", "VN", "TH", "PH", "ID", "TR", "AE",
];
const LANGS = {
  SG: ["en", "zh"], US: ["en"], GB: ["en"], DE: ["de"], ES: ["es"], JP: ["ja"],
  AU: ["en"], IN: ["hi", "en"], BR: ["pt"], FR: ["fr"], IT: ["it"], NL: ["nl", "en"],
  SE: ["sv", "en"], PL: ["pl"], MX: ["es"], ZA: ["en"], NG: ["en"], KE: ["sw", "en"],
  AR: ["es"], CL: ["es"], PT: ["pt"], IE: ["en"], NZ: ["en"], VN: ["vi"],
  TH: ["th"], PH: ["en", "tl"], ID: ["id"], TR: ["tr"], AE: ["ar", "en"],
};
const VIRTUES = ["arete", "thymos", "sophrosyne", "xenia", "kleos", "ponos", "charis", "techne", "hygieia", "mania", "philia", "eros"];

// Twelve segments. The last four exist to misbehave.
const SEGMENTS = {
  planner:     { w: 18, swipes: 30, woo: 0.35, msg: 0.8,  edits: 0.3 },
  mover:       { w: 10, swipes: 35, woo: 0.45, msg: 0.7,  edits: 0.2, relocate: "anywhere" },
  homebody:    { w: 12, swipes: 20, woo: 0.30, msg: 0.6,  edits: 0.1, relocate: "stay" },
  tourist:     { w: 20, swipes: 6,  woo: 0.12, msg: 0.15, edits: 0.05 },
  lurker:      { w: 8,  swipes: 3,  woo: 0.02, msg: 0.0,  edits: 0.0 },
  latecomer:   { w: 6,  swipes: 15, woo: 0.25, msg: 0.5,  edits: 0.4, timeline: "later" },
  older:       { w: 6,  swipes: 18, woo: 0.30, msg: 0.6,  edits: 0.2, age: [46, 62] },
  youngest:    { w: 4,  swipes: 22, woo: 0.40, msg: 0.7,  edits: 0.3, age: [18, 21] },
  // Misbehaving from here down.
  spammer:     { w: 5,  swipes: 60, woo: 0.95, msg: 1.0,  edits: 0.0, floods: true },
  harasser:    { w: 4,  swipes: 40, woo: 0.8,  msg: 1.0,  edits: 0.0, abusive: true },
  quitter:     { w: 4,  swipes: 12, woo: 0.4,  msg: 0.4,  edits: 0.0, deletes: true },
  // Leaves without deleting, which is what most people actually do. Half never
  // finish the profile at all; the rest stop after a card or two.
  abandoner:   { w: 10, swipes: 2,  woo: 0.15, msg: 0.05, edits: 0.0, abandons: 0.5 },
  vandal:      { w: 3,  swipes: 10, woo: 0.3,  msg: 0.3,  edits: 0.0, tampers: true },
};

function chooseSegment() {
  const total = Object.values(SEGMENTS).reduce((n, s) => n + s.w, 0);
  let roll = rand() * total;
  for (const [name, spec] of Object.entries(SEGMENTS)) {
    if ((roll -= spec.w) <= 0) return [name, spec];
  }
  return ["planner", SEGMENTS.planner];
}

function buildCohort(size) {
  const people = [];
  for (let i = 0; i < size; i += 1) {
    const [segment, spec] = chooseSegment();
    const country = pick(COUNTRIES);
    // Deliberately uneven: a real app is never 50/50, and the minority side
    // sees a very different product.
    const sex = chance(0.58) ? "man" : "woman";
    const [lo, hi] = spec.age ?? [22, 44];
    let name = pick(NAMES);
    if (chance(0.04)) name = EMOJI_NAME;
    if (chance(0.03)) name = LONG_NAME;

    people.push({
      id: `sim-${String(i).padStart(4, "0")}`,
      segment, spec, sex, country,
      displayName: name,
      birthYear: 2026 - between(lo, hi),
      relocate: spec.relocate ?? pick(["stay", "stay", "country", "country", "anywhere"]),
      // A third speak one language only, which is what makes the language rule bite.
      languages: chance(0.35) ? [LANGS[country][0]] : LANGS[country],
      bio: chance(0.15) ? "" : chance(0.05) ? "b".repeat(590) : `${name.trim()} wants children.`,
      timeline: spec.timeline ?? pick(["now", "now", "soon", "soon", "later"]),
      heirsWanted: pick([1, 2, 2, 2, 3, 3, 4]),
      virtues: [...new Set([pick(VIRTUES), pick(VIRTUES), pick(VIRTUES)])],
      rites: between(0, 3),
      tideBonus: 0,
    });
  }
  return people;
}

// ------------------------------------------------------------------ calls

let requests = 0;
async function api(path, { as, method = "GET", body } = {}) {
  requests += 1;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(as ? { cookie: `aphrodite_session=${as}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed = {};
  try { parsed = await response.json(); } catch { /* no body */ }
  return { status: response.status, body: parsed };
}

const sess = (person) => `sess-${person.id}`;

// ------------------------------------------------------------------- runs

async function run() {
  const people = buildCohort(SIZE);
  const byId = new Map(people.map((p) => [p.id, p]));
  const stats = { profileRejected: 0, rateLimited: 0, deleted: 0, blocks: 0, reports: 0 };

  // ---------------------------------------------------------- 1. profiles
  for (const person of people) {
    // Half the abandoners never finish the form. They are counted as arrivals
    // and never as users, which is the shape of a real signup funnel.
    if (person.spec.abandons && chance(person.spec.abandons)) {
      person.abandonedAtOath = true;
      continue;
    }
    const { status, body } = await api("/profile", {
      as: sess(person), method: "PUT", body: person,
    });
    if (status !== 200) {
      stats.profileRejected += 1;
      person.rejected = body.problems?.map((p) => p.field) ?? [status];
      // A profile this simulation believes is valid must be accepted. Anything
      // else is either a validation bug or a rule nobody documented.
      violation("profile-rejected", {
        who: person.id, segment: person.segment, status,
        fields: person.rejected, name: JSON.stringify(person.displayName),
      });
      continue;
    }
    // Unicode and padding must survive the round trip intact.
    const stored = body.profile?.displayName;
    if (stored !== person.displayName.trim().slice(0, 40)) {
      violation("name-mangled", { who: person.id, sent: person.displayName, stored });
    }
    person.ok = true;
  }

  const active = people.filter((p) => p.ok);

  // ------------------------------------------------------- 2. first decks
  //
  // Every id anybody was ever offered. A profile that appears in nobody's deck
  // is invisible to the whole product, which no per-user metric can show: each
  // individual deck looks full while a slice of the population is unreachable.
  const everSeen = new Set();
  for (const person of active) {
    const { body } = await api("/deck", { as: sess(person) });
    person.deck = body.cards ?? [];
    for (const card of person.deck) everSeen.add(card.id);
    checkDeck(person, person.deck, byId, "first");
  }
  stats.neverSeen = active.filter((p) => !everSeen.has(p.id)).length;
  stats.everSeen = everSeen.size;

  // Reachability, not the page, is what has to be symmetric.
  //
  // A first attempt asserted that if B is in A's deck then A is in B's, and it
  // fired 560 times against a product that was working. It could not have held:
  // the deck is the top twenty after per-viewer ranking, so two people rank
  // each other differently and land on different pages. The instrument was
  // wrong, not the product.
  //
  // What genuinely must hold is that nobody is unreachable, which `neverSeen`
  // above measures directly: a ring-rotated pool sent it to 748 of 1,148 while
  // every individual deck still looked full.

  // --------------------------------------------------------- 3. behaviour
  for (const person of active) {
    person.woos = 0; person.matches = []; person.sent = 0;
    const budget = Math.min(person.spec.swipes, person.deck.length);

    for (let i = 0; i < budget; i += 1) {
      const card = person.deck[i];
      const eager = person.spec.woo * (0.5 + card.harmony / 100);
      const verdict = chance(eager) ? "woo" : "pass";
      const { status, body } = await api("/judge", {
        as: sess(person), method: "POST", body: { subjectId: card.id, verdict },
      });

      if (status === 429) { stats.rateLimited += 1; break; }
      if (status !== 200) {
        violation("judge-failed", { who: person.id, subject: card.id, status, error: body.error });
        continue;
      }
      if (verdict === "woo") person.woos += 1;
      if (body.matched) person.matches.push({ id: body.matchId, with: card.id });
    }

    // A vandal tries the things a curious engineer tries in devtools.
    if (person.spec.tampers) await tamper(person, byId);
  }

  // ------------------------------------- 3b. the second visit, if prompted
  //
  // v4 tells people how many are waiting on their answer. The behaviour that
  // is supposed to cause is a return visit that closes the loop, so it is
  // modelled rather than assumed: anybody told somebody is waiting comes back
  // with a probability, and swipes a few more.
  for (const person of active) {
    const { body } = await api("/deck", { as: sess(person) });
    const waiting = body.waitingOnYou ?? 0;
    person.waitingOnYou = waiting;
    if (waiting === 0) continue;
    // Lurkers and abandoners still mostly do not come back.
    const returns = person.spec.swipes <= 3 ? 0.15 : 0.55;
    if (!chance(returns)) continue;
    person.returned = true;

    for (const card of (body.cards ?? []).slice(0, 8)) {
      const eager = person.spec.woo * (0.6 + card.harmony / 100);
      const verdict = chance(eager) ? "woo" : "pass";
      const { status, body: judged } = await api("/judge", {
        as: sess(person), method: "POST", body: { subjectId: card.id, verdict },
      });
      if (status === 429) { stats.rateLimited += 1; break; }
      if (status !== 200) continue;
      if (verdict === "woo") person.woos += 1;
      if (judged.matched) person.matches.push({ id: judged.matchId, with: card.id });
    }
  }

  // ------------------------------------------------- 4. talking, and abuse
  for (const person of active) {
    for (const match of person.matches) {
      if (!chance(person.spec.msg)) continue;
      const rounds = person.spec.floods ? 40 : 1;
      for (let i = 0; i < rounds; i += 1) {
        const text = person.spec.abusive
          ? "you are worthless, answer me"
          : `Chaire. Where would you settle? (${i})`;
        const { status } = await api("/messages", {
          as: sess(person), method: "POST", body: { matchId: match.id, body: text },
        });
        if (status === 429) { stats.rateLimited += 1; break; }
        if (status === 200) person.sent += 1;
        else if (status !== 404) {
          violation("message-failed", { who: person.id, match: match.id, status });
        }
      }
    }
  }

  // ----------------------------------------- 5. blocking, reporting, leaving
  for (const person of active) {
    // Anyone who was messaged by a harasser or a spammer may act on it.
    for (const match of person.matches) {
      const other = byId.get(match.with);
      if (!other) continue;
      const nasty = other.spec.abusive || other.spec.floods;
      if (!nasty || !chance(0.6)) continue;

      const action = chance(0.5) ? "block" : "report";
      const { status } = await api("/safety", {
        as: sess(person), method: "POST",
        body: action === "block"
          ? { action: "block", subjectId: other.id }
          : { action: "report", subjectId: other.id, reason: "harassment" },
      });
      if (status !== 200) violation("safety-failed", { who: person.id, action, status });
      else if (action === "block") { stats.blocks += 1; person.blocked ??= []; person.blocked.push(other.id); }
      else { stats.reports += 1; person.reported ??= []; person.reported.push(other.id); }
    }

    if (person.spec.deletes && chance(0.7)) {
      const { status } = await api("/safety", { as: sess(person), method: "POST", body: { action: "delete" } });
      if (status === 200) { person.gone = true; stats.deleted += 1; }
    }
  }

  // ------------------------------------------------- 6. invariants, after
  const survivors = active.filter((p) => !p.gone);

  for (const person of survivors) {
    const { status, body } = await api("/deck", { as: sess(person) });
    if (status !== 200) {
      // 401 is correct for somebody the product suspended during the run, which
      // is now a thing that happens: three distinct reporters and the account is
      // signed out. Anything else is a real failure.
      if (status !== 401) {
        violation("deck-failed-after", { who: person.id, status, error: body.error });
      } else {
        stats.suspended = (stats.suspended ?? 0) + 1;
      }
      continue;
    }
    checkDeck(person, body.cards ?? [], byId, "after", { deleted: true });
  }

  // Matches must agree from both sides, and must not survive a block.
  for (const person of survivors) {
    const { body } = await api("/matches", { as: sess(person) });
    const mine = body.matches ?? [];
    person.finalMatches = mine;

    for (const match of mine) {
      const other = byId.get(match.them.id);
      if (!other) { violation("match-with-stranger", { who: person.id, them: match.them.id }); continue; }
      if (other.gone) violation("match-with-deleted", { who: person.id, them: other.id });
      if (other.sex === person.sex) violation("match-same-sex", { who: person.id, them: other.id });
      if ((person.blocked ?? []).includes(other.id)) {
        violation("match-survived-block", { who: person.id, them: other.id });
      }
      if ((person.reported ?? []).includes(other.id)) {
        violation("match-survived-report", { who: person.id, them: other.id });
      }
    }

    // Nobody should appear twice in their own match list.
    const ids = mine.map((m) => m.them.id);
    if (new Set(ids).size !== ids.length) violation("duplicate-match", { who: person.id, ids });
  }

  // A dead session must be dead.
  for (const person of active.filter((p) => p.gone)) {
    const { status } = await api("/deck", { as: sess(person) });
    if (status !== 401) violation("deleted-still-signed-in", { who: person.id, status });
  }

  report(people, active, survivors, stats);
}

/** Everything that must be true of a deck, whoever it belongs to. */
function checkDeck(person, cards, byId, when, opts = {}) {
  const seen = new Set();
  for (const card of cards) {
    if (card.id === person.id) violation("deck-contains-self", { who: person.id, when });
    if (card.sex === person.sex) violation("deck-same-sex", { who: person.id, them: card.id, when });
    if (seen.has(card.id)) violation("deck-duplicate", { who: person.id, them: card.id, when });
    seen.add(card.id);

    const them = byId.get(card.id);
    if (!them) { violation("deck-unknown-person", { who: person.id, them: card.id, when }); continue; }
    if (opts.deleted && them.gone) violation("deck-contains-deleted", { who: person.id, them: card.id, when });
    if ((person.blocked ?? []).includes(card.id)) {
      violation("deck-contains-blocked", { who: person.id, them: card.id, when });
    }
    // v3 sorts on language instead of filtering, so a pair with none is fine as
    // long as the card admits it.
    const shares = person.languages.some((l) => (them.languages ?? []).includes(l));
    if (card.sharesLanguage !== undefined && card.sharesLanguage !== shares) {
      violation("language-flag-wrong", { who: person.id, them: card.id, said: card.sharesLanguage, actual: shares, when });
    }
  }
  if (cards.length === 0) person[`empty_${when}`] = true;
}

/** What somebody pokes at when they open devtools. */
async function tamper(person, byId) {
  const other = [...byId.values()].find((p) => p.id !== person.id && p.ok);
  if (!other) return;

  const probes = [
    ["self-woo", "/judge", { subjectId: person.id, verdict: "woo" }, [400]],
    ["unknown-subject", "/judge", { subjectId: "sim-does-not-exist", verdict: "woo" }, [404]],
    ["bad-verdict", "/judge", { subjectId: other.id, verdict: "marry" }, [400]],
    ["foreign-match", "/messages", { matchId: "00000000000000000000000000000000", body: "hello" }, [404]],
    ["empty-message", "/messages", { matchId: "00000000000000000000000000000000", body: "" }, [400]],
    ["block-self", "/safety", { action: "block", subjectId: person.id }, [400]],
    ["unknown-action", "/safety", { action: "explode" }, [400]],
  ];

  for (const [name, path, body, allowed] of probes) {
    const { status } = await api(path, { as: sess(person), method: "POST", body });
    if (!allowed.includes(status)) {
      violation("tamper-not-refused", { who: person.id, probe: name, status, expected: allowed });
    }
  }

  // Writing somebody else's profile is the one that would be catastrophic.
  const { body } = await api("/profile", {
    as: sess(person), method: "PUT",
    body: { ...person, accountId: other.id, displayName: "STOLEN" },
  });
  if (body.profile?.accountId !== person.id) {
    violation("profile-write-crossed-accounts", { who: person.id, landedOn: body.profile?.accountId });
  }
}

// ----------------------------------------------------------------- report

const round = (n) => Math.round(n * 1000) / 1000;
const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

function report(people, active, survivors, stats) {
  const bySegment = {};
  for (const person of active) {
    const s = (bySegment[person.segment] ??= { n: 0, deck: 0, empty: 0, woos: 0, matched: 0, sent: 0 });
    s.n += 1;
    s.deck += person.deck?.length ?? 0;
    if ((person.deck?.length ?? 0) === 0) s.empty += 1;
    s.woos += person.woos ?? 0;
    if ((person.matches?.length ?? 0) > 0) s.matched += 1;
    s.sent += person.sent ?? 0;
  }

  const bySex = {};
  for (const person of active) {
    const s = (bySex[person.sex] ??= { n: 0, deck: 0, matched: 0 });
    s.n += 1;
    s.deck += person.deck?.length ?? 0;
    if ((person.matches?.length ?? 0) > 0) s.matched += 1;
  }

  const byCountry = {};
  for (const person of active) {
    const s = (byCountry[person.country] ??= { n: 0, deck: 0, matched: 0 });
    s.n += 1;
    s.deck += person.deck?.length ?? 0;
    if ((person.matches?.length ?? 0) > 0) s.matched += 1;
  }

  const kinds = {};
  for (const d of defects) kinds[d.kind] = (kinds[d.kind] ?? 0) + 1;

  console.log(JSON.stringify({
    cohort: people.length,
    requests,
    abandonedAtOath: people.filter((p) => p.abandonedAtOath).length,
    accepted: active.length,
    stats,
    defects: {
      total: defects.length,
      kinds,
      // The first few of each kind, which is enough to reproduce.
      samples: Object.keys(kinds).map((kind) => defects.find((d) => d.kind === kind)),
    },
    funnel: {
      profiled: active.length,
      sawSomebody: active.filter((p) => (p.deck?.length ?? 0) > 0).length,
      emptyDeck: active.filter((p) => (p.deck?.length ?? 0) === 0).length,
      wooed: active.filter((p) => (p.woos ?? 0) > 0).length,
      matched: active.filter((p) => (p.matches?.length ?? 0) > 0).length,
      talked: active.filter((p) => (p.sent ?? 0) > 0).length,
      medianDeck: median(active.map((p) => p.deck?.length ?? 0)),
      toldSomebodyWaiting: active.filter((p) => (p.waitingOnYou ?? 0) > 0).length,
      cameBack: active.filter((p) => p.returned).length,
    },
    bySegment: Object.fromEntries(Object.entries(bySegment).map(([k, s]) => [k, {
      n: s.n, medianDeck: round(s.deck / s.n), emptyShare: round(s.empty / s.n),
      matchedShare: round(s.matched / s.n), messages: s.sent,
    }])),
    bySex: Object.fromEntries(Object.entries(bySex).map(([k, s]) => [k, {
      n: s.n, avgDeck: round(s.deck / s.n), matchedShare: round(s.matched / s.n),
    }])),
    thinnestCountries: Object.entries(byCountry)
      .map(([c, s]) => ({ country: c, n: s.n, avgDeck: round(s.deck / s.n), matchedShare: round(s.matched / s.n) }))
      .sort((a, b) => a.avgDeck - b.avgDeck).slice(0, 8),
  }, null, 2));
}

await run();
