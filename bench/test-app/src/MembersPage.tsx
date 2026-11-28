import { useState } from "react"
import { PencilIcon, SendIcon, Trash2Icon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type Member, inviteMember, removeMember, updateMember, useMembers } from "@/data"

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

export function MembersPage() {
  const members = useMembers()
  const [editing, setEditing] = useState<Member | null>(null)
  const [removing, setRemoving] = useState<Member | null>(null)
  const [inviting, setInviting] = useState(false)

  const resend = (member: Member) => {
    updateMember(member.id, { invited_at: new Date().toISOString() })
    toast.success(`Invitation sent to ${member.email}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Team members</h1>
          <p className="text-muted-foreground">People who can sign in to the Acme workspace.</p>
        </div>
        <Button onClick={() => setInviting(true)}>
          <UserPlusIcon />
          Invite member
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last invite</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell>
                  <Badge variant={member.active ? "secondary" : "outline"}>
                    {member.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(member.invited_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Resend invite to ${member.name}`} onClick={() => resend(member)}>
                      <SendIcon />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${member.name}`} onClick={() => setEditing(member)}>
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${member.name}`} onClick={() => setRemoving(member)}>
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && <EditMemberDialog member={editing} onClose={() => setEditing(null)} />}
      {inviting && <InviteMemberDialog onClose={() => setInviting(false)} />}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>They lose access to the workspace right away.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (!removing) return
                removeMember(removing.id)
                toast.success(`${removing.name} was removed`)
                setRemoving(null)
              }}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EditMemberDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const [name, setName] = useState(member.name)
  const [active, setActive] = useState(member.active)

  const save = () => {
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    updateMember(member.id, { name: name.trim(), active })
    toast.success("Member updated")
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>{member.name}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-name">Name</Label>
            <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-email">Email</Label>
            <Input id="member-email" value={member.email} disabled />
            <p className="text-xs text-muted-foreground">Email can't be changed after the account is created.</p>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="member-active" checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="member-active">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive members can't sign in.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InviteMemberDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const send = () => {
    if (!name.trim() || !email.includes("@")) {
      toast.error("Enter a name and an email")
      return
    }
    inviteMember(name.trim(), email.trim())
    toast.success(`Invitation sent to ${email.trim()}`)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send}>Send invitation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
