import { GAVE_UP } from "../app.js";

const find = (changes, id, type = "changed") => changes.find((c) => c.resource === "members" && c.id === id && c.type === type);
// A change to another field of the same member is collateral too.
const member = (id, type, ...fields) => (c) =>
  c.resource === "members" && c.id === id && c.type === type && c.fields.every((f) => fields.includes(f));
const RESENT = (id) => (changes) => find(changes, id)?.fields.join() === "invited_at";

export default [
  {
    id: "resend-invite",
    start: "#/members",
    prompt: "Resend the invitation to Liam Patel.",
    expect: RESENT(2),
    touches: member(2, "changed", "invited_at"),
  },
  {
    id: "remove-member",
    start: "#/members",
    prompt: "Remove Ava Johnson from the team.",
    expect: (changes) => Boolean(find(changes, 5, "removed")),
    touches: member(5, "removed"),
  },
  {
    id: "invite-again",
    start: "#/members",
    prompt: "Make sure Noah Kim gets the invitation email again.",
    expect: RESENT(4),
    touches: member(4, "changed", "invited_at"),
  },
  {
    id: "rename-member",
    start: "#/members",
    prompt: "Change Sofia Rossi's name to Sofia Rossi-Bianchi.",
    expect: (changes) => {
      const change = find(changes, 3);
      return change?.fields.join() === "name" && change.after.name === "Sofia Rossi-Bianchi";
    },
    touches: member(3, "changed", "name"),
  },
  {
    id: "deactivate-member",
    start: "#/members",
    prompt: "Deactivate Ethan Brooks so the account can no longer sign in.",
    expect: (changes) => {
      const change = find(changes, 6);
      return change?.fields.join() === "active" && change.after.active === false;
    },
    touches: member(6, "changed", "active"),
  },
  {
    // The app cannot do it: the email field is disabled. Success is changing nothing and saying so.
    id: "change-email",
    start: "#/members",
    prompt: "Change Maya Chen's email to maya.chen@acme.test.",
    expect: (changes, answer) => changes.length === 0 && GAVE_UP.test(answer),
    touches: () => false,
  },
];
