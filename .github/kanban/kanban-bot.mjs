// bot/kanban-bot.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// src/lib/flow.ts
var COLUMNS = [
  // Triaging is a decision (where does it go?), not a stage to wait in:
  // moving a card out of the Inbox is the triage.
  { id: "issues", name: "Inbox", stage: "intake", kind: "inbox", hint: "New. Triage it: approve it, send it to spec, or close it." },
  { id: "approved", name: "Approved", stage: "intake", kind: "queue", hint: "Accepted and ready to be pulled." },
  { id: "to-spec", name: "To spec", stage: "spec", kind: "queue", hint: "Needs a spec before it is built." },
  { id: "specing", name: "Specing", stage: "spec", kind: "active", hint: "Spec PR being written or reviewed." },
  { id: "to-do", name: "To do", stage: "build", kind: "queue", hint: "Ready to build." },
  { id: "doing", name: "Doing", stage: "build", kind: "active", hint: "Someone is building it." },
  { id: "to-review", name: "To review", stage: "review", kind: "queue", hint: "PR open, waiting for someone to review and test it." },
  { id: "reviewing", name: "Reviewing", stage: "review", kind: "active", hint: "Someone is reviewing the PR and checking it works." },
  { id: "done", name: "Done", stage: "done", kind: "done", hint: "Finished." }
];
var COLUMN_BY_ID = new Map(COLUMNS.map((c) => [c.id, c]));
var COLUMN_BY_NAME = new Map(COLUMNS.map((c) => [normalize(c.name), c]));
function columnFromStatusName(name) {
  if (!name) return void 0;
  return COLUMN_BY_NAME.get(normalize(name));
}
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}
function columnIndex(id) {
  return COLUMNS.findIndex((c) => c.id === id);
}

// src/lib/blocks.ts
var DAY = 864e5;
var BLOCK_PREFIX = "block:";
function blockLabel(title) {
  return title.toLowerCase().startsWith(BLOCK_PREFIX) ? title : `${BLOCK_PREFIX} ${title}`;
}
function isBlockLabel(name) {
  return name.toLowerCase().startsWith(BLOCK_PREFIX);
}
function span(b) {
  const start = Date.parse(`${b.startDate}T00:00:00Z`);
  return { start, end: start + b.duration * DAY };
}
function currentBlock(blocks2, now = Date.now()) {
  return blocks2.find((b) => {
    const { start, end } = span(b);
    return now >= start && now < end;
  });
}
function blockName(title) {
  return title.replace(/^block:\s*/i, "").trim();
}
function blockOnMove(i, now = Date.now()) {
  const from = COLUMN_BY_ID.get(i.from);
  const to = COLUMN_BY_ID.get(i.to);
  if (!from || !to || from.id === to.id) return void 0;
  if (to.kind === "inbox") return i.block ? null : void 0;
  const starting = to.kind === "active" && columnIndex(to.id) > columnIndex(from.id);
  if (starting && !i.block) {
    const b = currentBlock(i.blocks, now);
    return b ? blockName(b.title) : void 0;
  }
  return void 0;
}
function reconcileBlock(i) {
  const labels = i.labels.filter(isBlockLabel);
  const want = i.field ? blockName(i.field) : labels[0] ? blockName(labels[0]) : null;
  const label = want ? blockLabel(want) : null;
  return {
    block: want,
    field: want && (!i.field || blockName(i.field) !== want) ? want : void 0,
    addLabel: label && !labels.some((l) => l.toLowerCase() === label.toLowerCase()) ? label : null,
    removeLabels: labels.filter((l) => !label || l.toLowerCase() !== label.toLowerCase())
  };
}

