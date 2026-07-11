import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDepartmentMutations,
  useOrganizationDepartments,
} from "@/hooks/organization/useOrganizationDepartments";
import type { Department } from "@/types/organization/department";

interface DepartmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the modal edits this department; otherwise it creates a new one. */
  department?: Department | null;
  /** Optional preset parent when creating. */
  defaultParentId?: string | null;
}

const NONE = "__none__";

export const DepartmentFormModal = ({
  open,
  onOpenChange,
  department,
  defaultParentId = null,
}: DepartmentFormModalProps) => {
  const { departments } = useOrganizationDepartments();
  const { create, update } = useDepartmentMutations();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [parentId, setParentId] = useState<string>(NONE);

  useEffect(() => {
    if (!open) return;
    setName(department?.name ?? "");
    setDescription(department?.description ?? "");
    setColor(department?.color ?? "#6366F1");
    setParentId(department?.parent_department_id ?? defaultParentId ?? NONE);
  }, [open, department, defaultParentId]);

  const isEdit = !!department;
  const submitting = create.isPending || update.isPending;

  // Exclude self + every descendant so users can't select a parent that would
  // create a cycle. Mirrors the server-side cycle guard in org_update_department.
  const parentOptions = useMemo(() => {
    if (!department) return departments;
    const forbidden = new Set<string>([department.id]);
    let added = true;
    while (added) {
      added = false;
      for (const d of departments) {
        if (
          d.parent_department_id &&
          forbidden.has(d.parent_department_id) &&
          !forbidden.has(d.id)
        ) {
          forbidden.add(d.id);
          added = true;
        }
      }
    }
    return departments.filter((d) => !forbidden.has(d.id));
  }, [departments, department]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const parent = parentId === NONE ? null : parentId;
    if (isEdit && department) {
      await update.mutateAsync({
        id: department.id,
        patch: {
          name: trimmed,
          description: description || null,
          color,
          parentDepartmentId: parent,
        },
      });
    } else {
      await create.mutateAsync({
        name: trimmed,
        description: description || null,
        color,
        parentDepartmentId: parent,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit department" : "New department"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update department details and parent."
              : "Group members and workflows under a department."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Name</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dept-desc">Description</Label>
            <Textarea
              id="dept-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this department own?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dept-color">Color</Label>
              <Input
                id="dept-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 p-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Parent department</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No parent</SelectItem>
                  {parentOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentFormModal;
