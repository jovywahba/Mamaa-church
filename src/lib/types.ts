export type Role = "admin" | "staff";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  is_active: boolean;
};

export type LookupOption = {
  id: string;
  code: string;
  name_ar: string;
  sort_order: number;
  is_other: boolean;
};

/** نوع التبرع — «نقدي» (is_cash) requires an amount. */
export type DonationTypeOption = LookupOption & { is_cash: boolean };

export type AuditPerson = { full_name: string; username: string } | null;

// ---- خدمات الأسر ----
export type FamilyChild = {
  id: string;
  name: string;
  age: number | null;
  birth_year: number | null;
  education_stage: string | null;
  sort_order: number;
};

export type FamilyCase = {
  id: string;
  father_name: string | null;
  father_age: number | null;
  father_birth_year: number | null;
  father_job: string | null;
  mother_name: string | null;
  mother_age: number | null;
  mother_birth_year: number | null;
  mother_job: string | null;
  address: string | null;
  notes: string | null;
  other_assistance: string | null;
  service_date: string | null;
  expense_amount: number | null;
  /** «الخادم / المتبرع» — who carried out or funded the service. */
  servant_name: string | null;
  /** Original "نوع الخدمة" wording for records imported from the old forms. */
  source_service_type: string | null;
  /** Original form submission time for imported records. */
  source_recorded_at: string | null;
  created_at: string;
  updated_at: string;
  children: FamilyChild[];
  phones: { id: string; phone: string; sort_order: number }[];
  types: LookupOption[];
  creator: AuditPerson;
  updater: AuditPerson;
};

export type FamilyListRow = {
  id: string;
  father_name: string | null;
  mother_name: string | null;
  address: string | null;
  children_count: number;
  phones: string[];
  type_names: string[];
  servant_name: string | null;
  service_date: string | null;
  expense_amount: number | null;
  created_at: string;
  total_count: number;
  /** Sum of expense_amount over all rows matching the filters. */
  total_expense: number | null;
};

// ---- التبرعات ----
export type DonationChild = {
  id: string;
  name: string;
  age: number | null;
  birth_year: number | null;
  job: string | null;
  sort_order: number;
};

export type DonationCase = {
  id: string;
  father_name: string | null;
  father_age: number | null;
  father_birth_year: number | null;
  father_job: string | null;
  mother_name: string | null;
  mother_age: number | null;
  mother_birth_year: number | null;
  mother_job: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  notes: string | null;
  referred_by: string | null;
  other_category: string | null;
  additional_notes: string | null;
  donation_date: string | null;
  cash_amount: number | null;
  other_donation_type: string | null;
  created_at: string;
  updated_at: string;
  children: DonationChild[];
  categories: LookupOption[];
  donation_types: DonationTypeOption[];
  creator: AuditPerson;
  updater: AuditPerson;
};

export type DonationListRow = {
  id: string;
  father_name: string | null;
  mother_name: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  referred_by: string | null;
  children_count: number;
  category_names: string[];
  donation_date: string | null;
  donation_type_names: string[];
  cash_amount: number | null;
  created_at: string;
  total_count: number;
};

export type SearchResult = {
  kind: "family" | "donation";
  id: string;
  father_name: string | null;
  mother_name: string | null;
  details: string | null;
  created_at: string;
};

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };
