// Each task goes through one spot the lint reports, with `iconPattern` also matching lucide
// icon names like `Plus`. `source` says whether that spot is in Atomic CRM as published
// ("real") or was put there by patches/before.patch ("planted").
// `check` runs inside the page after the agent stops and reads the demo's in-memory data.
export default [
  {
    id: "merge-contacts",
    rule: "disabled-has-reason",
    source: "real",
    prompt: "Merge the contact Wade Emard into the contact Kara Wyman. Kara Wyman is the one to keep.",
    check: async (dp, all) => {
      const contacts = (await dp.getList("contacts", all)).data;
      return !contacts.some((c) => c.id === 2) && contacts.some((c) => c.id === 3);
    },
  },
  {
    id: "rename-tag",
    rule: "repeated-action-context",
    source: "real",
    prompt: 'In the settings, rename the tag "football-fan" to "sports-fan".',
    check: async (dp, all) => {
      const tags = (await dp.getList("tags", all)).data;
      return tags.some((t) => t.name === "sports-fan") && !tags.some((t) => t.name === "football-fan");
    },
  },
  {
    id: "add-task",
    rule: "icon-button-has-name",
    source: "planted",
    prompt: 'Add a task with the text "Send the proposal" to the contact Mary Becker.',
    check: async (dp, all) => {
      const tasks = (await dp.getList("tasks", all)).data;
      return tasks.some((t) => t.contact_id === 68 && /send the proposal/i.test(t.text));
    },
  },
];
