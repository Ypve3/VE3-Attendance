export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface Department {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  createdAt: string;
  hasFace: boolean;
  hasPin: boolean;
  photo: string | null;
  consentAt: string | null;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  status: string;
  method: string;
  matchConfidence: number | null;
  checkInTime: string;
  date: string;
}

export interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  date: string;
  faceRegistered: number;
}

export interface MonthlySummaryRow {
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  presentDays: number;
  lateDays: number;
  workingDays: number;
  absentDays: number;
}

export interface FaceProfile {
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  descriptor: number[];
}

export interface ExportFile {
  filename: string;
  format: string;
  generatedAt: string;
  url: string;
  recordCount: number;
}

export interface Visitor {
  id: number;
  name: string;
  purpose: string | null;
  companyName: string | null;
  hostName: string | null;
  signature: string | null;
  visitDate: string;
  checkInTime: string;
}

export interface AuditLog {
  id: number;
  actorName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export interface Regularization {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  reason: string;
  status: string;
  requestedByName: string | null;
  reviewedByName: string | null;
  createdAt: string;
}

function currentUserId(): string {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem("attendance_user");
  try {
    return raw ? String(JSON.parse(raw).id) : "";
  } catch {
    return "";
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": currentUserId(),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<AppUser>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) }),

  // Users (admin)
  listUsers: () => request<AppUser[]>("/api/users"),
  createUser: (data: { name: string; email: string; password: string; role: "admin" | "user" }) =>
    request<AppUser>("/api/users", { method: "POST", body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<void>(`/api/users/${id}`, { method: "DELETE" }),

  // Departments
  listDepartments: () => request<Department[]>("/api/departments"),
  createDepartment: (name: string) =>
    request<Department>("/api/departments", { method: "POST", body: JSON.stringify({ name }) }),
  deleteDepartment: (id: number) => request<void>(`/api/departments/${id}`, { method: "DELETE" }),

  // Settings
  getSettings: () => request<Record<string, string>>("/api/settings"),
  updateSettings: (values: Record<string, string>) =>
    request<Record<string, string>>("/api/settings", { method: "PUT", body: JSON.stringify(values) }),

  // Employees
  listEmployees: () => request<Employee[]>("/api/employees"),
  createEmployee: (data: { name: string; departmentId?: number | null }) =>
    request<Employee & { generatedPin: string }>("/api/employees", { method: "POST", body: JSON.stringify(data) }),
  deleteEmployee: (id: number) => request<void>(`/api/employees/${id}`, { method: "DELETE" }),
  importEmployees: (rows: { name: string; department?: string }[]) =>
    request<{ created: number; skipped: number }>("/api/employees/import", {
      method: "POST",
      body: JSON.stringify({ rows }),
    }),
  registerFace: (id: number, descriptor: number[], photo: string) =>
    request<Employee>(`/api/employees/${id}/face`, {
      method: "POST",
      body: JSON.stringify({ descriptor, photo }),
    }),
  deleteFace: (id: number) => request<void>(`/api/employees/${id}/face`, { method: "DELETE" }),
  setPin: (id: number, pin: string) =>
    request<{ ok: boolean }>(`/api/employees/${id}/pin`, { method: "POST", body: JSON.stringify({ pin }) }),
  listFaceProfiles: () => request<FaceProfile[]>("/api/face-profiles"),

  // Attendance
  listAttendance: (date?: string) =>
    request<AttendanceRecord[]>(`/api/attendance${date ? `?date=${date}` : ""}`),
  checkIn: (data: { employeeId: number; matchConfidence?: number; method?: string; pin?: string }) =>
    request<AttendanceRecord>("/api/attendance/checkin", { method: "POST", body: JSON.stringify(data) }),
  deleteAttendance: (id: number) => request<void>(`/api/attendance/${id}`, { method: "DELETE" }),
  getStats: () => request<AttendanceStats>("/api/attendance/stats"),
  getMonthlySummary: (month: string) =>
    request<MonthlySummaryRow[]>(`/api/attendance/summary?month=${month}`),
  listExports: () => request<ExportFile[]>("/api/attendance/export"),
  generateExport: () =>
    request<{ xlsx: ExportFile; csv: ExportFile }>("/api/attendance/export/generate", { method: "POST" }),

  // Visitors
  listVisitors: (date?: string) => request<Visitor[]>(`/api/visitors${date ? `?date=${date}` : ""}`),
  visitorCheckIn: (data: {
    name: string;
    purpose?: string;
    companyName?: string;
    hostName?: string;
    signature?: string;
  }) => request<Visitor>("/api/visitors/checkin", { method: "POST", body: JSON.stringify(data) }),
  deleteVisitor: (id: number) => request<void>(`/api/visitors/${id}`, { method: "DELETE" }),

  // Audit (admin)
  listAudit: () => request<AuditLog[]>("/api/audit"),

  // Regularizations
  listRegularizations: () => request<Regularization[]>("/api/regularizations"),
  createRegularization: (data: { employeeId: number; date: string; reason: string }) =>
    request<Regularization>("/api/regularizations", { method: "POST", body: JSON.stringify(data) }),
  reviewRegularization: (id: number, decision: "approved" | "rejected") =>
    request<Regularization>(`/api/regularizations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    }),
};
