// RoleFormModal — create or edit a role. Server RPCs enforce all rules
// (system-role rename block, name uniqueness, permission check).
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRoleMutations } from "@/hooks/organization/useOrganizationRoles";
import type { Role } from "@/types/organization/role";

interface RoleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
}

const DEFAULT_COLOR = "#0ea5e9";

export const RoleFormModal = ({ open, onOpenChange, role }: RoleFormModalProps) => {
  const { create, update } = useRoleMutations();
  const editing = !!role;
  const isSystem = !!role?.is_system;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [priority, setPriority] = useState<number>(100);

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setColor(role?.color ?? DEFAULT_COLOR);
      setPriority(role?.priority ?? 100);
    }
  }, [open, role]);

  const submitting = create.isPending || update.isPending;
  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = () => {
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      priority,
    };
    if (editing && role) {
      update.mutate(
        { roleId: role.id, patch: payload },
        {
          onSuccess: () => {
            toast.success("Role updated");
            onOpenChange(false);
          },
          onError: (err: Error) => toast.error(err.message ?? "Failed to update role"),
        });
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Role created");
          onOpenChange(false);
        },
        onError: (err: Error) => toast.error(err.message ?? "Failed to create role"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit role" : "Create role"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              className="mt-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Content Editor"
              disabled={isSystem}
            />
            {isSystem && (
              <p className="mt-1 text-xs text-muted-foreground">System roles cannot be renamed.</p>
            )}
          </div>

          <div>
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              className="mt-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What can this role do?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role-color">Color</Label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="role-color"
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded-md border"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="role-priority">Priority</Label>
              <Input
                id="role-priority"
                type="number"
                className="mt-2"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) || 0)}
                min={0}
                max={999}
              />
              <p className="mt-1 text-xs text-muted-foreground">Lower = higher in the list.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Create role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoleFormModal;
