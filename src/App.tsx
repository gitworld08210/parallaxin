import { lazy, Suspense } from "react";
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
import { MessagesPasscodeGate } from "@/components/messages/MessagesPasscodeGate";

// Eager: critical first-paint routes
import Feed from "./pages/Feed";
import Auth from "./pages/Auth";
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

// Lazy: everything else streams in on demand
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
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
const WalletHome = lazy(() => import("./pages/wallet-os/WalletHome"));
const WalletAnalytics = lazy(() => import("./pages/wallet-os/WalletAnalytics"));
const WalletTransactions = lazy(() => import("./pages/wallet-os/WalletTransactions"));
const WalletPassport = lazy(() => import("./pages/wallet-os/WalletPassport"));
const WalletCoins = lazy(() => import("./pages/wallet-os/WalletCoins"));
const WalletGift = lazy(() => import("./pages/wallet-os/WalletGift"));
const WalletWithdraw = lazy(() => import("./pages/wallet-os/WalletWithdraw"));
const WalletQR = lazy(() => import("./pages/wallet-os/WalletQR"));
const WalletSecurity = lazy(() => import("./pages/wallet-os/WalletSecurity"));
const MyPayslips = lazy(() => import("./pages/MyPayslips"));
const PayslipDetail = lazy(() => import("./pages/PayslipDetail"));
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
const Onboarding = lazy(() => import("./pages/Onboarding"));
const OrganizationOnboarding = lazy(() => import("./pages/OrganizationOnboarding"));

