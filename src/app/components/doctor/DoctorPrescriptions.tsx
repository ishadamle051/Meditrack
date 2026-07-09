import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, FileText, Plus, X, Upload, Download, CheckCircle, Calendar, User } from "lucide-react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { apiUploadPrescription } from "../../api";
import { toast } from "sonner";

export default function DoctorPrescriptions() {
  const { user } = useAuth();
  const { prescriptions, patients, refreshPrescriptions } = useData();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // New Prescription Form State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Filter for logged-in doctor
  const myRx = prescriptions.filter(p => p.doctorId === user?.id);

  const filteredRx = myRx.filter(p => {
    const pat = patients.find(pat => pat.id === p.patientId);
    const patName = pat?.name || "";
    return patName.toLowerCase().includes(search.toLowerCase()) ||
           p.diagnosis.toLowerCase().includes(search.toLowerCase());
  });

  filteredRx.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Doctor's active patients for the dropdown
  const myPatientIds = Array.from(new Set(myRx.map(p => p.patientId)));
  const myPatients = patients.filter(p => myPatientIds.includes(p.id) || p.assignedDoctorId === user?.id);
  // Add all patients just in case the doctor needs to prescribe to a new patient
  const allPatients = patients;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedPatientId) {
      toast.error("Please select a patient");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select a prescription file (PDF/Image)");
      return;
    }
    if (!user) return;

    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("doctor_user_id", user.id);
    fd.append("patient_user_id", selectedPatientId);
    fd.append("diagnosis", diagnosis || "General Prescription");

    try {
      await apiUploadPrescription(fd);
      toast.success("Prescription uploaded successfully!");
      setShowModal(false);
      setSelectedFile(null);
      setSelectedPatientId("");
      setDiagnosis("");
      await refreshPrescriptions();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload prescription");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#0F172A]" style={{ fontSize: "22px", fontWeight: 700 }}>Prescriptions</h1>
          <p className="text-[#64748B] mt-0.5" style={{ fontSize: "14px" }}>Manage and upload digital prescriptions</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-[#2EC4B6] text-white px-5 py-2.5 rounded-xl hover:bg-[#209F93] transition-all shadow-[0_4px_12px_rgba(46,196,182,0.25)]"
          style={{ fontSize: "14px", fontWeight: 600 }}>
          <Plus className="w-4 h-4" /> Upload Prescription
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by patient name or diagnosis..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#2EC4B6] transition-all shadow-[0_4px_16px_rgba(0,0,0,0.02)]"
          style={{ fontSize: "14px" }} />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]/50 text-[#64748B]" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th className="font-semibold py-4 px-6">Patient</th>
                <th className="font-semibold py-4 px-6">Diagnosis</th>
                <th className="font-semibold py-4 px-6">Date</th>
                <th className="font-semibold py-4 px-6">Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredRx.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-[#64748B]">
                    <div className="w-16 h-16 bg-[#F8FAFC] rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-[#E2E8F0]" />
                    </div>
                    <span style={{ fontSize: "15px", fontWeight: 500 }}>No prescriptions found</span>
                  </td>
                </tr>
              ) : (
                filteredRx.map(p => {
                  const pat = patients.find(pat => pat.id === p.patientId);
                  return (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-[#F8FAFC] transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E6FBF9] text-[#2EC4B6] flex items-center justify-center font-bold flex-shrink-0" style={{ fontSize: "13px" }}>
                            {pat?.name ? pat.name.split(" ").map(n=>n[0]).join("") : "??"}
                          </div>
                          <div>
                            <p className="text-[#0F172A]" style={{ fontSize: "14px", fontWeight: 600 }}>{pat?.name || "Unknown Patient"}</p>
                            <p className="text-[#64748B]" style={{ fontSize: "12px" }}>{pat?.email || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-[#334155] bg-[#F1F5F9] inline-flex px-3 py-1 rounded-lg" style={{ fontSize: "13px", fontWeight: 500 }}>{p.diagnosis}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-[#64748B] flex items-center gap-1.5" style={{ fontSize: "13px" }}>
                          <Calendar className="w-3.5 h-3.5" /> {p.date}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <a href={`http://localhost:5000/uploads/${p.filePath}`} target="_blank" rel="noreferrer"
                          download={p.fileName}
                          className="flex items-center gap-2 text-[#2EC4B6] hover:text-[#209F93] hover:underline w-fit" style={{ fontSize: "13px", fontWeight: 600 }}>
                          <Download className="w-4 h-4" /> View/Download
                        </a>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <h3 className="text-[#0F172A] flex items-center gap-2" style={{ fontSize: "18px", fontWeight: 700 }}>
                  <Plus className="w-5 h-5 text-[#2EC4B6]" /> Issue Prescription
                </h3>
                <button onClick={() => !isUploading && setShowModal(false)} className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[#334155] mb-1.5" style={{ fontSize: "14px", fontWeight: 600 }}>Select Patient</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <select value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] outline-none focus:border-[#2EC4B6] transition-all appearance-none" style={{ fontSize: "14px" }}>
                      <option value="" disabled>Choose a patient...</option>
                      {allPatients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#334155] mb-1.5" style={{ fontSize: "14px", fontWeight: 600 }}>Diagnosis / Notes</label>
                  <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Viral Fever, Hypertension follow-up"
                    className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#2EC4B6] transition-all" style={{ fontSize: "14px" }} />
                </div>

                <div>
                  <label className="block text-[#334155] mb-1.5" style={{ fontSize: "14px", fontWeight: 600 }}>Attach Prescription File</label>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.png,.jpg,.jpeg" />
                  
                  {selectedFile ? (
                    <div className="flex items-center justify-between p-4 border border-[#2EC4B6] bg-[#E6FBF9] rounded-xl">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <CheckCircle className="w-5 h-5 text-[#2EC4B6] flex-shrink-0" />
                        <span className="text-[#0F172A] truncate font-medium text-sm">{selectedFile.name}</span>
                      </div>
                      <button onClick={() => setSelectedFile(null)} className="text-[#64748B] hover:text-[#EF4444] p-1"><X className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-6 hover:bg-[#F8FAFC] hover:border-[#2EC4B6] transition-all cursor-pointer text-center group">
                      <div className="w-12 h-12 bg-[#EEF2FF] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#E6FBF9] group-hover:text-[#2EC4B6] transition-colors">
                        <Upload className="w-6 h-6 text-[#94A3B8] group-hover:text-[#2EC4B6] transition-colors" />
                      </div>
                      <p className="text-[#0F172A] mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>Click to browse files</p>
                      <p className="text-[#94A3B8]" style={{ fontSize: "12px" }}>PDF, PNG, JPG (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} disabled={isUploading}
                  className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:bg-white hover:text-[#0F172A] transition-all font-medium py-2 text-sm disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleUpload} disabled={isUploading || !selectedPatientId || !selectedFile}
                  className="px-5 py-2.5 rounded-xl bg-[#2EC4B6] text-white hover:bg-[#209F93] transition-all font-medium py-2 text-sm disabled:opacity-50 flex items-center gap-2 shadow-[0_4px_12px_rgba(46,196,182,0.2)]">
                  {isUploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                  {isUploading ? "Uploading..." : "Upload & Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
