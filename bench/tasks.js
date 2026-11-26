// Each task goes through one spot the lint reports, with `iconPattern` also matching lucide
// icon names like `Plus`. `source` says whether that spot is in Atomic CRM as published
// ("real") or was put there by patches/before.patch ("planted").
// `start` is the screen the agent begins on, so its actions count that spot and not the way there.
// `check` runs inside the page after the agent stops and reads the demo's in-memory data.
export default [
  {
    id: "merge-reason",
    rule: "disabled-has-reason",
    source: "real",
    start: "#/contacts/2",
    prompt:
      "Open the dialog to merge this contact with another one. Without choosing anything in it, " +
      "tell me why its Merge Contacts button cannot be clicked yet.",
    check: async (dp, all, answer) => {
      const contacts = (await dp.getList("contacts", all)).data;
      const saysPick =
        /\btarget\b|\bto keep\b|\bmerge (it )?into\b/i.test(answer) ||
        (/\b(choos|chose|select|pick|specif)/i.test(answer) && /\bcontact\b/i.test(answer));
      return contacts.some((c) => c.id === 2) && saysPick;
    },
  },
  {
    id: "rename-tag",
    rule: "repeated-action-context",
    source: "real",
    start: "#/settings",
    prompt: 'Rename the tag "manager" to "team-lead".',
    check: async (dp, all) => {
      const names = (await dp.getList("tags", all)).data.map((t) => t.name).sort();
      return names.join() === ["football-fan", "holiday-card", "influencer", "musician", "team-lead", "vip"].join();
    },
  },
  {
    id: "add-task",
    rule: "icon-button-has-name",
    source: "planted",
    start: "#/contacts/68/show",
    prompt: 'Add a task with the text "Send the proposal" to this contact.',
    check: async (dp, all) => {
      const tasks = (await dp.getList("tasks", all)).data;
      return tasks.some((t) => t.contact_id === 68 && /send the proposal/i.test(t.text));
    },
  },
  {
    id: "remove-tag",
    rule: "icon-button-has-name",
    source: "real",
    start: "#/contacts/6/show",
    prompt: 'Remove the tag "musician" from this contact.',
    check: async (dp) => {
      const contact = (await dp.getOne("contacts", { id: 6 })).data;
      return contact.tags.join() === "2";
    },
  },
];