// Aurelix Ads Manager
const AdsLayout = lazy(() => import("./pages/ads/AdsLayout"));
const AdsBusinessCenter = lazy(() => import("./pages/ads/BusinessCenter"));
const AdsDashboard = lazy(() => import("./pages/ads/Dashboard"));
const AdsManager = lazy(() => import("./pages/ads/Manager"));
const AdsCampaignWizard = lazy(() => import("./pages/ads/CampaignWizard"));
const AdsCreatives = lazy(() => import("./pages/ads/Creatives"));
const AdsBilling = lazy(() => import("./pages/ads/Billing"));
const AdsReviewQueue = lazy(() => import("./pages/ads/ReviewQueue"));
const AdsFinanceConsole = lazy(() => import("./pages/ads/FinanceConsole"));


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
const Store = lazy(() => import("./pages/Store"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Certificate = lazy(() => import("./pages/Certificate"));
const CreatorTerms = lazy(() => import("./pages/CreatorTerms"));
import { CreatorGate } from "@/components/creator/CreatorGate";

// Admin OS workspace (Phase 1 foundation)
const AdminOSGate = lazy(() =>
  import("./components/admin-os/AdminOSGate").then((m) => ({ default: m.AdminOSGate })),
);
const AdminOSLayout = lazy(() => import("./components/admin-os/layout/AdminOSLayout"));
const AdminOSDashboard = lazy(() => import("./pages/admin-os/AdminOSDashboard"));
const RoutingOverview = lazy(() => import("./pages/admin-os/RoutingOverview"));
const ApprovalsInbox = lazy(() => import("./pages/admin-os/ApprovalsInbox"));
const AdminOSModulePlaceholder = lazy(() => import("./pages/admin-os/ModulePlaceholder"));
const AdminOSNoAccess = lazy(() => import("./pages/admin-os/AdminOSNoAccess"));
const AdminOSFirstLogin = lazy(() => import("./pages/admin-os/AdminOSFirstLogin"));
const PeopleOpsIndex = lazy(() => import("./pages/admin-os/people-ops/PeopleOpsIndex"));
const EmployeeDetailPage = lazy(() => import("./pages/admin-os/people-ops/EmployeeDetail"));
const EmployeeForm = lazy(() => import("./pages/admin-os/people-ops/EmployeeForm"));
const OnboardingQueue = lazy(() => import("./pages/admin-os/people-ops/OnboardingQueue"));
const OnboardingWizard = lazy(() => import("./pages/admin-os/people-ops/OnboardingWizard"));
const OnboardingDetail = lazy(() => import("./pages/admin-os/people-ops/OnboardingDetail"));
const EmployeePassport = lazy(() => import("./pages/admin-os/people-ops/EmployeePassport"));
const PassportPrint = lazy(() => import("./pages/admin-os/people-ops/PassportPrint"));
const MovementCenter = lazy(() => import("./pages/admin-os/people-ops/MovementCenter"));
const MovementWizard = lazy(() => import("./pages/admin-os/people-ops/MovementWizard"));
const MovementDetail = lazy(() => import("./pages/admin-os/people-ops/MovementDetail"));
const ReportingStructure = lazy(() => import("./pages/admin-os/people-ops/ReportingStructure"));
const DocumentsCenter = lazy(() => import("./pages/admin-os/people-ops/DocumentsCenter"));
const OrganizationIndex = lazy(() => import("./pages/admin-os/people-ops/org/OrganizationIndex"));
const OrgChart = lazy(() => import("./pages/admin-os/people-ops/org/OrgChart"));
const CapacityDashboard = lazy(() => import("./pages/admin-os/people-ops/org/CapacityDashboard"));
const OpenPositions = lazy(() => import("./pages/admin-os/people-ops/org/OpenPositions"));
const SuccessionPage = lazy(() => import("./pages/admin-os/people-ops/org/Succession"));
const WorkforcePlanning = lazy(() => import("./pages/admin-os/people-ops/org/WorkforcePlanning"));
const PerformanceIndex = lazy(() => import("./pages/admin-os/people-ops/performance/PerformanceIndex"));
const GoalsCenter = lazy(() => import("./pages/admin-os/people-ops/performance/GoalsCenter"));
const ReviewCenter = lazy(() => import("./pages/admin-os/people-ops/performance/ReviewCenter"));
const RecognitionCenter = lazy(() => import("./pages/admin-os/people-ops/performance/RecognitionCenter"));
const PipCenter = lazy(() => import("./pages/admin-os/people-ops/performance/PipCenter"));
const CareerGrowth = lazy(() => import("./pages/admin-os/people-ops/performance/CareerGrowth"));
const PromotionReadinessPage = lazy(() => import("./pages/admin-os/people-ops/performance/PromotionReadinessPage"));
const LearningIndex = lazy(() => import("./pages/admin-os/people-ops/learning/LearningIndex"));
const CourseCatalog = lazy(() => import("./pages/admin-os/people-ops/learning/CourseCatalog"));
const LearningPathsPage = lazy(() => import("./pages/admin-os/people-ops/learning/LearningPaths"));
const EnrollmentCenter = lazy(() => import("./pages/admin-os/people-ops/learning/EnrollmentCenter"));
const SkillsCenter = lazy(() => import("./pages/admin-os/people-ops/learning/SkillsCenter"));
const CertificationCenter = lazy(() => import("./pages/admin-os/people-ops/learning/CertificationCenter"));
const DepartmentSkillMatrix = lazy(() => import("./pages/admin-os/people-ops/learning/DepartmentSkillMatrix"));
const CareerRoadmapsPage = lazy(() => import("./pages/admin-os/people-ops/learning/CareerRoadmaps"));
const RecruitmentIndex = lazy(() => import("./pages/admin-os/people-ops/recruitment/RecruitmentIndex"));
const HiringRequestCenter = lazy(() => import("./pages/admin-os/people-ops/recruitment/HiringRequestCenter"));
const CandidateDirectory = lazy(() => import("./pages/admin-os/people-ops/recruitment/CandidateDirectory"));
const CandidateDetail = lazy(() => import("./pages/admin-os/people-ops/recruitment/CandidateDetail"));
const InterviewPipeline = lazy(() => import("./pages/admin-os/people-ops/recruitment/InterviewPipeline"));
const OfferCenter = lazy(() => import("./pages/admin-os/people-ops/recruitment/OfferCenter"));
const RecruitmentAnalytics = lazy(() => import("./pages/admin-os/people-ops/recruitment/RecruitmentAnalytics"));
const AttendanceIndex = lazy(() => import("./pages/admin-os/people-ops/attendance/AttendanceIndex"));
const MyAttendance = lazy(() => import("./pages/admin-os/people-ops/attendance/MyAttendance"));
const LeaveCenter = lazy(() => import("./pages/admin-os/people-ops/attendance/LeaveCenter"));
const ShiftManagement = lazy(() => import("./pages/admin-os/people-ops/attendance/ShiftManagement"));
const HolidayCalendar = lazy(() => import("./pages/admin-os/people-ops/attendance/HolidayCalendar"));
const AttendanceCorrections = lazy(() => import("./pages/admin-os/people-ops/attendance/AttendanceCorrections"));
const WorkforceAvailability = lazy(() => import("./pages/admin-os/people-ops/attendance/WorkforceAvailability"));
const PayrollIndex = lazy(() => import("./pages/admin-os/people-ops/payroll/PayrollIndex"));
const PayrollCycles = lazy(() => import("./pages/admin-os/people-ops/payroll/PayrollCycles"));
const PayrollCycleDetail = lazy(() => import("./pages/admin-os/people-ops/payroll/PayrollCycleDetail"));
const CompensationPlansPage = lazy(() => import("./pages/admin-os/people-ops/payroll/CompensationPlansPage"));
const SalaryStructuresPage = lazy(() => import("./pages/admin-os/people-ops/payroll/SalaryStructuresPage"));
const SalaryRevisionsPage = lazy(() => import("./pages/admin-os/people-ops/payroll/SalaryRevisionsPage"));
const BonusCenter = lazy(() => import("./pages/admin-os/people-ops/payroll/BonusCenter"));
const BenefitsCenter = lazy(() => import("./pages/admin-os/people-ops/payroll/BenefitsCenter"));
const ReimbursementCenter = lazy(() => import("./pages/admin-os/people-ops/payroll/ReimbursementCenter"));
// Executive Workspace (Phase 3.1)
const ExecutiveGate = lazy(() =>
  import("./components/admin-os/executive/ExecutiveGate").then((m) => ({ default: m.ExecutiveGate })),
);
const ExecutiveLayout = lazy(() => import("./components/admin-os/executive/ExecutiveLayout"));
const ExecutiveDashboard = lazy(() => import("./pages/admin-os/executive/ExecutiveDashboard"));
const ExecutiveProfile = lazy(() => import("./pages/admin-os/executive/ExecutiveProfile"));
// Phase 3.9 — Founder Office Security & Identity
const SecurityShell = lazy(() => import("./pages/admin-os/executive/security/SecurityShell"));
const SecurityOverview = lazy(() => import("./pages/admin-os/executive/security/SecurityOverview"));
const IdentityProfile = lazy(() => import("./pages/admin-os/executive/security/IdentityProfile"));
const SessionManagerPage = lazy(() => import("./pages/admin-os/executive/security/SessionManager"));
const TrustedDevicesPage = lazy(() => import("./pages/admin-os/executive/security/TrustedDevices"));
const RecoveryCenterPage = lazy(() => import("./pages/admin-os/executive/security/RecoveryCenter"));
const PasswordAndMFAPage = lazy(() => import("./pages/admin-os/executive/security/PasswordAndMFA"));
const SecurityAlertsPage = lazy(() => import("./pages/admin-os/executive/security/SecurityAlerts"));
const LoginHistoryPage = lazy(() => import("./pages/admin-os/executive/security/LoginHistory"));
const SecurityPoliciesPage = lazy(() => import("./pages/admin-os/executive/security/SecurityPolicies"));
const ExecutivePlaceholders = () => import("./pages/admin-os/executive/ExecutivePlaceholders");
const ExecutiveInbox = lazy(() => import("./pages/admin-os/executive/ExecutiveInbox"));
const ExecutiveApprovalDetail = lazy(() => import("./pages/admin-os/executive/ExecutiveApprovalDetail"));

const ExecutiveDepartments = lazy(() => ExecutivePlaceholders().then((m) => ({ default: m.ExecutiveDepartments })));
const ExecutiveEmployees = lazy(() => ExecutivePlaceholders().then((m) => ({ default: m.ExecutiveEmployees })));
const ExecutiveReports = lazy(() => ExecutivePlaceholders().then((m) => ({ default: m.ExecutiveReports })));
const DecisionLogPage = lazy(() => import("./pages/admin-os/executive/DecisionLog"));
// Phase 3.8 — Company Configuration & Global Settings
const CompanyShell = lazy(() => import("./pages/admin-os/executive/company/CompanyShell"));
const CompanyOverview = lazy(() => import("./pages/admin-os/executive/company/CompanyOverview"));
const CompanyProfilePage = lazy(() => import("./pages/admin-os/executive/company/CompanyProfile"));
const BrandManagementPage = lazy(() => import("./pages/admin-os/executive/company/BrandManagement"));
const PlatformPreferencesPage = lazy(() => import("./pages/admin-os/executive/company/PlatformPreferences"));
const LocalizationCenterPage = lazy(() => import("./pages/admin-os/executive/company/LocalizationCenter"));
const FeatureFlagsManagerPage = lazy(() => import("./pages/admin-os/executive/company/FeatureFlagsManager"));
const ModuleManagerPage = lazy(() => import("./pages/admin-os/executive/company/ModuleManager"));
const CompanyCalendarPage = lazy(() => import("./pages/admin-os/executive/company/CompanyCalendar"));
const MetadataManagerPage = lazy(() => import("./pages/admin-os/executive/company/MetadataManager"));
// Phase 3.10 — Automation
const AutomationShell = lazy(() => import("./pages/admin-os/executive/automation/AutomationShell"));
const AutomationOverview = lazy(() => import("./pages/admin-os/executive/automation/AutomationOverview"));
const AutomationsList = lazy(() => import("./pages/admin-os/executive/automation/AutomationsList"));
const AutomationBuilder = lazy(() => import("./pages/admin-os/executive/automation/AutomationBuilder"));
const AutomationSchedulesPage = lazy(() => import("./pages/admin-os/executive/automation/SchedulesPage"));
const AutomationRemindersPage = lazy(() => import("./pages/admin-os/executive/automation/RemindersPage"));
const AutomationEscalationsPage = lazy(() => import("./pages/admin-os/executive/automation/EscalationsPage"));
const AutomationTemplatesPage = lazy(() => import("./pages/admin-os/executive/automation/TemplatesPage"));
const AutomationHistoryPage = lazy(() => import("./pages/admin-os/executive/automation/HistoryPage"));
const AutomationMonitorPage = lazy(() => import("./pages/admin-os/executive/automation/MonitorPage"));
// Phase 3.11 — Executive AI
const AiShell = lazy(() => import("./pages/admin-os/executive/ai/AiShell"));
const AiChat = lazy(() => import("./pages/admin-os/executive/ai/AiChat"));
const AiRecommendationsPage = lazy(() => import("./pages/admin-os/executive/ai/RecommendationsPage"));
const AiPredictionsPage = lazy(() => import("./pages/admin-os/executive/ai/PredictionsPage"));
const AiRisksPage = lazy(() => import("./pages/admin-os/executive/ai/RisksPage"));
const AiSummariesPage = lazy(() => import("./pages/admin-os/executive/ai/SummariesPage"));
const AiKnowledgePage = lazy(() => import("./pages/admin-os/executive/ai/KnowledgeSearchPage"));
const AiPromptsPage = lazy(() => import("./pages/admin-os/executive/ai/PromptsPage"));
// Phase 3.12 — Production Readiness
const ProductionShell = lazy(() => import("./pages/admin-os/executive/production/ProductionShell"));
const ProductionOverview = lazy(() => import("./pages/admin-os/executive/production/ProductionOverview"));
const ProductionModules = lazy(() => import("./pages/admin-os/executive/production/ModuleHealthPage"));
const ProductionIntegrations = lazy(() => import("./pages/admin-os/executive/production/IntegrationsPage"));
const ProductionChecklist = lazy(() => import("./pages/admin-os/executive/production/ReleaseChecklist"));
const ProductionReleases = lazy(() => import("./pages/admin-os/executive/production/ReleasesPage"));
const ProductionHistory = lazy(() => import("./pages/admin-os/executive/production/ValidationHistoryPage"));
const ProductionIssues = lazy(() => import("./pages/admin-os/executive/production/IssueTrackerPage"));
// Phase 3.11 — KIP (Knowledge Intelligence Platform)
const KipShell = lazy(() => import("./pages/admin-os/executive/knowledge/KipShell"));
const KnowledgeHome = lazy(() => import("./pages/admin-os/executive/knowledge/KnowledgeHome"));
const KipChatWorkspace = lazy(() => import("./pages/admin-os/executive/knowledge/ChatWorkspace"));
const KipDocumentLibrary = lazy(() => import("./pages/admin-os/executive/knowledge/DocumentLibrary"));
const KipCollectionsList = lazy(() => import("./pages/admin-os/executive/knowledge/CollectionsList"));
const KipCollectionDetail = lazy(() => import("./pages/admin-os/executive/knowledge/CollectionDetail"));
const KipKnowledgeSearch = lazy(() => import("./pages/admin-os/executive/knowledge/KnowledgeSearch"));
const KipBookmarksPage = lazy(() => import("./pages/admin-os/executive/knowledge/BookmarksPage"));
const KipConversationHistory = lazy(() => import("./pages/admin-os/executive/knowledge/ConversationHistory"));
const ExecutiveNotificationsPage = lazy(() => ExecutivePlaceholders().then((m) => ({ default: m.ExecutiveNotifications })));
// Phase 3.4 — Governance
const GovernanceIndex = lazy(() => import("./pages/admin-os/executive/governance/GovernanceIndex"));
const PolicyCenter = lazy(() => import("./pages/admin-os/executive/governance/PolicyCenter"));
const PolicyDetail = lazy(() => import("./pages/admin-os/executive/governance/PolicyDetail"));
const AuthorityMatrixPage = lazy(() => import("./pages/admin-os/executive/governance/AuthorityMatrix"));
const ApprovalMatrixPage = lazy(() => import("./pages/admin-os/executive/governance/ApprovalMatrix"));
const DelegationCenter = lazy(() => import("./pages/admin-os/executive/governance/DelegationCenter"));
const DepartmentCharters = lazy(() => import("./pages/admin-os/executive/governance/DepartmentCharters"));
const GovernanceSearchPage = lazy(() => import("./pages/admin-os/executive/governance/GovernanceSearch"));
// Phase 3.5 — Strategic Decisions
const DecisionCenter = lazy(() => import("./pages/admin-os/executive/decisions/DecisionCenter"));
const DecisionEditor = lazy(() => import("./pages/admin-os/executive/decisions/DecisionEditor"));
const DecisionDetail = lazy(() => import("./pages/admin-os/executive/decisions/DecisionDetail"));
const DecisionSearchPage = lazy(() => import("./pages/admin-os/executive/decisions/DecisionSearch"));

// Phase 3.6 — Executive Reports & Analytics
const ReportsShell = lazy(() => import("./pages/admin-os/executive/reports/ReportsHome"));
const ReportsOverview = lazy(() => import("./pages/admin-os/executive/reports/ReportsOverview"));
const AnalyticsCenter = lazy(() => import("./pages/admin-os/executive/reports/AnalyticsCenter"));
const ScorecardsPage = lazy(() => import("./pages/admin-os/executive/reports/ScorecardsPage"));
const TrendAnalysis = lazy(() => import("./pages/admin-os/executive/reports/TrendAnalysis"));
const ReportLibrary = lazy(() => import("./pages/admin-os/executive/reports/ReportLibrary"));
const ScheduledReportsPage = lazy(() => import("./pages/admin-os/executive/reports/ScheduledReports"));
const ExportCenterPage = lazy(() => import("./pages/admin-os/executive/reports/ExportCenter"));
const DepartmentReportCompliance = lazy(() => import("./pages/admin-os/executive/reports/DepartmentReportCompliance"));

// Phase 3.7 — Executive Command Center
const CommandShell = lazy(() => import("./pages/admin-os/executive/command/CommandShell"));
const CommandOverview = lazy(() => import("./pages/admin-os/executive/command/CommandOverview"));
const EmergencyPanel = lazy(() => import("./pages/admin-os/executive/command/EmergencyPanel"));
const MaintenanceCenterPage = lazy(() => import("./pages/admin-os/executive/command/MaintenanceCenter"));
const AnnouncementCenterPage = lazy(() => import("./pages/admin-os/executive/command/AnnouncementCenter"));
const BroadcastCenterPage = lazy(() => import("./pages/admin-os/executive/command/BroadcastCenter"));
const SystemStatusDashboard = lazy(() => import("./pages/admin-os/executive/command/SystemStatusDashboard"));
const IncidentCenterPage = lazy(() => import("./pages/admin-os/executive/command/IncidentCenter"));
const ContinuityCenterPage = lazy(() => import("./pages/admin-os/executive/command/ContinuityCenter"));
const LockdownPanelPage = lazy(() => import("./pages/admin-os/executive/command/LockdownPanel"));
const WatchlistPanelPage = lazy(() => import("./pages/admin-os/executive/command/WatchlistPanel"));
const FounderOfficeDashboard = lazy(
  () => import("./pages/admin-os/founder-office/FounderOfficeDashboard"),
);
const AppointmentsPanel = lazy(
  () => import("./pages/admin-os/founder-office/AppointmentsPanel"),
);
const AuditCenter = lazy(() => import("./pages/admin-os/audit/AuditCenter"));
const DepartmentsIndex = lazy(
  () => import("./pages/admin-os/departments/DepartmentsIndex"),
);
const DepartmentDetail = lazy(
  () => import("./pages/admin-os/departments/DepartmentDetail"),
);
// Phase 4.1 — Trust & Safety
const TrustSafetyShell = lazy(() => import("./pages/admin-os/trust-safety/TrustSafetyShell"));
const TsDashboard = lazy(() => import("./pages/admin-os/trust-safety/TsDashboard"));
const TsCaseQueue = lazy(() => import("./pages/admin-os/trust-safety/CaseQueue"));
const TsCaseDetail = lazy(() => import("./pages/admin-os/trust-safety/CaseDetail"));
const TsAppealsCenter = lazy(() => import("./pages/admin-os/trust-safety/AppealsCenter"));
const TsPolicyReference = lazy(() => import("./pages/admin-os/trust-safety/PolicyReference"));
// Phase 4.2 — Verification
const VerificationShell = lazy(() => import("./pages/admin-os/verification/VerificationShell"));
const VerificationDashboard = lazy(() => import("./pages/admin-os/verification/VerificationDashboard"));
const VerApplicationQueue = lazy(() => import("./pages/admin-os/verification/ApplicationQueue"));
const VerCaseWorkspace = lazy(() => import("./pages/admin-os/verification/CaseWorkspace"));
const VerBadgeManager = lazy(() => import("./pages/admin-os/verification/BadgeManager"));
const VerAffiliationManager = lazy(() => import("./pages/admin-os/verification/AffiliationManager"));
const VerAppealsCenter = lazy(() => import("./pages/admin-os/verification/AppealsCenter"));
const VerHistoryPage = lazy(() => import("./pages/admin-os/verification/VerificationHistory"));
// Phase 4.3 — Support
const SupportShell = lazy(() => import("./pages/admin-os/support/SupportShell"));
const SupportDashboardPage = lazy(() => import("./pages/admin-os/support/SupportDashboard"));
const SupportTicketQueue = lazy(() => import("./pages/admin-os/support/TicketQueue"));
const SupportTicketWorkspace = lazy(() => import("./pages/admin-os/support/TicketWorkspace"));
const SupportSlaDashboard = lazy(() => import("./pages/admin-os/support/SlaDashboard"));
const SupportAnalyticsPage = lazy(() => import("./pages/admin-os/support/SupportAnalytics"));

const EngineeringShell = lazy(() => import("./pages/admin-os/engineering/EngineeringShell"));
const EngDashboard = lazy(() => import("./pages/admin-os/engineering/EngDashboard"));
const EngProjectsPage = lazy(() => import("./pages/admin-os/engineering/ProjectsPage"));
const EngSprintsPage = lazy(() => import("./pages/admin-os/engineering/SprintsPage"));
const EngKanbanBoard = lazy(() => import("./pages/admin-os/engineering/KanbanBoard"));
const EngTaskCenter = lazy(() => import("./pages/admin-os/engineering/TaskCenter"));
const EngBugCenter = lazy(() => import("./pages/admin-os/engineering/BugCenter"));
const EngReleaseCenter = lazy(() => import("./pages/admin-os/engineering/ReleaseCenter"));
const EngDesignCenter = lazy(() => import("./pages/admin-os/engineering/DesignCenter"));
const EngDocumentationCenter = lazy(() => import("./pages/admin-os/engineering/DocumentationCenter"));
const EngReports = lazy(() => import("./pages/admin-os/engineering/EngReports"));

const FinanceLegalShell = lazy(() => import("./pages/admin-os/finance-legal/FinanceLegalShell"));
const FinanceDashboard = lazy(() => import("./pages/admin-os/finance-legal/FinanceDashboard"));
const FinBudgetCenter = lazy(() => import("./pages/admin-os/finance-legal/BudgetCenter"));
const FinExpenseCenter = lazy(() => import("./pages/admin-os/finance-legal/ExpenseCenter"));
const FinInvoiceCenter = lazy(() => import("./pages/admin-os/finance-legal/InvoiceCenter"));
const FinProcurementCenter = lazy(() => import("./pages/admin-os/finance-legal/ProcurementCenter"));
const FinVendorCenter = lazy(() => import("./pages/admin-os/finance-legal/VendorCenter"));
const FinContractCenter = lazy(() => import("./pages/admin-os/finance-legal/ContractCenter"));
const FinComplianceDashboard = lazy(() => import("./pages/admin-os/finance-legal/ComplianceDashboard"));
const FinCreatorPayoutQueue = lazy(() => import("./pages/admin-os/finance-legal/CreatorPayoutQueue"));
const FinHireApprovals = lazy(() => import("./pages/admin-os/finance-legal/HireApprovals"));
const FinNewHireBankDetails = lazy(() => import("./pages/admin-os/finance-legal/NewHireBankDetails"));
const HireCompensationPage = lazy(() => import("./pages/admin-os/people-ops/recruitment/HireCompensation"));
const EmployeeFinanceOnboarding = lazy(() => import("./pages/admin-os/employee/FinanceOnboardingForm"));
const SecurityDeptShell = lazy(() => import("./pages/admin-os/security/SecurityShell"));
const SecurityDashboardPage = lazy(() => import("./pages/admin-os/security/SecurityDashboard"));
const SecIncidentCenter = lazy(() => import("./pages/admin-os/security/IncidentCenter"));
const SecIncidentWorkspace = lazy(() => import("./pages/admin-os/security/IncidentWorkspace"));
const SecThreatCenter = lazy(() => import("./pages/admin-os/security/ThreatCenter"));
const SecIamCenter = lazy(() => import("./pages/admin-os/security/IamCenter"));
const SecAccessReviews = lazy(() => import("./pages/admin-os/security/AccessReviews"));
const SecInvestigationWorkspace = lazy(() => import("./pages/admin-os/security/InvestigationWorkspace"));
const SecComplianceDashboard = lazy(() => import("./pages/admin-os/security/ComplianceDashboard"));
const SecAnalytics = lazy(() => import("./pages/admin-os/security/SecurityAnalytics"));
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
const DesignSystem = lazy(() => import("./pages/admin-os/platform/DesignSystem"));



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
              <Route path="/unsubscribe" element={<Unsubscribe />} />
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
                  <Route path="/wallet" element={<WalletHome />} />
                  <Route path="/wallet/legacy" element={<Wallet />} />
                  <Route path="/wallet/analytics" element={<WalletAnalytics />} />
                  <Route path="/wallet/transactions" element={<WalletTransactions />} />
                  <Route path="/wallet/passport" element={<WalletPassport />} />
                  <Route path="/wallet/coins" element={<WalletCoins />} />
                  <Route path="/wallet/gift" element={<WalletGift />} />
                  <Route path="/wallet/withdraw" element={<WalletWithdraw />} />
                  <Route path="/wallet/qr" element={<WalletQR />} />
                  <Route path="/wallet/security" element={<WalletSecurity />} />
                  <Route path="/wallet/payslips" element={<MyPayslips />} />
                  <Route path="/wallet/payslips/:itemId" element={<PayslipDetail />} />
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
                  <Route path="/creator/studio" element={<CreatorGate><CreatorStudio /></CreatorGate>} />
                  <Route path="/news" element={<CreatorNews />} />
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
                    element={<EmployeeForm mode="create" />}
                  />
                  <Route path="people-ops/:id" element={<EmployeeDetailPage />} />
                  <Route
                    path="people-ops/:id/edit"
                    element={<EmployeeForm mode="edit" />}
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
                    <Route index element={<FinanceDashboard />} />
                    <Route path="budgets" element={<FinBudgetCenter />} />
                    <Route path="expenses" element={<FinExpenseCenter />} />
                    <Route path="invoices" element={<FinInvoiceCenter />} />
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
