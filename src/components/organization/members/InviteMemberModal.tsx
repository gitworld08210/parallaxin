// InviteMemberModal — UI scaffold. Compose real markup as the feature ships.
import { useState } from "react";
import { UserPlus } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InviteMemberModal = ({ open, onOpenChange }: InviteMemberModalProps) => {
  const [email, setEmail] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5 text-sky-500" />
            Invite Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div>
            <Label>Email</Label>

            <Input
              className="mt-2"
              placeholder="member@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label>Role</Label>

            <select className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3">
              <option>Member</option>

              <option>Manager</option>

              <option>Admin</option>
            </select>
          </div>

          <div>
            <Label>Department</Label>

            <select className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3">
              <option>Engineering</option>

              <option>Marketing</option>

              <option>Human Resources</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button className="bg-sky-500 hover:bg-sky-600">Send Invitation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberModal;
