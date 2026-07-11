// OrganizationPermissions — permission matrix editor.
import RolePermissionsTable from "@/components/organization/roles/RolePermissionsTable";

export default function OrganizationPermissions() {
  return (
    <div className="space-y-6 p-6" data-page="OrganizationPermissions">
      <header>
        <h1 className="text-2xl font-bold">Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Toggle which permissions each role grants. Changes save per role.
        </p>
      </header>

      <RolePermissionsTable />
    </div>
  );
}
