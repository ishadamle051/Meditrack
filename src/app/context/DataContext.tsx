import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import {
  apiGetDoctors,
  apiGetPatients,
  apiGetAppointments,
  apiGetPrescriptions,
  apiUpdatePatient,
  apiUpdateDoctor,
  apiAddDoctor,
  apiAddPatient,
} from "../api";

// ── Types (keep same shape as before so all UI components still work) ─────────
export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  email: string;
  phone: string;
  rating: number;
  experience: number;
  patients: number;
  avatar: string;
  status: "active" | "inactive";
  availability: string[];
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: "male" | "female" | string;
  bloodGroup: string;
  assignedDoctorId: string;
  lastVisit: string;
  status: "active" | "inactive";
  initials: string;
  avatarColor: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  type: string;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  prescription?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  appointmentId: string;
  date: string;
  fileName: string;   // original display name (e.g. "report.pdf")
  filePath: string;   // actual disk filename used in /uploads/ URL
  fileSize: string;
  diagnosis: string;
}

interface DataContextType {
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  loading: boolean;
  // Local-state helpers used by admin/doctor components
  updateAppointment: (apt: Appointment) => void;
  addPrescription: (rx: Prescription) => void;
  addPatient: (pat: any) => Promise<void>;
  updatePatient: (pat: Patient) => Promise<void>;
  addDoctor: (doc: any) => Promise<void>;
  updateDoctor: (doc: Doctor) => Promise<void>;
  deletePatient: (id: string) => void;
  deleteDoctor: (id: string) => void;
  // Refresh from backend
  refreshAll: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
  refreshPrescriptions: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

// ── Helper: generate a deterministic avatar URL from a name ──────────────────
function avatarUrl(name: string, bg = "2EC4B6", color = "fff") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=${color}&size=128&bold=true`;
}

// ── Mappers: raw API row → typed frontend object ─────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDoctor(d: any): Doctor {
  return {
    id: String(d.user_id),
    name: d.name ?? "Unknown Doctor",
    specialization: d.specialization ?? "General",
    email: d.email ?? "",
    phone: d.phone ?? "",
    rating: parseFloat(d.rating) || 4.5,
    experience: parseInt(d.experience) || 0,
    patients: parseInt(d.patients_count) || 0,
    avatar: d.avatar ?? avatarUrl(d.name ?? "Doctor", "2EC4B6"),
    status: d.status === "inactive" ? "inactive" : "active",
    availability: d.availability
      ? (typeof d.availability === "string" ? d.availability.split(",") : d.availability)
      : ["Mon", "Tue", "Wed", "Thu", "Fri"],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPatient(p: any): Patient {
  const name = p.name ?? "Unknown Patient";
  return {
    id: String(p.user_id),
    name,
    email: p.email ?? "",
    phone: p.phone ?? "",
    age: parseInt(p.age) || 0,
    gender: (p.gender ?? "other").toLowerCase(),
    bloodGroup: p.blood_group ?? p.bloodGroup ?? "N/A",
    assignedDoctorId: p.assigned_doctor_id ? String(p.assigned_doctor_id) : "",
    lastVisit: p.last_visit ? String(p.last_visit).split("T")[0] : "",
    status: p.status === "inactive" ? "inactive" : "active",
    initials: name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    avatarColor: "#6366F1",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAppointment(a: any): Appointment {
  return {
    id: String(a.appointment_id ?? a.id),
    patientId: String(a.patient_user_id),
    patientName: a.patient_name ?? "",
    doctorId: String(a.doctor_user_id),
    doctorName: a.doctor_name ?? "",
    date: a.date ? String(a.date).split("T")[0] : "",
    time: a.time_slot ?? a.time ?? "",
    type: a.type ?? "General Consultation",
    status: (a.status ?? "pending").toLowerCase() as Appointment["status"],
    notes: a.notes ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPrescription(p: any): Prescription {
  return {
    id: String(p.id),
    patientId: String(p.patient_user_id),
    doctorId: String(p.doctor_user_id),
    doctorName: p.doctor_name ?? "",
    appointmentId: p.appointment_id ? String(p.appointment_id) : "",
    date: p.created_at ? String(p.created_at).split("T")[0] : "",
    fileName: p.file_name ?? "",          // original name for display
    filePath: p.file_path ?? p.file_name ?? "", // disk filename for URL
    fileSize: "–",
    diagnosis: p.diagnosis ?? "General Prescription",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Individual refresh helpers ───────────────────────────────────────────
  const refreshAppointments = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = (await apiGetAppointments()) as any[];
      setAppointments(rows.map(mapAppointment));
    } catch (e) {
      console.error("refreshAppointments:", e);
    }
  }, []);

  const refreshPrescriptions = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = (await apiGetPrescriptions()) as any[];
      setPrescriptions(rows.map(mapPrescription));
    } catch (e) {
      console.error("refreshPrescriptions:", e);
    }
  }, []);

  // ── Full refresh ─────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, pats, apts, rxs] = await Promise.all([
        apiGetDoctors(),
        apiGetPatients(),
        apiGetAppointments(),
        apiGetPrescriptions(),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDoctors((docs as any[]).map(mapDoctor));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPatients((pats as any[]).map(mapPatient));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAppointments((apts as any[]).map(mapAppointment));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPrescriptions((rxs as any[]).map(mapPrescription));
    } catch (e) {
      console.error("refreshAll error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      refreshAll();
    } else {
      // Clear data on logout
      setDoctors([]);
      setPatients([]);
      setAppointments([]);
      setPrescriptions([]);
    }
  }, [isAuthenticated, refreshAll]);

  // ── Local optimistic helpers (used by doctor/admin UI without network wait) ─
  const updateAppointment = (apt: Appointment) =>
    setAppointments(prev => prev.map(a => (a.id === apt.id ? apt : a)));

  const addPrescription = (rx: Prescription) =>
    setPrescriptions(prev => [rx, ...prev]);

  const addPatient = async (p: any) => {
    try {
      await apiAddPatient(p);
      await refreshAll();
    } catch (e) {
      console.error("addPatient error:", e);
      throw e;
    }
  };

  const updatePatient = async (p: Patient) => {
    try {
      await apiUpdatePatient(p.id, p);
      setPatients(prev => prev.map(pt => pt.id === p.id ? p : pt));
    } catch (e) {
      console.error("updatePatient error:", e);
      throw e;
    }
  };

  const addDoctor = async (d: any) => {
    try {
      await apiAddDoctor(d);
      await refreshAll();
    } catch (e) {
      console.error("addDoctor error:", e);
      throw e;
    }
  };

  const updateDoctor = async (d: Doctor) => {
    try {
      await apiUpdateDoctor(d.id, d);
      setDoctors(prev => prev.map(dt => dt.id === d.id ? d : dt));
    } catch (e) {
      console.error("updateDoctor error:", e);
      throw e;
    }
  };

  const deletePatient = (id: string) => setPatients(prev => prev.filter(p => p.id !== id));
  const deleteDoctor = (id: string) => setDoctors(prev => prev.filter(d => d.id !== id));

  return (
    <DataContext.Provider
      value={{
        doctors,
        patients,
        appointments,
        prescriptions,
        loading,
        updateAppointment,
        addPrescription,
        addPatient,
        updatePatient,
        addDoctor,
        updateDoctor,
        deletePatient,
        deleteDoctor,
        refreshAll,
        refreshAppointments,
        refreshPrescriptions,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
