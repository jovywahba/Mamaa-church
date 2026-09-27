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

export type AuditPerson = { full_name: string; username: string } | null;

// ---- خدمات الأسر ----
export type FamilyChild = {
  id: string;
  name: string;
  age: number | null;
  education_stage: string | null;
  sort_order: number;
};

export type FamilyCase = {
  id: string;
  father_name: string | null;
  father_age: number | null;
  father_job: string | null;
  mother_name: string | null;
  mother_age: number | null;
  mother_job: string | null;
  address: string | null;
  notes: string | null;
  other_assistance: string | null;
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
  created_at: string;
  total_count: number;
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
  created_at: string;
  updated_at: string;
  children: DonationChild[];
  categories: LookupOption[];
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
