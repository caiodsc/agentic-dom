import { StrictMode, useSyncExternalStore } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { Toaster } from "@/components/ui/sonner"
import { MembersPage } from "@/MembersPage"

const PAGES = [
  { path: "#/members", label: "Members" },
  { path: "#/projects", label: "Projects" },
  { path: "#/billing", label: "Billing" },
  { path: "#/settings", label: "Settings" },
]

function useHash() {
  return useSyncExternalStore(
    (l) => {
      window.addEventListener("hashchange", l)
      return () => window.removeEventListener("hashchange", l)
    },
    () => window.location.hash || "#/members"
  )
}

function App() {
  const hash = useHash()
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col gap-1 border-r bg-muted/40 p-4">
        <div className="mb-4 px-2 text-lg font-semibold">Acme</div>
        <nav className="flex flex-col gap-1">
          {PAGES.map((page) => (
            <a
              key={page.path}
              href={page.path}
              aria-current={hash === page.path ? "page" : undefined}
              className="rounded-md px-2 py-1.5 text-sm hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium"
            >
              {page.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        {hash === "#/members" ? <MembersPage /> : <p className="text-muted-foreground">Nothing here yet.</p>}
      </main>
      <Toaster position="top-right" />
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
