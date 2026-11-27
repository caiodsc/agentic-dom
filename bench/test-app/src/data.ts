import { useSyncExternalStore } from "react"

export type Member = {
  id: number
  name: string
  email: string
  role: "Admin" | "Editor" | "Viewer"
  active: boolean
  invited_at: string
}

let members: Member[] = [
  { id: 1, name: "Maya Chen", email: "maya@acme.test", role: "Admin", active: true, invited_at: "2025-09-02T14:00:00Z" },
  { id: 2, name: "Liam Patel", email: "liam@acme.test", role: "Editor", active: true, invited_at: "2025-10-11T09:30:00Z" },
  { id: 3, name: "Sofia Rossi", email: "sofia@acme.test", role: "Editor", active: true, invited_at: "2025-10-20T16:15:00Z" },
  { id: 4, name: "Noah Kim", email: "noah@acme.test", role: "Viewer", active: true, invited_at: "2025-11-03T11:00:00Z" },
  { id: 5, name: "Ava Johnson", email: "ava@acme.test", role: "Editor", active: true, invited_at: "2025-11-18T13:45:00Z" },
  { id: 6, name: "Ethan Brooks", email: "ethan@acme.test", role: "Viewer", active: true, invited_at: "2025-12-01T10:20:00Z" },
  { id: 7, name: "Zoe Martin", email: "zoe@acme.test", role: "Viewer", active: false, invited_at: "2025-08-14T08:00:00Z" },
]

const listeners = new Set<() => void>()

function set(next: Member[]) {
  members = next
  listeners.forEach((l) => l())
}

export function useMembers() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => members
  )
}

export function updateMember(id: number, changes: Partial<Member>) {
  set(members.map((m) => (m.id === id ? { ...m, ...changes } : m)))
}

export function removeMember(id: number) {
  set(members.filter((m) => m.id !== id))
}

export function inviteMember(name: string, email: string) {
  const id = Math.max(...members.map((m) => m.id)) + 1
  set([...members, { id, name, email, role: "Viewer", active: true, invited_at: new Date().toISOString() }])
}

// The benchmark reads the data through this, before and after each run.
declare global {
  interface Window {
    __bench: { dataProvider: { getList: (resource: string) => Promise<{ data: Member[] }> } }
  }
}
window.__bench = {
  dataProvider: {
    getList: async (resource) => ({ data: resource === "members" ? structuredClone(members) : [] }),
  },
}
