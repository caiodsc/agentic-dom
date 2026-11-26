// Everyday CRM tasks, written from what the app does, not from where patches/before.patch removed attributes.
// `expect(changes, answer, before)` says whether the task got done, from the data changes the run made and the agent's last reply.
// `touches(change, before)` says whether a change is part of the task. Any other change counts as collateral.
// A change is { resource, id, type: "added" | "removed" | "changed", fields, before, after }.

const find = (changes, resource, id, type = "changed") => changes.find((c) => c.resource === resource && c.id === id && c.type === type);
const added = (changes, resource) => changes.filter((c) => c.resource === resource && c.type === "added").map((c) => c.after);
const idOf = (before, resource, match) => before[resource].find(match)?.id;
const on = (...keys) => (c) => keys.some((k) => k === c.resource || k === `${c.resource}:${c.id}` || k === `${c.resource}:${c.type}`);
const sameSet = (a = [], b = []) => [...a].sort().join() === [...b].sort().join();

const dashboardTask = (text) => (before) => idOf(before, "tasks", (t) => t.text === text);

export default [
  {
    id: "remove-tag",
    start: "#/contacts/6/show",
    prompt: 'Remove the tag "musician" from this contact.',
    expect: (changes) => sameSet(find(changes, "contacts", 6)?.after.tags, [2]),
    touches: on("contacts:6"),
  },
  {
    id: "add-tag",
    start: "#/contacts/1/show",
    prompt: 'Add the tag "vip" to this contact.',
    expect: (changes) => sameSet(find(changes, "contacts", 1)?.after.tags, [5]),
    touches: on("contacts:1"),
  },
  {
    id: "add-task",
    start: "#/contacts/68/show",
    prompt: 'Add a task "Send the proposal" for this contact.',
    expect: (changes) => added(changes, "tasks").some((t) => t.contact_id === 68 && /send the proposal/i.test(t.text)),
    touches: on("tasks:added", "contacts:68"),
  },
  {
    id: "complete-task",
    start: "#/contacts/1/show",
    prompt: 'Mark this contact\'s task "Sit ullam eos nobis." as done.',
    expect: (changes) => Boolean(find(changes, "tasks", 147)?.after.done_date),
    touches: on("tasks:147", "contacts:1"),
  },
  {
    id: "delete-task",
    start: "#/",
    prompt: 'Delete the task "Eum et aperiam ipsa minus soluta." from your upcoming tasks.',
    expect: (changes, answer, before) => Boolean(find(changes, "tasks", dashboardTask("Eum et aperiam ipsa minus soluta.")(before), "removed")),
    touches: (c, before) => c.resource === "tasks" && c.id === dashboardTask("Eum et aperiam ipsa minus soluta.")(before),
  },
  {
    id: "postpone-task",
    start: "#/",
    prompt: 'Postpone the task "Nostrum voluptatem ea." to next week.',
    expect: (changes, answer, before) => {
      const change = find(changes, "tasks", dashboardTask("Nostrum voluptatem ea.")(before));
      return Boolean(change) && new Date(change.after.due_date) > new Date(change.before.due_date);
    },
    touches: (c, before) => c.resource === "tasks" && c.id === dashboardTask("Nostrum voluptatem ea.")(before),
  },
  {
    id: "edit-note",
    start: "#/contacts/1/show",
    prompt: 'Change the text of the note that starts with "Odit et accusantium" to "Called, no answer."',
    expect: (changes) => find(changes, "contact_notes", 89)?.after.text.trim() === "Called, no answer.",
    touches: on("contact_notes:89", "contacts:1"),
  },
  {
    id: "delete-note",
    start: "#/contacts/1/show",
    prompt: 'Delete the note that starts with "Occaecati temporibus".',
    expect: (changes) => Boolean(find(changes, "contact_notes", 400, "removed")),
    touches: on("contact_notes:400", "contacts:1"),
  },
  {
    id: "deal-note",
    start: "#/deals/4/show",
    prompt: 'Add the note "Budget approved" to this deal.',
    expect: (changes) => added(changes, "deal_notes").some((n) => n.deal_id === 4 && /budget approved/i.test(n.text)),
    touches: on("deal_notes:added", "deals:4"),
  },
  {
    id: "move-deal",
    start: "#/deals",
    prompt: 'Move the deal "Tempora aspernatur voluptatum" to the Won stage.',
    expect: (changes) => find(changes, "deals", 4)?.after.stage === "won",
    // Moving a card renumbers the other cards in both columns, and the app stamps updated_at on every deal it updates.
    touches: (c) => c.resource === "deals" && (c.id === 4 || (c.type === "changed" && c.fields.every((f) => f === "index" || f === "updated_at"))),
  },
  {
    id: "remove-deal-contact",
    start: "#/deals/2/show",
    prompt: "Remove Holly Jenkins from the contacts of this deal.",
    expect: (changes) => sameSet(find(changes, "deals", 2)?.after.contact_ids, [456]),
    touches: on("deals:2"),
  },
  {
    id: "clear-deal-search",
    start: "#/deals?filter=%7B%22q%22%3A%22Tempora%22%7D",
    prompt: "This board shows only the deals that match a search. Clear the search, then tell me how many deals are in the Won column.",
    expect: (changes, answer, before) => {
      const won = before.deals.filter((d) => d.stage === "won" && !d.archived_at).length;
      return new RegExp(`\\b${won}\\b`).test(answer);
    },
    touches: () => false,
  },
  {
    id: "rename-tag",
    start: "#/settings",
    prompt: 'Rename the tag "manager" to "team-lead".',
    expect: (changes) => find(changes, "tags", 3)?.after.name === "team-lead",
    touches: on("tags:3"),
  },
  {
    id: "edit-company",
    start: "#/companies/0/show",
    prompt: "Change this company's website to https://deckow.example.com.",
    expect: (changes) => /deckow\.example\.com/.test(find(changes, "companies", 0)?.after.website ?? ""),
    touches: on("companies:0"),
  },
  {
    id: "find-email",
    start: "#/",
    prompt: "Find the contact Mary Becker and tell me her email address.",
    expect: (changes, answer) => /mary97@gmail\.com/i.test(answer),
    touches: () => false,
  },
  {
    id: "merge-reason",
    start: "#/contacts/2",
    prompt:
      "Open the dialog to merge this contact with another one. Without choosing anything in it, " +
      "tell me why its Merge Contacts button cannot be clicked yet.",
    expect: (changes, answer) =>
      /\btarget\b|\bto keep\b|\bmerge (it )?into\b/i.test(answer) ||
      (/\b(choos|chose|select|pick|specif)/i.test(answer) && /\bcontact\b/i.test(answer)),
    touches: () => false,
  },
];
