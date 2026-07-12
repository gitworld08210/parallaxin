import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { CallProvider } from "@/contexts/CallProvider";
import { MessagesPasscodeGate } from "@/components/messages/MessagesPasscodeGate";

// Eager: critical first-paint routes
import Feed from "./pages/Feed";
import Auth from "./pages/Auth";
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

// Lazy: everything else streams in on demand
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Reels = lazy(() => import("./pages/Reels"));
const Discover = lazy(() => import("./pages/Discover"));
const Messages = lazy(() => import("./pages/Messages"));
const Conversation = lazy(() => import("./pages/Conversation"));
const Notifications = lazy(() => import("./pages/Notifications"));
const InviteAccept = lazy(() => import("./pages/InviteAccept"));
const CollabInviteAccept = lazy(() => import("./pages/CollabInviteAccept"));
const Compose = lazy(() => import("./pages/Compose"));
const ReelCompose = lazy(() => import("./pages/ReelCompose"));
const StoryCompose = lazy(() => import("./pages/StoryCompose"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Tag = lazy(() => import("./pages/Tag"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Premium = lazy(() => import("./pages/Premium"));
const Verification = lazy(() => import("./pages/Verification"));
const FollowList = lazy(() => import("./pages/FollowList"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Drafts = lazy(() => import("./pages/Drafts"));
const PostInsights = lazy(() => import("./pages/PostInsights"));
const CloseFriends = lazy(() => import("./pages/CloseFriends"));
const FounderChronicle = lazy(() => import("./pages/FounderChronicle"));
const HallOfFoundersScreen = lazy(() =>
  import("./components/founders/HallOfFoundersScreen").then((m) => ({ default: m.HallOfFoundersScreen }))
);
const FounderCouncilScreen = lazy(() =>
  import("./components/founders/FounderCouncilScreen").then((m) => ({ default: m.FounderCouncilScreen }))
);
const Settings = lazy(() => import("./pages/Settings"));
const TwoFactorSetup = lazy(() => import("./pages/security/TwoFactorSetup"));
const LoginActivityScreen = lazy(() => import("./pages/security/LoginActivityScreen"));
const PrivacyScreen = lazy(() => import("./pages/security/PrivacyScreen"));
const BlockedListScreen = lazy(() => import("./pages/security/BlockedListScreen"));
const DataExportScreen = lazy(() => import("./pages/security/DataExportScreen"));
const DeleteAccountScreen = lazy(() => import("./pages/security/DeleteAccountScreen"));
const ChangePasswordScreen = lazy(() => import("./pages/security/ChangePasswordScreen"));
const ChangeEmailScreen = lazy(() => import("./pages/security/ChangeEmailScreen"));
const ChangePhoneScreen = lazy(() => import("./pages/security/ChangePhoneScreen"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const OrganizationOnboarding = lazy(() => import("./pages/OrganizationOnboarding"));

const CreatorHub = lazy(() => import("./pages/CreatorHub"));
const Analytics = lazy(() => import("./pages/Analytics"));
const LiveList = lazy(() => import("./pages/LiveList"));
const LiveHost = lazy(() => import("./pages/LiveHost"));
const LiveViewer = lazy(() => import("./pages/LiveViewer"));
const Achievements = lazy(() => import("./pages/Achievements"));
const AuraLevel = lazy(() => import("./pages/AuraLevel"));
const Monetization = lazy(() => import("./pages/Monetization"));
const VerificationCenter = lazy(() => import("./pages/VerificationCenter"));
const Store = lazy(() => import("./pages/Store"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Certificate = lazy(() => import("./pages/Certificate"));
const CreatorTerms = lazy(() => import("./pages/CreatorTerms"));
import { CreatorGate } from "@/components/creator/CreatorGate";
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const VerificationRequestsAdmin = lazy(() => import("./pages/admin/VerificationRequestsAdmin"));
const ReportsAdmin = lazy(() => import("./pages/admin/ReportsAdmin"));
const FounderSeatsAdmin = lazy(() => import("./pages/admin/FounderSeatsAdmin"));
const UsersRolesAdmin = lazy(() => import("./pages/admin/UsersRolesAdmin"));
const PaymentsAdmin = lazy(() => import("./pages/admin/PaymentsAdmin"));

// Admin OS workspace (Phase 1 foundation)
const AdminOSGate = lazy(() =>
  import("./components/admin-os/AdminOSGate").then((m) => ({ default: m.AdminOSGate })),
);
const AdminOSLayout = lazy(() => import("./components/admin-os/layout/AdminOSLayout"));
const AdminOSDashboard = lazy(() => import("./pages/admin-os/AdminOSDashboard"));
const AdminOSModulePlaceholder = lazy(() => import("./pages/admin-os/ModulePlaceholder"));
const AdminOSNoAccess = lazy(() => import("./pages/admin-os/AdminOSNoAccess"));
const AdminOSFirstLogin = lazy(() => import("./pages/admin-os/AdminOSFirstLogin"));
const PeopleOpsIndex = lazy(() => import("./pages/admin-os/people-ops/PeopleOpsIndex"));
const EmployeeDetailPage = lazy(() => import("./pages/admin-os/people-ops/EmployeeDetail"));
const EmployeeForm = lazy(() => import("./pages/admin-os/people-ops/EmployeeForm"));
const FounderOfficeDashboard = lazy(
  () => import("./pages/admin-os/founder-office/FounderOfficeDashboard"),
);
const AuditCenter = lazy(() => import("./pages/admin-os/audit/AuditCenter"));
const DepartmentsIndex = lazy(
  () => import("./pages/admin-os/departments/DepartmentsIndex"),
);
const DepartmentDetail = lazy(
  () => import("./pages/admin-os/departments/DepartmentDetail"),
);
const PlatformIndex = lazy(() => import("./pages/admin-os/platform/PlatformIndex"));
const ApprovalCenter = lazy(() => import("./pages/admin-os/platform/ApprovalCenter"));
const WorkflowViewer = lazy(() => import("./pages/admin-os/platform/WorkflowViewer"));
const NotificationCenter = lazy(() => import("./pages/admin-os/platform/NotificationCenter"));
const ActivityFeed = lazy(() => import("./pages/admin-os/platform/ActivityFeed"));
const AssignmentQueue = lazy(() => import("./pages/admin-os/platform/AssignmentQueue"));
const GlobalSearch = lazy(() => import("./pages/admin-os/platform/GlobalSearch"));
const DocumentManager = lazy(() => import("./pages/admin-os/platform/DocumentManager"));
const ReportsCenter = lazy(() => import("./pages/admin-os/platform/ReportsCenter"));
const DashboardConsole = lazy(() => import("./pages/admin-os/platform/DashboardConsole"));
const SchedulerConsole = lazy(() => import("./pages/admin-os/platform/SchedulerConsole"));



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Organization workspace (lazy)
const OrganizationLayout = lazy(() => import("./components/organization/layout/OrganizationLayout"));
const OrgCreateOrganization = lazy(() => import("./pages/organization/CreateOrganization"));
const OrgDashboard = lazy(() => import("./pages/organization/OrganizationDashboard"));
const OrgFeed = lazy(() => import("./pages/organization/OrganizationFeed"));
const OrgMembers = lazy(() => import("./pages/organization/OrganizationMembers"));
const OrgMemberDetails = lazy(() => import("./pages/organization/OrganizationMemberDetails"));
const OrgRoles = lazy(() => import("./pages/organization/OrganizationRoles"));
const OrgPermissions = lazy(() => import("./pages/organization/OrganizationPermissions"));
const OrgDepartments = lazy(() => import("./pages/organization/OrganizationDepartments"));
const OrgProjects = lazy(() => import("./pages/organization/OrganizationProjects"));
const OrgTasks = lazy(() => import("./pages/organization/OrganizationTasks"));
const OrgCalendar = lazy(() => import("./pages/organization/OrganizationCalendar"));
const OrgDrive = lazy(() => import("./pages/organization/OrganizationDrive"));
const OrgHiring = lazy(() => import("./pages/organization/OrganizationHiring"));
const OrgAnalytics = lazy(() => import("./pages/organization/OrganizationAnalytics"));
const OrgSettings = lazy(() => import("./pages/organization/OrganizationSettings"));
const OrgProfile = lazy(() => import("./pages/organization/OrganizationProfile"));
const OrgAnnouncements = lazy(() => import("./pages/organization/OrganizationAnnouncements"));
const OrgSearch = lazy(() => import("./pages/organization/OrganizationSearch"));
const OrgNotifications = lazy(() => import("./pages/organization/OrganizationNotifications"));

const RouteFallback = () => (
  <div className="min-h-screen grid place-items-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CallProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/certificate/:postId" element={<Certificate />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/onboarding/organization" element={<OrganizationOnboarding />} />
                
                <Route element={<AppShell />}>
                  <Route path="/" element={<Feed />} />
                  <Route path="/reels" element={<Reels />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/messages" element={<MessagesPasscodeGate><Messages /></MessagesPasscodeGate>} />
                  <Route path="/messages/:id" element={<MessagesPasscodeGate><Conversation /></MessagesPasscodeGate>} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/invite/:token" element={<InviteAccept />} />
                  <Route path="/collab/:postId" element={<CollabInviteAccept />} />
                  <Route path="/compose" element={<CreatorGate><Compose /></CreatorGate>} />
                  <Route path="/compose/reel" element={<CreatorGate><ReelCompose /></CreatorGate>} />
                  <Route path="/compose/story" element={<CreatorGate><StoryCompose /></CreatorGate>} />
                  <Route path="/creator/terms" element={<CreatorTerms />} />
                  <Route path="/p/:postId" element={<PostDetail />} />
                  <Route path="/tag/:tag" element={<Tag />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/edit" element={<EditProfile />} />
                  <Route path="/u/:username" element={<Profile />} />
                  <Route path="/u/:username/:kind" element={<FollowList />} />
                  <Route path="/premium" element={<Premium />} />
                  <Route path="/store" element={<Store />} />
                  <Route path="/checkout/return" element={<CheckoutReturn />} />
                  <Route path="/verification" element={<Verification />} />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/drafts" element={<CreatorGate><Drafts /></CreatorGate>} />
                  <Route path="/p/:postId/insights" element={<CreatorGate><PostInsights /></CreatorGate>} />
                  <Route path="/close-friends" element={<CloseFriends />} />
                  <Route path="/founders" element={<Navigate to="/hall-of-founders" replace />} />
                  <Route path="/hall-of-founders" element={<HallOfFoundersScreen />} />
                  <Route path="/founder-council" element={<FounderCouncilScreen />} />
                  <Route path="/founders/:username" element={<FounderChronicle />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/security" element={<TwoFactorSetup />} />
                  <Route path="/settings/activity" element={<LoginActivityScreen />} />
                  <Route path="/settings/privacy" element={<PrivacyScreen />} />
                  <Route path="/settings/blocked" element={<BlockedListScreen />} />
                  <Route path="/settings/export" element={<DataExportScreen />} />
                  <Route path="/settings/delete" element={<DeleteAccountScreen />} />
                  <Route path="/settings/password" element={<ChangePasswordScreen />} />
                  <Route path="/settings/email" element={<ChangeEmailScreen />} />
                  <Route path="/settings/phone" element={<ChangePhoneScreen />} />
                  <Route path="/creator-hub" element={<CreatorGate><CreatorHub /></CreatorGate>} />
                  <Route path="/analytics" element={<CreatorGate><Analytics /></CreatorGate>} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/aura-level" element={<AuraLevel />} />
                  <Route path="/monetization" element={<CreatorGate><Monetization /></CreatorGate>} />
                  <Route path="/verification-center" element={<VerificationCenter />} />
                  <Route path="/live" element={<LiveList />} />
                  <Route path="/live/host" element={<CreatorGate><LiveHost /></CreatorGate>} />
                  <Route path="/live/:id" element={<LiveViewer />} />
                  <Route path="/organization/create" element={<OrgCreateOrganization />} />
                  {/* Slug-based routing (Phase 1). Legacy /organization/* still works below. */}
                  <Route path="/organization/:slug" element={<OrganizationLayout />}>
                    <Route index element={<OrgDashboard />} />
                    <Route path="dashboard" element={<OrgDashboard />} />
                    <Route path="feed" element={<OrgFeed />} />
                    <Route path="members" element={<OrgMembers />} />
                    <Route path="members/:memberId" element={<OrgMemberDetails />} />
                    <Route path="roles" element={<OrgRoles />} />
                    <Route path="permissions" element={<OrgPermissions />} />
                    <Route path="departments" element={<OrgDepartments />} />
                    <Route path="projects" element={<OrgProjects />} />
                    <Route path="tasks" element={<OrgTasks />} />
                    <Route path="calendar" element={<OrgCalendar />} />
                    <Route path="drive" element={<OrgDrive />} />
                    <Route path="hiring" element={<OrgHiring />} />
                    <Route path="analytics" element={<OrgAnalytics />} />
                    <Route path="settings" element={<OrgSettings />} />
                    <Route path="profile" element={<OrgProfile />} />
                    <Route path="announcements" element={<OrgAnnouncements />} />
                    <Route path="search" element={<OrgSearch />} />
                    <Route path="notifications" element={<OrgNotifications />} />
                  </Route>
                  {/* Legacy no-slug routes — Provider resolves to the user's first workspace. */}
                  <Route path="/organization" element={<OrganizationLayout />}>
                    <Route index element={<OrgDashboard />} />
                    <Route path="dashboard" element={<OrgDashboard />} />
                    <Route path="feed" element={<OrgFeed />} />
                    <Route path="members" element={<OrgMembers />} />
                    <Route path="members/:memberId" element={<OrgMemberDetails />} />
                    <Route path="roles" element={<OrgRoles />} />
                    <Route path="permissions" element={<OrgPermissions />} />
                    <Route path="departments" element={<OrgDepartments />} />
                    <Route path="projects" element={<OrgProjects />} />
                    <Route path="tasks" element={<OrgTasks />} />
                    <Route path="calendar" element={<OrgCalendar />} />
                    <Route path="drive" element={<OrgDrive />} />
                    <Route path="hiring" element={<OrgHiring />} />
                    <Route path="analytics" element={<OrgAnalytics />} />
                    <Route path="settings" element={<OrgSettings />} />
                    <Route path="profile" element={<OrgProfile />} />
                    <Route path="announcements" element={<OrgAnnouncements />} />
                    <Route path="search" element={<OrgSearch />} />
                    <Route path="notifications" element={<OrgNotifications />} />
                  </Route>
                </Route>
              </Route>
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<VerificationRequestsAdmin />} />
                  <Route path="reports" element={<ReportsAdmin />} />
                  <Route path="founders" element={<FounderSeatsAdmin />} />
                  <Route path="users" element={<UsersRolesAdmin />} />
                  <Route path="payments" element={<PaymentsAdmin />} />
                </Route>
              </Route>

              {/* Aurelix Admin OS — internal enterprise workspace */}
              <Route path="/admin-os/no-access" element={<AdminOSNoAccess />} />
              <Route element={<AdminOSGate />}>
                <Route path="/admin-os/first-login" element={<AdminOSFirstLogin />} />
                <Route path="/admin-os" element={<AdminOSLayout />}>
                  <Route index element={<AdminOSDashboard />} />
                  <Route path="people-ops" element={<PeopleOpsIndex />} />
                  <Route
                    path="people-ops/new"
                    element={<EmployeeForm mode="create" />}
                  />
                  <Route path="people-ops/:id" element={<EmployeeDetailPage />} />
                  <Route
                    path="people-ops/:id/edit"
                    element={<EmployeeForm mode="edit" />}
                  />
                  <Route
                    path="founder-office"
                    element={<FounderOfficeDashboard />}
                  />
                  <Route path="audit" element={<AuditCenter />} />
                  <Route path="departments" element={<DepartmentsIndex />} />
                  <Route path="departments/:id" element={<DepartmentDetail />} />
                  <Route path="platform" element={<PlatformIndex />} />
                  <Route path="platform/approvals" element={<ApprovalCenter />} />
                  <Route path="platform/workflows" element={<WorkflowViewer />} />
                  <Route path="platform/notifications" element={<NotificationCenter />} />
                  <Route path="platform/activity" element={<ActivityFeed />} />
                  <Route path="platform/assignments" element={<AssignmentQueue />} />
                  <Route path="platform/search" element={<GlobalSearch />} />
                  <Route path="platform/documents" element={<DocumentManager />} />
                  <Route path="platform/reports" element={<ReportsCenter />} />
                  <Route path="platform/dashboards" element={<DashboardConsole />} />
                  <Route path="platform/scheduler" element={<SchedulerConsole />} />
                  <Route path=":slug" element={<AdminOSModulePlaceholder />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </CallProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);


export default App;
