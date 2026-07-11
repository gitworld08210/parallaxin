import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { useDepartmentMutations } from "@/hooks/organization/useOrganizationDepartments";
import { ORG_PERMISSIONS } from "@/features/organization/permissions.registry";
import type { DepartmentNode } from "@/types/organization/department";

interface DepartmentCardProps {
  node: DepartmentNode;
  memberCount?: number;
  onEdit?: (node: DepartmentNode) => void;
}

export const DepartmentCard = ({ node, memberCount, onEdit }: DepartmentCardProps) => {
  const { organization, hasPermission } = useOrganizationContext();
  const { remove } = useDepartmentMutations();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canUpdate = hasPermission(ORG_PERMISSIONS.DEPARTMENTS_UPDATE)
    || hasPermission(ORG_PERMISSIONS.DEPARTMENTS_EDIT);
  const canDelete = hasPermission(ORG_PERMISSIONS.DEPARTMENTS_DELETE);
  const detailBase = organization?.slug ? `/organization/${organization.slug}/departments` : "#";

  const initials = useMemo(() => (node.name?.[0] ?? "D").toUpperCase(), [node.name]);
  const accent = node.color || "hsl(var(--primary))";

  return (
    <>
      <Card className="group transition hover:shadow-md">
        <CardContent className="flex items-start gap-3 p-4">
          <div
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-sm font-semibold text-primary-foreground"
            style={{ background: accent }}
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  to={`${detailBase}`}
                  className="block truncate text-sm font-semibold hover:underline"
                >
                  {node.name}
                </Link>
                {node.description ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {node.description}
                  </p>
                ) : null}
              </div>

              {(canUpdate || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canUpdate && (
                      <DropdownMenuItem onSelect={() => onEdit?.(node)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit department
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => {
                            e.preventDefault();
                            setConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {memberCount ?? 0} member{(memberCount ?? 0) === 1 ? "" : "s"}
              </Badge>
              {node.children.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {node.children.length} sub-department
                  {node.children.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this department?</AlertDialogTitle>
            <AlertDialogDescription>
              Members and child departments will be detached but not removed. This action can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => remove.mutate(node.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DepartmentCard;
