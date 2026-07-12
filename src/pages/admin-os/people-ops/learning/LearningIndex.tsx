import { Link, Navigate } from "react-router-dom";
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  Award,
  Route,
  Grid3x3,
  ClipboardCheck,
} from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useLearningDashboard } from "@/hooks/admin-os/useLearning";
import {
  PageHeader,
  SectionCard,
  StatCard,
  EmptyState,
  LoadingSkeleton,
} from "@/components/admin-os/ds";

const links = [
  { to: "/admin-os/people-ops/learning/catalog", label: "Course Catalog", desc: "All courses across departments", icon: BookOpen },
  { to: "/admin-os/people-ops/learning/paths", label: "Learning Paths", desc: "Structured learning journeys", icon: Route },
  { to: "/admin-os/people-ops/learning/enrollments", label: "Enrollments", desc: "Training assignments & progress", icon: GraduationCap },
  { to: "/admin-os/people-ops/learning/skills", label: "Skills & Verification", desc: "Skill catalog + verification workflow", icon: Sparkles },
  { to: "/admin-os/people-ops/learning/certifications", label: "Certifications", desc: "Issue, track, and revoke", icon: Award },
  { to: "/admin-os/people-ops/learning/matrix", label: "Department Skill Matrix", desc: "Skills coverage per department", icon: Grid3x3 },
  { to: "/admin-os/people-ops/learning/roadmaps", label: "Career Roadmaps", desc: "Level → skills, courses, certs", icon: ClipboardCheck },
];

const LearningIndex = () => {
  const { hasPermission } = useEmployee();
  const dash = useLearningDashboard();

  if (
    !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VIEW) &&
    !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_MANAGE) &&
    !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_ENROLL) &&
    !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_LEARNING_VERIFY_SKILL)
  )
    return <Navigate to="/admin-os/no-access" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Learning"
        title="Learning, Skills & Certifications"
        description="Central platform for continuous learning, skill verification, and certifications."
      />

      {dash.error ? (
        <EmptyState title="Could not load dashboard" description={(dash.error as Error).message} />
      ) : dash.isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Published courses"
            value={dash.metrics.publishedCourses}
            delta={`${dash.metrics.totalEnrollments} enrollments`}
          />
          <StatCard
            label="In progress"
            value={dash.metrics.inProgress}
            delta={`${dash.metrics.completed} completed`}
            deltaTone="up"
          />
          <StatCard
            label="Overdue / mandatory"
            value={dash.metrics.overdue}
            delta={`${dash.metrics.mandatoryPending} mandatory pending`}
            deltaTone={dash.metrics.overdue > 0 || dash.metrics.mandatoryPending > 0 ? "down" : "flat"}
          />
          <StatCard
            label="Skills verified"
            value={dash.metrics.verified}
            delta={`${dash.metrics.pendingVerifs} pending · ${dash.metrics.expiringSoon} certs expiring`}
            deltaTone={dash.metrics.expiringSoon > 0 ? "down" : "flat"}
          />
        </div>
      )}

      <SectionCard title="Learning workspace">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="rounded-lg bg-primary/10 text-primary p-2">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{l.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
};

export default LearningIndex;
