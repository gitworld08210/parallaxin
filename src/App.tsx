import { lazy, Suspense, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { CallProvider } from "@/contexts/CallProvider";
import MessagesPasscodeGate from "@/components/messages/MessagesPasscodeGate";
import useNativeApp from "@/hooks/useNativeApp";

// Eager: critical first-paint routes
const Feed = lazy(() => import("./pages/Feed"));
const Auth = lazy(() => import("./pages/Auth"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

// Lazy: everything else streams in on demand
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
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
const WalletHome = lazy(() => import("./pages/Wallet")); // Placeholder fallback
const WalletAnalytics = lazy(() => import("./pages/Wallet"));
const WalletTransactions = lazy(() => import("./pages/Wallet"));
const WalletPassport = lazy(() => import("./pages/Wallet"));
const WalletCoins = lazy(() => import("./pages/Wallet"));
const WalletGift = lazy(() => import("./pages/Wallet"));
const WalletWithdraw = lazy(() => import("./pages/Wallet"));
const WalletQR = lazy(() => import("./pages/Wallet"));
const WalletSecurity = lazy(() => import("./pages/Wallet"));
const WalletCardPage = lazy(() => import("./pages/Wallet"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Premium = lazy(() => import("./pages/Premium"));
const Verification = lazy(() => import("./pages/Verification"));
const Support = lazy(() => import("./pages/Support"));
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
const ProfileCreation = lazy(() => import("./pages/ProfileCreation"));

// Aurelix Ads Manager
const AdsLayout = lazy(() => import("./pages/NotFound"));
const AdsBusinessCenter = lazy(() => import("./pages/NotFound"));
const AdsDashboard = lazy(() => import("./pages/NotFound"));
const AdsManager = lazy(() => import("./pages/NotFound"));
const AdsCampaignWizard = lazy(() => import("./pages/NotFound"));
const AdsCreatives = lazy(() => import("./pages/NotFound"));
const AdsBilling = lazy(() => import("./pages/NotFound"));
const AdsReviewQueue = lazy(() => import("./pages/NotFound"));
const AdsFinanceConsole = lazy(() => import("./pages/NotFound"));
const FinPaymentOperations = lazy(() => import("./pages/NotFound"));


const CreatorHub = lazy(() => import("./pages/CreatorHub"));
const CreatorStudio = lazy(() => import("./pages/CreatorStudio"));
const CreatorNews = lazy(() => import("./pages/CreatorNews"));
const Analytics = lazy(() => import("./pages/Analytics"));
const LiveList = lazy(() => import("./pages/LiveList"));
const LiveHost = lazy(() => import("./pages/LiveHost"));
const LiveViewer = lazy(() => import("./pages/LiveViewer"));
const Achievements = lazy(() => import("./pages/Achievements"));
const AuraLevel = lazy(() => import("./pages/AuraLevel"));
const Monetization = lazy(() => import("./pages/Monetization"));
const VerificationCenter = lazy(() => import("./pages/VerificationCenter"));
const AdminOSVerificationQueue = lazy(() => import("./pages/admin-os/VerificationQueue"));
const VirtualWorld = lazy(() => import("./pages/VirtualWorld"));
const Store = lazy(() => import("./pages/Store"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Certificate = lazy(() => import("./pages/Certificate"));
const CreatorTerms = lazy(() => import("./pages/CreatorTerms"));
import { CreatorGate } from "@/components/creator/CreatorGate";
const ContentClassificationQueue = lazy(() => import("./pages/NotFound"));
const ReviewerWorkspace = lazy(() => import("./pages/NotFound"));

// Admin OS workspace (Phase 1 foundation)
const AdminOSGate = lazy(() => import("@/components/ProtectedRoute").then(m => ({ default: m.AdminOSGate })));
const AdminOSLayout = lazy(() => import("@/components/organization/layout/OrganizationLayout")); // Using existing shell for consistency
const AdminOSDashboard = lazy(() => import("./pages/admin-os/AdminOSDashboard"));
const AppointmentsPanel = lazy(() => import("./pages/admin-os/AppointmentsPanel"));
const RoutingOverview = lazy(() => import("./pages/NotFound"));
const ApprovalsInbox = lazy(() => import("./pages/admin-os/ApprovalsInbox"));
const AdminOSModulePlaceholder = lazy(() => import("./pages/NotFound"));
const AdminOSNoAccess = lazy(() => import("./pages/NotFound"));
const AdminOSFirstLogin = lazy(() => import("./pages/NotFound"));
const PeopleOpsIndex = lazy(() => import("./pages/NotFound"));
const EmployeeDetailPage = lazy(() => import("./pages/NotFound"));
const EmployeeForm = lazy(() => import("./pages/NotFound"));
const OnboardingQueue = lazy(() => import("./pages/NotFound"));
const OnboardingWizard = lazy(() => import("./pages/NotFound"));
const OnboardingDetail = lazy(() => import("./pages/NotFound"));
const EmployeePassport = lazy(() => import("./pages/NotFound"));
const PassportPrint = lazy(() => import("./pages/NotFound"));
const MovementCenter = lazy(() => import("./pages/NotFound"));
const MovementWizard = lazy(() => import("./pages/NotFound"));
const MovementDetail = lazy(() => import("./pages/NotFound"));
const ReportingStructure = lazy(() => import("./pages/NotFound"));
const DocumentsCenter = lazy(() => import("./pages/NotFound"));
const OrganizationIndex = lazy(() => import("./pages/NotFound"));
const OrgChart = lazy(() => import("./pages/NotFound"));
const CapacityDashboard = lazy(() => import("./pages/NotFound"));
const OpenPositions = lazy(() => import("./pages/NotFound"));
const SuccessionPage = lazy(() => import("./pages/NotFound"));
const WorkforcePlanning = lazy(() => import("./pages/NotFound"));
const PerformanceIndex = lazy(() => import("./pages/NotFound"));
const GoalsCenter = lazy(() => import("./pages/NotFound"));
const ReviewCenter = lazy(() => import("./pages/NotFound"));
const RecognitionCenter = lazy(() => import("./pages/NotFound"));
const PipCenter = lazy(() => import("./pages/NotFound"));
const CareerGrowth = lazy(() => import("./pages/NotFound"));
const PromotionReadinessPage = lazy(() => import("./pages/NotFound"));
const LearningIndex = lazy(() => import("./pages/NotFound"));
const CourseCatalog = lazy(() => import("./pages/NotFound"));
const LearningPathsPage = lazy(() => import("./pages/NotFound"));
const EnrollmentCenter = lazy(() => import("./pages/NotFound"));
const SkillsCenter = lazy(() => import("./pages/NotFound"));
const CertificationCenter = lazy(() => import("./pages/NotFound"));
const DepartmentSkillMatrix = lazy(() => import("./pages/NotFound"));
const CareerRoadmapsPage = lazy(() => import("./pages/NotFound"));
const RecruitmentIndex = lazy(() => import("./pages/admin-os/RecruitmentCenter"));
const HiringRequestCenter = lazy(() => import("./pages/NotFound"));
const CandidateDirectory = lazy(() => import("./pages/NotFound"));
const CandidateDetail = lazy(() => import("./pages/NotFound"));
const InterviewPipeline = lazy(() => import("./pages/NotFound"));
const OfferCenter = lazy(() => import("./pages/NotFound"));
const RecruitmentAnalytics = lazy(() => import("./pages/NotFound"));
const AttendanceIndex = lazy(() => import("./pages/NotFound"));
const MyAttendance = lazy(() => import("./pages/NotFound"));
const LeaveCenter = lazy(() => import("./pages/NotFound"));
const ShiftManagement = lazy(() => import("./pages/NotFound"));
const HolidayCalendar = lazy(() => import("./pages/NotFound"));
const AttendanceCorrections = lazy(() => import("./pages/NotFound"));
const WorkforceAvailability = lazy(() => import("./pages/NotFound"));
const PayrollIndex = lazy(() => import("./pages/NotFound"));
const PayrollCycles = lazy(() => import("./pages/NotFound"));
const PayrollCycleDetail = lazy(() => import("./pages/NotFound"));
const CompensationPlansPage = lazy(() => import("./pages/NotFound"));
const SalaryStructuresPage = lazy(() => import("./pages/NotFound"));
const SalaryRevisionsPage = lazy(() => import("./pages/NotFound"));
const BonusCenter = lazy(() => import("./pages/NotFound"));
const BenefitsCenter = lazy(() => import("./pages/NotFound"));
const ReimbursementCenter = lazy(() => import("./pages/NotFound"));
// Executive Workspace (Phase 3.1)
const ExecutiveGate = lazy(() => import("./pages/NotFound"));
const ExecutiveLayout = lazy(() => import("./pages/NotFound"));
const ExecutiveDashboard = lazy(() => import("./pages/NotFound"));
const ExecutiveProfile = lazy(() => import("./pages/NotFound"));
// Phase 3.9 — Founder Office Security & Identity
const SecurityShell = lazy(() => import("./pages/NotFound"));
const SecurityOverview = lazy(() => import("./pages/NotFound"));
const IdentityProfile = lazy(() => import("./pages/NotFound"));
const SessionManagerPage = lazy(() => import("./pages/NotFound"));
const TrustedDevicesPage = lazy(() => import("./pages/NotFound"));
const RecoveryCenterPage = lazy(() => import("./pages/NotFound"));
const PasswordAndMFAPage = lazy(() => import("./pages/NotFound"));
const SecurityAlertsPage = lazy(() => import("./pages/NotFound"));
const LoginHistoryPage = lazy(() => import("./pages/NotFound"));
const SecurityPoliciesPage = lazy(() => import("./pages/NotFound"));
const ExecutivePlaceholders = () => import("./pages/NotFound");
const ExecutiveInbox = lazy(() => import("./pages/NotFound"));
const ExecutiveApprovalDetail = lazy(() => import("./pages/NotFound"));

const ExecutiveDepartments = lazy(() => import("./pages/NotFound"));
const ExecutiveEmployees = lazy(() => import("./pages/NotFound"));
const ExecutiveReports = lazy(() => import("./pages/NotFound"));
const DecisionLogPage = lazy(() => import("./pages/NotFound"));
// Phase 3.8 — Company Configuration & Global Settings
const CompanyShell = lazy(() => import("./pages/NotFound"));
const CompanyOverview = lazy(() => import("./pages/NotFound"));
const CompanyProfilePage = lazy(() => import("./pages/NotFound"));
const BrandManagementPage = lazy(() => import("./pages/NotFound"));
const PlatformPreferencesPage = lazy(() => import("./pages/NotFound"));
const LocalizationCenterPage = lazy(() => import("./pages/NotFound"));
const FeatureFlagsManagerPage = lazy(() => import("./pages/NotFound"));
const ModuleManagerPage = lazy(() => import("./pages/NotFound"));
const CompanyCalendarPage = lazy(() => import("./pages/NotFound"));
const MetadataManagerPage = lazy(() => import("./pages/NotFound"));
// Phase 3.10 — Automation
const AutomationShell = lazy(() => import("./pages/NotFound"));
const AutomationOverview = lazy(() => import("./pages/NotFound"));
const AutomationsList = lazy(() => import("./pages/NotFound"));
const AutomationBuilder = lazy(() => import("./pages/NotFound"));
const AutomationSchedulesPage = lazy(() => import("./pages/NotFound"));
const AutomationRemindersPage = lazy(() => import("./pages/NotFound"));
const AutomationEscalationsPage = lazy(() => import("./pages/NotFound"));
const AutomationTemplatesPage = lazy(() => import("./pages/NotFound"));
const AutomationHistoryPage = lazy(() => import("./pages/NotFound"));
const AutomationMonitorPage = lazy(() => import("./pages/NotFound"));
// Phase 3.11 — Executive AI
const AiShell = lazy(() => import("./pages/NotFound"));
const AiChat = lazy(() => import("./pages/NotFound"));
const AiRecommendationsPage = lazy(() => import("./pages/NotFound"));
const AiPredictionsPage = lazy(() => import("./pages/NotFound"));
const AiRisksPage = lazy(() => import("./pages/NotFound"));
const AiSummariesPage = lazy(() => import("./pages/NotFound"));
const AiKnowledgePage = lazy(() => import("./pages/NotFound"));
const AiPromptsPage = lazy(() => import("./pages/NotFound"));
// Phase 3.12 — Production Readiness
const ProductionShell = lazy(() => import("./pages/NotFound"));
const ProductionOverview = lazy(() => import("./pages/NotFound"));
const ProductionModules = lazy(() => import("./pages/NotFound"));
const ProductionIntegrations = lazy(() => import("./pages/NotFound"));
const ProductionChecklist = lazy(() => import("./pages/NotFound"));
const ProductionReleases = lazy(() => import("./pages/NotFound"));
const ProductionHistory = lazy(() => import("./pages/NotFound"));
const ProductionIssues = lazy(() => import("./pages/NotFound"));
// Phase 3.11 — KIP (Knowledge Intelligence Platform)
const KipShell = lazy(() => import("./pages/NotFound"));
const KnowledgeHome = lazy(() => import("./pages/NotFound"));
const KipChatWorkspace = lazy(() => import("./pages/NotFound"));
const KipDocumentLibrary = lazy(() => import("./pages/NotFound"));
const KipCollectionsList = lazy(() => import("./pages/NotFound"));
const KipCollectionDetail = lazy(() => import("./pages/NotFound"));
const KipKnowledgeSearch = lazy(() => import("./pages/NotFound"));
const KipBookmarksPage = lazy(() => import("./pages/NotFound"));
const KipConversationHistory = lazy(() => import("./pages/NotFound"));
const ExecutiveNotificationsPage = lazy(() => import("./pages/NotFound"));
// Phase 3.4 — Governance
const GovernanceIndex = lazy(() => import("./pages/NotFound"));
const PolicyCenter = lazy(() => import("./pages/NotFound"));
const PolicyDetail = lazy(() => import("./pages/NotFound"));
const AuthorityMatrixPage = lazy(() => import("./pages/NotFound"));
const ApprovalMatrixPage = lazy(() => import("./pages/NotFound"));
const DelegationCenter = lazy(() => import("./pages/NotFound"));
const DepartmentCharters = lazy(() => import("./pages/NotFound"));
const GovernanceSearchPage = lazy(() => import("./pages/NotFound"));
// Phase 3.5 — Strategic Decisions
const DecisionCenter = lazy(() => import("./pages/NotFound"));
const DecisionEditor = lazy(() => import("./pages/NotFound"));
const DecisionDetail = lazy(() => import("./pages/NotFound"));
const DecisionSearchPage = lazy(() => import("./pages/NotFound"));

// Phase 3.6 — Executive Reports & Analytics
const ReportsShell = lazy(() => import("./pages/NotFound"));
const ReportsOverview = lazy(() => import("./pages/NotFound"));
const AnalyticsCenter = lazy(() => import("./pages/NotFound"));
const ScorecardsPage = lazy(() => import("./pages/NotFound"));
const TrendAnalysis = lazy(() => import("./pages/NotFound"));
const ReportLibrary = lazy(() => import("./pages/NotFound"));
const ScheduledReportsPage = lazy(() => import("./pages/NotFound"));
const ExportCenterPage = lazy(() => import("./pages/NotFound"));
const DepartmentReportCompliance = lazy(() => import("./pages/NotFound"));

// Phase 3.7 — Executive Command Center
const CommandShell = lazy(() => import("./pages/NotFound"));
const CommandOverview = lazy(() => import("./pages/NotFound"));
const EmergencyPanel = lazy(() => import("./pages/NotFound"));
const MaintenanceCenterPage = lazy(() => import("./pages/NotFound"));
const AnnouncementCenterPage = lazy(() => import("./pages/NotFound"));
const BroadcastCenterPage = lazy(() => import("./pages/NotFound"));
const SystemStatusDashboard = lazy(() => import("./pages/NotFound"));
const IncidentCenterPage = lazy(() => import("./pages/NotFound"));
const ContinuityCenterPage = lazy(() => import("./pages/NotFound"));
const LockdownPanelPage = lazy(() => import("./pages/NotFound"));
const WatchlistPanelPage = lazy(() => import("./pages/NotFound"));
const FounderOfficeDashboard = lazy(
  () => import("./pages/NotFound"));
// AppointmentsPanel handled in admin-os lazy imports above
const AuditCenter = lazy(() => import("./pages/NotFound"));
const DepartmentsIndex = lazy(
  () => import("./pages/NotFound"));
const DepartmentDetail = lazy(
  () => import("./pages/NotFound"));
// Phase 4.1 — Trust & Safety
const TrustSafetyShell = lazy(() => import("./pages/NotFound"));
const TsDashboard = lazy(() => import("./pages/NotFound"));
const TsCaseQueue = lazy(() => import("./pages/NotFound"));
const TsCaseDetail = lazy(() => import("./pages/NotFound"));
const TsAppealsCenter = lazy(() => import("./pages/NotFound"));
const TsPolicyReference = lazy(() => import("./pages/NotFound"));
// Phase 4.2 — Verification
const VerificationShell = lazy(() => import("./pages/NotFound"));
const VerificationDashboard = lazy(() => import("./pages/NotFound"));
const VerApplicationQueue = lazy(() => import("./pages/NotFound"));
const VerCaseWorkspace = lazy(() => import("./pages/NotFound"));
const VerBadgeManager = lazy(() => import("./pages/NotFound"));
const VerAffiliationManager = lazy(() => import("./pages/NotFound"));
const VerAppealsCenter = lazy(() => import("./pages/NotFound"));
const VerHistoryPage = lazy(() => import("./pages/NotFound"));
const VerVirtualWorldRequests = lazy(() => import("./pages/NotFound"));
// Phase 4.3 — Support
const SupportShell = lazy(() => import("./pages/NotFound"));
const SupportDashboardPage = lazy(() => import("./pages/NotFound"));
const SupportTicketQueue = lazy(() => import("./pages/NotFound"));
const SupportTicketWorkspace = lazy(() => import("./pages/NotFound"));
const SupportSlaDashboard = lazy(() => import("./pages/NotFound"));
const SupportAnalyticsPage = lazy(() => import("./pages/NotFound"));

const EngineeringShell = lazy(() => import("./pages/NotFound"));
const EngDashboard = lazy(() => import("./pages/NotFound"));
const EngProjectsPage = lazy(() => import("./pages/NotFound"));
const EngSprintsPage = lazy(() => import("./pages/NotFound"));
const EngKanbanBoard = lazy(() => import("./pages/NotFound"));
const EngTaskCenter = lazy(() => import("./pages/NotFound"));
const EngBugCenter = lazy(() => import("./pages/NotFound"));
const EngReleaseCenter = lazy(() => import("./pages/NotFound"));
const EngDesignCenter = lazy(() => import("./pages/NotFound"));
const EngDocumentationCenter = lazy(() => import("./pages/NotFound"));
const EngReports = lazy(() => import("./pages/NotFound"));

const FinanceLegalShell = lazy(() => import("./pages/NotFound"));
const FinanceDashboard = lazy(() => import("./pages/NotFound"));
const FinBudgetCenter = lazy(() => import("./pages/NotFound"));
const FinExpenseCenter = lazy(() => import("./pages/NotFound"));
const FinInvoiceCenter = lazy(() => import("./pages/NotFound"));
const FinProcurementCenter = lazy(() => import("./pages/NotFound"));
const FinVendorCenter = lazy(() => import("./pages/NotFound"));
const FinContractCenter = lazy(() => import("./pages/NotFound"));
const FinComplianceDashboard = lazy(() => import("./pages/NotFound"));
const FinCreatorPayoutQueue = lazy(() => import("./pages/NotFound"));
const FinHireApprovals = lazy(() => import("./pages/NotFound"));
const FinNewHireBankDetails = lazy(() => import("./pages/NotFound"));
const FinWalletLookup = lazy(() => import("./pages/NotFound"));
const HireCompensationPage = lazy(() => import("./pages/NotFound"));
const EmployeeFinanceOnboarding = lazy(() => import("./pages/NotFound"));
const SecurityDeptShell = lazy(() => import("./pages/NotFound"));
const SecurityDashboardPage = lazy(() => import("./pages/NotFound"));
const SecIncidentCenter = lazy(() => import("./pages/NotFound"));
const SecIncidentWorkspace = lazy(() => import("./pages/NotFound"));
const SecThreatCenter = lazy(() => import("./pages/NotFound"));
const SecIamCenter = lazy(() => import("./pages/NotFound"));
const SecAccessReviews = lazy(() => import("./pages/NotFound"));
const SecInvestigationWorkspace = lazy(() => import("./pages/NotFound"));
const SecComplianceDashboard = lazy(() => import("./pages/NotFound"));
const SecAnalytics = lazy(() => import("./pages/NotFound"));
const PlatformIndex = lazy(() => import("./pages/NotFound"));
const ApprovalCenter = lazy(() => import("./pages/NotFound"));
const WorkflowViewer = lazy(() => import("./pages/NotFound"));
const NotificationCenter = lazy(() => import("./pages/NotFound"));
const ActivityFeed = lazy(() => import("./pages/NotFound"));
const AssignmentQueue = lazy(() => import("./pages/NotFound"));
const GlobalSearch = lazy(() => import("./pages/NotFound"));
const DocumentManager = lazy(() => import("./pages/NotFound"));
const ReportsCenter = lazy(() => import("./pages/NotFound"));
const DashboardConsole = lazy(() => import("./pages/NotFound"));
const SchedulerConsole = lazy(() => import("./pages/NotFound"));
const DesignSystem = lazy(() => import("./pages/NotFound"));



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Organization workspace (lazy)
const OrganizationLayout = lazy(() => import("./pages/NotFound"));
const OrgCreateOrganization = lazy(() => import("./pages/NotFound"));
const OrgDashboard = lazy(() => import("./pages/NotFound"));
const OrgFeed = lazy(() => import("./pages/NotFound"));
const OrgMembers = lazy(() => import("./pages/NotFound"));
const OrgMemberDetails = lazy(() => import("./pages/NotFound"));
const OrgRoles = lazy(() => import("./pages/NotFound"));
const OrgPermissions = lazy(() => import("./pages/NotFound"));
const OrgDepartments = lazy(() => import("./pages/NotFound"));
const OrgProjects = lazy(() => import("./pages/NotFound"));
const OrgTasks = lazy(() => import("./pages/NotFound"));
const OrgCalendar = lazy(() => import("./pages/NotFound"));
const OrgDrive = lazy(() => import("./pages/NotFound"));
const OrgHiring = lazy(() => import("./pages/NotFound"));
const OrgAnalytics = lazy(() => import("./pages/NotFound"));
const OrgSettings = lazy(() => import("./pages/NotFound"));
const OrgProfile = lazy(() => import("./pages/NotFound"));
const OrgAnnouncements = lazy(() => import("./pages/NotFound"));
const OrgSearch = lazy(() => import("./pages/NotFound"));
const OrgNotifications = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen grid place-items-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const NativeInit = () => {
  useNativeApp();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NativeInit />
        <AuthProvider>
          <CallProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/certificate/:postId" element={<Certificate />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/profile-creation" element={<ProfileCreation />} />
                
                <Route element={<AppShell />}>
                  <Route path="/" element={<Feed />} />

                  <Route path="/reels" element={<Reels />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/messages" element={<MessagesPasscodeGate><Messages /></MessagesPasscodeGate>} />
                  <Route path="/messages/:id" element={<MessagesPasscodeGate><Conversation /></MessagesPasscodeGate>} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/invite/:token" element={<InviteAccept />} />
                  <Route path="/collab/:postId" element={<CollabInviteAccept />} />
                  <Route path="/compose" element={<Compose />} />
                  <Route path="/compose/reel" element={<ReelCompose />} />
                  <Route path="/compose/story" element={<StoryCompose />} />
                  <Route path="/creator/terms" element={<CreatorTerms />} />
                  <Route path="/p/:postId" element={<PostDetail />} />
                  <Route path="/tag/:tag" element={<Tag />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/wallet/legacy" element={<Wallet />} />
                  <Route path="/wallet/analytics" element={<WalletAnalytics />} />
                  <Route path="/wallet/transactions" element={<WalletTransactions />} />
                  <Route path="/wallet/passport" element={<WalletPassport />} />
                  <Route path="/wallet/coins" element={<WalletCoins />} />
                  <Route path="/wallet/gift" element={<WalletGift />} />
                  <Route path="/wallet/withdraw" element={<WalletWithdraw />} />
                  <Route path="/wallet/qr" element={<WalletQR />} />
                  <Route path="/wallet/security" element={<WalletSecurity />} />
                  <Route path="/wallet/card" element={<WalletCardPage />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/edit" element={<EditProfile />} />
                  <Route path="/u/:username" element={<Profile />} />
                  <Route path="/u/:username/:kind" element={<FollowList />} />
                  <Route path="/premium" element={<Premium />} />
                  <Route path="/store" element={<Store />} />
                  <Route path="/checkout/return" element={<CheckoutReturn />} />
                  <Route path="/verification" element={<Verification />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/help" element={<Navigate to="/support" replace />} />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/drafts" element={<Drafts />} />
                  <Route path="/p/:postId/insights" element={<PostInsights />} />
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
                  <Route path="/creator-hub" element={<CreatorHub />} />
                  <Route path="/creator/studio" element={<CreatorStudio />} />
                  <Route path="/news" element={<CreatorNews />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/aura-level" element={<AuraLevel />} />
                  <Route path="/monetization" element={<Monetization />} />
                  <Route path="/verification-center" element={<VerificationCenter />} />
                  <Route path="/virtual-world" element={<VirtualWorld />} />
                  <Route path="/live" element={<LiveList />} />
                  <Route path="/live/host" element={<LiveHost />} />
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

              {/* Aurelix Ads Manager */}
              <Route element={<ProtectedRoute />}>
                <Route path="/ads" element={<AdsBusinessCenter />} />
                <Route path="/ads/review" element={<AdsReviewQueue />} />
                <Route path="/ads/finance" element={<AdsFinanceConsole />} />
                <Route path="/ads/:accountId" element={<AdsLayout />}>
                  <Route index element={<AdsDashboard />} />
                  <Route path="campaigns" element={<AdsManager />} />
                  <Route path="create" element={<AdsCampaignWizard />} />
                  <Route path="creatives" element={<AdsCreatives />} />
                  <Route path="billing" element={<AdsBilling />} />
                </Route>
              </Route>


              {/* Legacy /admin removed — redirect to new Admin OS */}
              <Route path="/admin" element={<Navigate to="/admin-os" replace />} />
              <Route path="/admin/*" element={<Navigate to="/admin-os" replace />} />

              {/* Aurelix Admin OS — internal enterprise workspace */}
              <Route element={<AdminOSGate />}>
                <Route path="/admin-os" element={<AdminOSDashboard />} />
                <Route path="/admin-os/verification" element={<AdminOSVerificationQueue />} />
                <Route path="/admin-os/appointments" element={<AppointmentsPanel />} />
                <Route path="/admin-os/approvals" element={<ApprovalsInbox />} />
                <Route path="/admin-os/recruitment" element={<RecruitmentIndex />} />
              </Route>

              <Route path="/admin-os/no-access" element={<AdminOSNoAccess />} />

              {/* Founder Office Executive Workspace (Phase 3.1) */}
              <Route element={<ExecutiveGate />}>
                <Route path="/admin-os/executive" element={<ExecutiveLayout />}>
                  <Route index element={<ExecutiveDashboard />} />
                  <Route path="inbox" element={<ExecutiveInbox />} />
                  <Route path="inbox/:id" element={<ExecutiveApprovalDetail />} />
                  <Route path="approvals" element={<ExecutiveInbox />} />
                  <Route path="approvals/:id" element={<ExecutiveApprovalDetail />} />
                  <Route path="departments" element={<ExecutiveDepartments />} />
                  <Route path="employees" element={<ExecutiveEmployees />} />
                  <Route path="reports" element={<ReportsShell />}>
                    <Route index element={<ReportsOverview />} />
                    <Route path="analytics" element={<AnalyticsCenter />} />
                    <Route path="scorecards" element={<ScorecardsPage />} />
                    <Route path="trends" element={<TrendAnalysis />} />
                    <Route path="library" element={<ReportLibrary />} />
                    <Route path="scheduled" element={<ScheduledReportsPage />} />
                    <Route path="exports" element={<ExportCenterPage />} />
                    <Route path="compliance" element={<DepartmentReportCompliance />} />
                  </Route>
                  <Route path="decisions" element={<DecisionCenter />} />
                  <Route path="decisions/new" element={<DecisionEditor />} />
                  <Route path="decisions/search" element={<DecisionSearchPage />} />
                  <Route path="decisions/approvals-log" element={<DecisionLogPage />} />
                  <Route path="decisions/:id" element={<DecisionDetail />} />
                  <Route path="governance" element={<GovernanceIndex />} />
                  <Route path="governance/policies" element={<PolicyCenter />} />
                  <Route path="governance/policies/:id" element={<PolicyDetail />} />
                  <Route path="governance/authority" element={<AuthorityMatrixPage />} />
                  <Route path="governance/approval-matrix" element={<ApprovalMatrixPage />} />
                  <Route path="governance/delegations" element={<DelegationCenter />} />
                  <Route path="governance/charters" element={<DepartmentCharters />} />
                  <Route path="governance/search" element={<GovernanceSearchPage />} />
                  <Route path="command" element={<CommandShell />}>
                    <Route index element={<CommandOverview />} />
                    <Route path="emergency" element={<EmergencyPanel />} />
                    <Route path="maintenance" element={<MaintenanceCenterPage />} />
                    <Route path="announcements" element={<AnnouncementCenterPage />} />
                    <Route path="broadcasts" element={<BroadcastCenterPage />} />
                    <Route path="status" element={<SystemStatusDashboard />} />
                    <Route path="incidents" element={<IncidentCenterPage />} />
                    <Route path="continuity" element={<ContinuityCenterPage />} />
                    <Route path="lockdowns" element={<LockdownPanelPage />} />
                    <Route path="watchlists" element={<WatchlistPanelPage />} />
                  </Route>
                  <Route path="security" element={<SecurityShell />}>
                    <Route index element={<SecurityOverview />} />
                    <Route path="identity" element={<IdentityProfile />} />
                    <Route path="sessions" element={<SessionManagerPage />} />
                    <Route path="devices" element={<TrustedDevicesPage />} />
                    <Route path="recovery" element={<RecoveryCenterPage />} />
                    <Route path="password" element={<PasswordAndMFAPage />} />
                    <Route path="alerts" element={<SecurityAlertsPage />} />
                    <Route path="history" element={<LoginHistoryPage />} />
                    <Route path="policies" element={<SecurityPoliciesPage />} />
                  </Route>
                  <Route path="company" element={<CompanyShell />}>
                    <Route index element={<CompanyOverview />} />
                    <Route path="profile" element={<CompanyProfilePage />} />
                    <Route path="brand" element={<BrandManagementPage />} />
                    <Route path="preferences" element={<PlatformPreferencesPage />} />
                    <Route path="localization" element={<LocalizationCenterPage />} />
                    <Route path="features" element={<FeatureFlagsManagerPage />} />
                    <Route path="modules" element={<ModuleManagerPage />} />
                    <Route path="calendar" element={<CompanyCalendarPage />} />
                    <Route path="metadata" element={<MetadataManagerPage />} />
                  </Route>
                  <Route path="automation" element={<AutomationShell />}>
                    <Route index element={<AutomationOverview />} />
                    <Route path="automations" element={<AutomationsList />} />
                    <Route path="builder" element={<AutomationBuilder />} />
                    <Route path="builder/:id" element={<AutomationBuilder />} />
                    <Route path="schedules" element={<AutomationSchedulesPage />} />
                    <Route path="reminders" element={<AutomationRemindersPage />} />
                    <Route path="escalations" element={<AutomationEscalationsPage />} />
                    <Route path="templates" element={<AutomationTemplatesPage />} />
                    <Route path="history" element={<AutomationHistoryPage />} />
                    <Route path="monitor" element={<AutomationMonitorPage />} />
                  </Route>
                  <Route path="knowledge" element={<KipShell />}>
                    <Route index element={<KnowledgeHome />} />
                    <Route path="chat" element={<KipChatWorkspace />} />
                    <Route path="library" element={<KipDocumentLibrary />} />
                    <Route path="collections" element={<KipCollectionsList />} />
                    <Route path="collections/:id" element={<KipCollectionDetail />} />
                    <Route path="search" element={<KipKnowledgeSearch />} />
                    <Route path="bookmarks" element={<KipBookmarksPage />} />
                    <Route path="history" element={<KipConversationHistory />} />
                  </Route>
                  <Route path="ai" element={<AiShell />}>
                    <Route index element={<AiChat />} />
                    <Route path="recommendations" element={<AiRecommendationsPage />} />
                    <Route path="predictions" element={<AiPredictionsPage />} />
                    <Route path="risks" element={<AiRisksPage />} />
                    <Route path="summaries" element={<AiSummariesPage />} />
                    <Route path="knowledge" element={<AiKnowledgePage />} />
                    <Route path="prompts" element={<AiPromptsPage />} />
                  </Route>
                  <Route path="production" element={<ProductionShell />}>
                    <Route index element={<ProductionOverview />} />
                    <Route path="modules" element={<ProductionModules />} />
                    <Route path="integrations" element={<ProductionIntegrations />} />
                    <Route path="checklist" element={<ProductionChecklist />} />
                    <Route path="releases" element={<ProductionReleases />} />
                    <Route path="history" element={<ProductionHistory />} />
                    <Route path="issues" element={<ProductionIssues />} />
                  </Route>
                  <Route path="profile" element={<ExecutiveProfile />} />
                  <Route path="notifications" element={<ExecutiveNotificationsPage />} />
                </Route>
              </Route>

              <Route element={<AdminOSGate />}>
                <Route path="/admin-os/first-login" element={<AdminOSFirstLogin />} />
                <Route path="/admin-os" element={<AdminOSLayout />}>
                  <Route index element={<AdminOSDashboard />} />
                  <Route path="routing" element={<RoutingOverview />} />
                  <Route path="approvals" element={<ApprovalsInbox />} />
                  <Route path="people-ops" element={<PeopleOpsIndex />} />
                  <Route
                    path="people-ops/new"
                    element={<NotFound />}
                  />
                  <Route path="people-ops/:id" element={<EmployeeDetailPage />} />
                  <Route
                    path="people-ops/:id/edit"
                    element={<NotFound />}
                  />
                  <Route path="people-ops/onboarding" element={<OnboardingQueue />} />
                  <Route path="people-ops/onboarding/new" element={<OnboardingWizard />} />
                  <Route path="people-ops/onboarding/:employeeId" element={<OnboardingDetail />} />
                  <Route path="people-ops/:employeeId/passport" element={<EmployeePassport />} />
                  <Route path="people-ops/:employeeId/passport/print" element={<PassportPrint />} />
                  <Route path="people-ops/movements" element={<MovementCenter />} />
                  <Route path="people-ops/movements/new" element={<MovementWizard />} />
                  <Route path="people-ops/movements/:id" element={<MovementDetail />} />
                  <Route path="people-ops/reporting" element={<ReportingStructure />} />
                  <Route path="people-ops/documents" element={<DocumentsCenter />} />
                  <Route path="people-ops/org" element={<OrganizationIndex />} />
                  <Route path="people-ops/org/chart" element={<OrgChart />} />
                  <Route path="people-ops/org/capacity" element={<CapacityDashboard />} />
                  <Route path="people-ops/org/positions" element={<OpenPositions />} />
                  <Route path="people-ops/org/succession" element={<SuccessionPage />} />
                  <Route path="people-ops/org/planning" element={<WorkforcePlanning />} />
                  <Route path="people-ops/performance" element={<PerformanceIndex />} />
                  <Route path="people-ops/performance/goals" element={<GoalsCenter />} />
                  <Route path="people-ops/performance/reviews" element={<ReviewCenter />} />
                  <Route path="people-ops/performance/recognition" element={<RecognitionCenter />} />
                  <Route path="people-ops/performance/pip" element={<PipCenter />} />
                  <Route path="people-ops/performance/career" element={<CareerGrowth />} />
                  <Route path="people-ops/performance/promotion" element={<PromotionReadinessPage />} />
                  <Route path="people-ops/learning" element={<LearningIndex />} />
                  <Route path="people-ops/learning/catalog" element={<CourseCatalog />} />
                  <Route path="people-ops/learning/paths" element={<LearningPathsPage />} />
                  <Route path="people-ops/learning/enrollments" element={<EnrollmentCenter />} />
                  <Route path="people-ops/learning/skills" element={<SkillsCenter />} />
                  <Route path="people-ops/learning/certifications" element={<CertificationCenter />} />
                  <Route path="people-ops/learning/matrix" element={<DepartmentSkillMatrix />} />
                  <Route path="people-ops/learning/roadmaps" element={<CareerRoadmapsPage />} />
                  <Route path="people-ops/recruitment" element={<RecruitmentIndex />} />
                  <Route path="people-ops/recruitment/requests" element={<HiringRequestCenter />} />
                  <Route path="people-ops/recruitment/candidates" element={<CandidateDirectory />} />
                  <Route path="people-ops/recruitment/candidates/:id" element={<CandidateDetail />} />
                  <Route path="people-ops/recruitment/pipeline" element={<InterviewPipeline />} />
                  <Route path="people-ops/recruitment/applications/:applicationId" element={<InterviewPipeline />} />
                  <Route path="people-ops/recruitment/offers" element={<OfferCenter />} />
                  <Route path="people-ops/recruitment/analytics" element={<RecruitmentAnalytics />} />
                  <Route path="people-ops/recruitment/hire-compensation" element={<HireCompensationPage />} />
                  <Route path="employee/finance-onboarding" element={<EmployeeFinanceOnboarding />} />
                  <Route path="people-ops/attendance" element={<AttendanceIndex />} />
                  <Route path="people-ops/attendance/my" element={<MyAttendance />} />
                  <Route path="people-ops/attendance/leave" element={<LeaveCenter />} />
                  <Route path="people-ops/attendance/shifts" element={<ShiftManagement />} />
                  <Route path="people-ops/attendance/holidays" element={<HolidayCalendar />} />
                  <Route path="people-ops/attendance/corrections" element={<AttendanceCorrections />} />
                  <Route path="people-ops/attendance/availability" element={<WorkforceAvailability />} />
                  <Route path="people-ops/payroll" element={<PayrollIndex />} />
                  <Route path="people-ops/payroll/cycles" element={<PayrollCycles />} />
                  <Route path="people-ops/payroll/cycles/:id" element={<PayrollCycleDetail />} />
                  <Route path="people-ops/payroll/plans" element={<CompensationPlansPage />} />
                  <Route path="people-ops/payroll/salaries" element={<SalaryStructuresPage />} />
                  <Route path="people-ops/payroll/revisions" element={<SalaryRevisionsPage />} />
                  <Route path="people-ops/payroll/bonuses" element={<BonusCenter />} />
                  <Route path="people-ops/payroll/benefits" element={<BenefitsCenter />} />
                  <Route path="people-ops/payroll/reimbursements" element={<ReimbursementCenter />} />
                  <Route
                    path="founder-office"
                    element={<FounderOfficeDashboard />}
                  />
                  <Route
                    path="founder-office/appointments"
                    element={<AppointmentsPanel />}
                  />
                  <Route path="audit" element={<AuditCenter />} />
                  <Route path="departments" element={<DepartmentsIndex />} />
                  <Route path="departments/:id" element={<DepartmentDetail />} />
                  <Route path="departments/:id" element={<DepartmentDetail />} />
                  <Route path="trust-safety" element={<TrustSafetyShell />}>
                    <Route index element={<TsDashboard />} />
                    <Route path="queue" element={<TsCaseQueue />} />
                    <Route path="cases/:id" element={<TsCaseDetail />} />
                    <Route path="appeals" element={<TsAppealsCenter />} />
                    <Route path="policies" element={<TsPolicyReference />} />
                  </Route>
                  <Route path="verification" element={<VerificationShell />}>
                    <Route index element={<VerificationDashboard />} />
                    <Route path="queue" element={<VerApplicationQueue />} />
                    <Route path="applications/:id" element={<VerCaseWorkspace />} />
                    <Route path="badges" element={<VerBadgeManager />} />
                    <Route path="affiliations" element={<VerAffiliationManager />} />
                    <Route path="appeals" element={<VerAppealsCenter />} />
                    <Route path="history" element={<VerHistoryPage />} />
                    <Route path="virtual-world" element={<VerVirtualWorldRequests />} />
                    <Route path="content-review" element={<ContentClassificationQueue />} />
                    <Route path="content-review/:id" element={<ReviewerWorkspace />} />
                  </Route>
                  <Route path="engineering" element={<EngineeringShell />}>
                    <Route index element={<EngDashboard />} />
                    <Route path="projects" element={<EngProjectsPage />} />
                    <Route path="sprints" element={<EngSprintsPage />} />
                    <Route path="board" element={<EngKanbanBoard />} />
                    <Route path="tasks" element={<EngTaskCenter />} />
                    <Route path="bugs" element={<EngBugCenter />} />
                    <Route path="releases" element={<EngReleaseCenter />} />
                    <Route path="design" element={<EngDesignCenter />} />
                    <Route path="docs" element={<EngDocumentationCenter />} />
                    <Route path="reports" element={<EngReports />} />
                  </Route>
                  <Route path="support" element={<SupportShell />}>
                    <Route index element={<SupportDashboardPage />} />
                    <Route path="queue" element={<SupportTicketQueue />} />
                    <Route path="tickets/:id" element={<SupportTicketWorkspace />} />
                    <Route path="sla" element={<SupportSlaDashboard />} />
                    <Route path="analytics" element={<SupportAnalyticsPage />} />
                  </Route>
                  <Route path="finance-legal" element={<FinanceLegalShell />}>
                    <Route index element={<FinPaymentOperations />} />
                    <Route path="dashboard" element={<FinanceDashboard />} />
                    <Route path="budgets" element={<FinBudgetCenter />} />
                    <Route path="expenses" element={<FinExpenseCenter />} />
                    <Route path="invoices" element={<FinInvoiceCenter />} />
                    <Route path="payment-operations" element={<Navigate to="/admin-os/finance-legal" replace />} />
                    <Route path="procurement" element={<FinProcurementCenter />} />
                    <Route path="vendors" element={<FinVendorCenter />} />
                    <Route path="contracts" element={<FinContractCenter />} />
                    <Route path="compliance" element={<FinComplianceDashboard />} />
                    <Route path="creator-payouts" element={<FinCreatorPayoutQueue />} />
                    <Route path="hire-approvals" element={<FinHireApprovals />} />
                    <Route path="new-hire-bank" element={<FinNewHireBankDetails />} />
                    <Route path="wallet-lookup" element={<FinWalletLookup />} />
                  </Route>
                  <Route path="security" element={<SecurityDeptShell />}>
                    <Route index element={<SecurityDashboardPage />} />
                    <Route path="incidents" element={<SecIncidentCenter />} />
                    <Route path="incidents/:id" element={<SecIncidentWorkspace />} />
                    <Route path="threats" element={<SecThreatCenter />} />
                    <Route path="iam" element={<SecIamCenter />} />
                    <Route path="access-reviews" element={<SecAccessReviews />} />
                    <Route path="investigations" element={<SecInvestigationWorkspace />} />
                    <Route path="compliance" element={<SecComplianceDashboard />} />
                    <Route path="analytics" element={<SecAnalytics />} />
                  </Route>
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
                  <Route path="platform/design-system" element={<DesignSystem />} />
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
