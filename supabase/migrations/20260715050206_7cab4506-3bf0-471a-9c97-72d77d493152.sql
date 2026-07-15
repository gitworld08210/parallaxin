
-- Grant payroll permissions to relevant roles (idempotent)
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE p.permission_key IN ('people_ops.payroll.view','people_ops.payroll.manage')
  AND r.key IN ('co_founder')
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE p.permission_key = 'people_ops.payroll.view'
  AND r.key IN ('department_head','finance_l2','manager')
ON CONFLICT DO NOTHING;

-- Allow employees to see their own released payslip
CREATE POLICY "employees read own payroll item"
ON public.payroll_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = payroll_items.employee_id
      AND e.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.payroll_cycles c
    WHERE c.id = payroll_items.cycle_id
      AND c.status = 'released'
  )
);

-- Allow employees to see any cycle that contains their own released payslip
CREATE POLICY "employees read own released cycle"
ON public.payroll_cycles
FOR SELECT
TO authenticated
USING (
  status = 'released' AND EXISTS (
    SELECT 1 FROM public.payroll_items pi
    JOIN public.employees e ON e.id = pi.employee_id
    WHERE pi.cycle_id = payroll_cycles.id
      AND e.user_id = auth.uid()
  )
);