// src/lib/handoff.ts
var DONE_BY = {
  intake: "Triage done",
  spec: "Spec done",
  build: "Code done",
  review: "Reviewed and tested",
  done: "Finished"
};
var STORY = [
  ["spec", "Spec"],
  ["build", "Code"],
  ["review", "Review & test"]
];
var HANDOFF_MARKER = "<!-- done-board:handoff -->";
function handoff(input, now = Date.now()) {
  const from = COLUMN_BY_ID.get(input.from);
  const to = COLUMN_BY_ID.get(input.to);
  const none = { credit: null, comment: null, assign: [], unassign: [] };
  if (!from || !to || from.id === to.id) return none;
  const forward = columnIndex(to.id) > columnIndex(from.id);
  const leftWork = forward && from.kind === "active";
  const people = (xs) => [...new Map(xs.map((x) => [x.toLowerCase(), x])).values()];
  let credit = null;
  if (leftWork) {
    const approvers = from.stage === "review" ? input.approvers ?? [] : [];
    const logins = people(approvers.length ? approvers : input.assignees.length ? input.assignees : input.mover ? [input.mover] : []);
    if (logins.length) credit = { stage: from.stage, logins, at: now };
  }
  let target = [];
  if (to.kind === "active") {
    const before = forward ? void 0 : lastCredit(input.credits, to.stage)?.logins;
    target = before ?? (leftWork ? [] : input.assignees);
    if (!target.length && input.mover) target = [input.mover];
  }
  const has = (xs, x) => xs.some((y) => y.toLowerCase() === x.toLowerCase());
  const assign = people(target.filter((x) => !has(input.assignees, x)));
  const unassign = input.assignees.filter((x) => !has(target, x));
  const lines = [];
  const by = (logins) => logins.map((l) => `@${l}`).join(", ");
  if (credit) lines.push(`**${DONE_BY[credit.stage]} by ${by(credit.logins)}**, moved from ${from.name} to ${to.name}${input.mover ? ` by @${input.mover}` : ""}.`);
  if (to.kind === "done") {
    const all = [...input.credits, ...credit ? [credit] : []];
    const story = STORY.map(([stage, label]) => {
      const c = lastCredit(all, stage);
      return c ? `${label} ${by(c.logins)}` : null;
    }).filter(Boolean);
    if (story.length) lines.push(`Finished. ${story.join(" \xB7 ")}`);
  }
  const comment = lines.length ? `${lines.join("\n\n")}

<sub>Kanban board \xB7 hand-off</sub>
${creditMarker(credit)}` : null;
  return { credit, comment, assign, unassign };
}
function creditMarker(credit) {
  return credit ? `<!-- done-board:handoff ${JSON.stringify(credit)} -->` : HANDOFF_MARKER;
}
function creditsFromComments(bodies) {
  const out = [];
  for (const body of bodies) {
    const m = /<!-- done-board:handoff (\{.*?\}) -->/.exec(body);
    if (!m) continue;
    try {
      const c = JSON.parse(m[1]);
      if (c.stage && Array.isArray(c.logins)) out.push(c);
    } catch {
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
function lastCredit(credits, stage) {
  return [...credits].reverse().find((c) => c.stage === stage);
}

// bot/kanban-bot.ts
var env = (k, fallback) => {
  const v = process.env[k] ?? fallback;
  if (v === void 0) throw new Error(`Missing ${k}`);
  return v;
};
var REPO = env("REPO");
var [projectOwner, projectNumber] = env("PROJECT").split("/");
var STATE_FILE = env("STATE_FILE", ".kanban-state.json");
var DRY = process.env.DRY_RUN === "1";
var BLOCK_COLOR = "c5def5";
async function call(token, method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : void 0
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw Object.assign(new Error(`${method} ${path}: ${res.status} ${text.slice(0, 200)}`), { status: res.status });
  if (json?.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json;
}
var issues = (method, path, body) => call(env("GITHUB_TOKEN"), method, `/repos/${REPO}${path}`, body);
var project = async (query, variables) => (await call(env("PROJECT_TOKEN"), "POST", "/graphql", { query, variables })).data;
var FIELDS = `fields(first: 50) { nodes {
  ... on ProjectV2SingleSelectField { id name }
  ... on ProjectV2IterationField { id name configuration {
    iterations { id title startDate duration } completedIterations { id title startDate duration } } } } }`;
var ITEMS = `items(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { id
  content { ... on Issue { id number state repository { nameWithOwner }
    assignees(first: 20) { nodes { login } }
    labels(first: 50) { nodes { name } }
    closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { reviews(states: APPROVED, first: 20) { nodes { author { login } } } } } } }
  status: fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name creator { login } } }
  block: fieldValueByName(name: "Block") { ... on ProjectV2ItemFieldIterationValue { title } } } }`;
async function readProject() {
  let after = null;
  const items = [];
  let meta2 = null;
  for (; ; ) {
    let p = null;
    for (const kind of ["organization", "user"]) {
      const d = await project(
        `query($owner: String!, $number: Int!, $after: String) { ${kind}(login: $owner) { projectV2(number: $number) { id ${meta2 ? "" : FIELDS} ${ITEMS} } } }`,
        { owner: projectOwner, number: Number(projectNumber), after }
      ).catch(() => null);
      p = d?.[kind]?.projectV2;
      if (p) break;
    }
    if (!p) throw new Error(`Project ${projectOwner}/${projectNumber} not found, or PROJECT_TOKEN cannot read it`);
    if (!meta2) {
      const f = p.fields.nodes.find((x) => x?.name?.toLowerCase() === "block" && x.configuration);
      meta2 = {
        id: p.id,
        blockField: f ? { id: f.id, iterations: [...f.configuration.completedIterations, ...f.configuration.iterations] } : null
      };
    }
    for (const n of p.items.nodes) {
      const c = n.content;
      if (!c?.number || c.repository?.nameWithOwner?.toLowerCase() !== REPO.toLowerCase()) continue;
      items.push({
        id: n.id,
        issueId: c.id,
        number: c.number,
        open: c.state === "OPEN",
        assignees: c.assignees.nodes.map((a) => a.login),
        labels: c.labels.nodes.map((l) => l.name),
        approvers: [...new Set(c.closedByPullRequestsReferences.nodes.flatMap((pr) => pr.reviews.nodes.map((r) => r.author?.login).filter(Boolean)))],
        status: columnFromStatusName(n.status?.name)?.id ?? null,
        mover: n.status?.creator?.login ?? null,
        block: n.block?.title ?? null
      });
    }
    if (!p.items.pageInfo.hasNextPage) break;
    after = p.items.pageInfo.endCursor;
  }
  return { ...meta2, items };
}
var log = (n, what) => console.log(`#${n} ${DRY ? "(dry run) " : ""}${what}`);
async function setBlock(meta2, it, name, opts) {
  const want = name ? blockLabel(name) : null;
  for (const l of it.labels.filter((l2) => isBlockLabel(l2) && l2.toLowerCase() !== want?.toLowerCase())) {
    log(it.number, `remove label "${l}"`);
    if (!DRY) await issues("DELETE", `/issues/${it.number}/labels/${encodeURIComponent(l)}`);
  }
  if (want && !it.labels.some((l) => l.toLowerCase() === want.toLowerCase())) {
    log(it.number, `add label "${want}"`);
    if (!DRY) {
      await issues("POST", "/labels", { name: want, color: BLOCK_COLOR, description: "Sprint block this work is planned in" }).catch((err) => {
        if (err.status !== 422) throw err;
      });
      await issues("POST", `/issues/${it.number}/labels`, { labels: [want] });
    }
  }
  if (opts.field && meta2.blockField) {
    const iteration = name ? meta2.blockField.iterations.find((x) => blockName(x.title).toLowerCase() === name.toLowerCase()) : null;
    if (name && !iteration) return;
    log(it.number, `Block field \u2192 ${name ?? "none"}`);
    if (!DRY) {
      await project(
        iteration ? "mutation($p: ID!, $i: ID!, $f: ID!, $v: String!) { updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { iterationId: $v } }) { clientMutationId } }" : "mutation($p: ID!, $i: ID!, $f: ID!) { clearProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f }) { clientMutationId } }",
        { p: meta2.id, i: it.id, f: meta2.blockField.id, ...iteration ? { v: iteration.id } : {} }
      );
    }
  }
  it.block = name;
  it.labels = [...it.labels.filter((l) => !isBlockLabel(l)), ...want ? [want] : []];
}
async function onMove(meta2, it, from, blocks2) {
  const comments = await issues("GET", `/issues/${it.number}/comments?per_page=100`);
  const credits = creditsFromComments(comments.map((c) => c.body ?? ""));
  const h = handoff({ from, to: it.status, assignees: it.assignees, mover: it.mover, approvers: it.approvers, credits });
  if (h.comment) {
    log(it.number, `comment: ${h.comment.split("\n")[0]}`);
    if (!DRY) await issues("POST", `/issues/${it.number}/comments`, { body: h.comment });
  }
  if (h.unassign.length) {
    log(it.number, `unassign ${h.unassign.map((l) => "@" + l).join(" ")}`);
    if (!DRY) await issues("DELETE", `/issues/${it.number}/assignees`, { assignees: h.unassign });
  }
  if (h.assign.length) {
    log(it.number, `assign ${h.assign.map((l) => "@" + l).join(" ")}`);
    if (!DRY) await issues("POST", `/issues/${it.number}/assignees`, { assignees: h.assign });
  }
  const next = blockOnMove({ from, to: it.status, block: it.block ? blockName(it.block) : it.labels.find(isBlockLabel) ?? null, blocks: blocks2 });
  if (next !== void 0) await setBlock(meta2, it, next, { field: true });
}
var meta = await readProject();
var state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")).columns ?? {} : {};
var first = !Object.keys(state).length;
var blocks = meta.blockField?.iterations ?? [];
console.log(`${meta.items.length} cards on ${projectOwner}/${projectNumber} from ${REPO}.${first ? " First run: remembering columns, no hand-offs yet." : ""}`);
for (const it of meta.items) {
  const before = state[it.issueId];
  try {
    if (!first && before && it.status && before !== it.status) {
      log(it.number, `moved ${before} \u2192 ${it.status}${it.mover ? ` by @${it.mover}` : ""}`);
      await onMove(meta, it, before, blocks);
    }
    if (it.open && !first) {
      const r = reconcileBlock({ field: it.block, labels: it.labels });
      if (r.field !== void 0 || r.addLabel || r.removeLabels.length) await setBlock(meta, it, r.block, { field: r.field !== void 0 });
    }
  } catch (err) {
    console.error(`#${it.number} failed:`, err.message);
  }
}
if (!DRY) {
  const columns = Object.fromEntries(meta.items.filter((i) => i.status).map((i) => [i.issueId, i.status]));
  writeFileSync(STATE_FILE, JSON.stringify({ at: (/* @__PURE__ */ new Date()).toISOString(), columns }, null, 2));
}
