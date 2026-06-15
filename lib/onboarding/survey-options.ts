export const SURVEY_ROLE_OPTIONS = [
    { id: "founder_owner", label: "Founder / Owner" },
    { id: "finance_accounting", label: "Finance / Accounting" },
    { id: "ops", label: "Operations" },
    { id: "data_analyst", label: "Data / Analyst" },
    { id: "developer", label: "Developer" },
    { id: "other", label: "Other" },
] as const;

export const SURVEY_PROBLEM_OPTIONS = [
    { id: "reporting_dashboards", label: "Reporting & dashboards" },
    { id: "reconciliation", label: "Reconciliation" },
    { id: "investor_board", label: "Investor / board updates" },
    { id: "tax_bookkeeping", label: "Tax / bookkeeping" },
    { id: "export_tools", label: "Export to other tools" },
    { id: "other", label: "Other" },
] as const;

export type SurveyRoleId = (typeof SURVEY_ROLE_OPTIONS)[number]["id"];
export type SurveyProblemId = (typeof SURVEY_PROBLEM_OPTIONS)[number]["id"];

export type SurveyStep = "q1" | "q2" | "done";
