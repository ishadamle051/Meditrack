import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Download, Calendar, Activity, Syringe, FilePlus, X, Upload } from "lucide-react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { apiUploadMedicalHistory, apiGetMedicalHistory } from "../../api";
import { toast } from "sonner";

interface MedicalRecord {
  record_id: number;
  file_name: string;
  file_path: string;
  created_at: string;
  uploader_name: string;
}

export default function Prescriptions() {
  const { user } = useAuth();
  const { prescriptions } = useData();
  const [activeTab, setActiveTab] = useState<"prescriptions" | "medical_history">("prescriptions");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter prescriptions by logged-in patient
  const patientRx = prescriptions.filter(p => p.patientId === user?.id);

  // Fetch medical history records
  const fetchHistory = async () => {
    if (!user) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await apiGetMedicalHistory(user.id);
      setMedicalRecords(res);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load medical history");
    }
  };

  useEffect(() => {
    if (activeTab === "medical_history") {
      fetchHistory();
    }
  }, [activeTab, user]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("patient_user_id", user.id);

    try {
      await apiUploadMedicalHistory(fd);
      toast.success("Medical history uploaded successfully");
      await fetchHistory();
      setShowUploadModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#0F172A]" style={{ fontSize: "22px", fontWeight: 700 }}>Medical Records</h1>
          <p className="text-[#64748B] mt-0.5" style={{ fontSize: "14px" }}>Manage your prescriptions and medical history</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-[#FF6B6B] text-white px-5 py-2.5 rounded-xl hover:bg-[#EF4444] transition-all"
          style={{ fontSize: "14px", fontWeight: 600 }}>
          <FilePlus className="w-4 h-4" /> Upload Record
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("prescriptions")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all ${
            activeTab === "prescriptions"
              ? "bg-[#6366F1] text-white border-[#6366F1]"
              : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#6366F1]"
          }`}
          style={{ fontSize: "13px", fontWeight: activeTab === "prescriptions" ? 600 : 400 }}>
          <Syringe className="w-4 h-4" /> Prescriptions
        </button>
        <button
          onClick={() => setActiveTab("medical_history")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all ${
            activeTab === "medical_history"
              ? "bg-[#2EC4B6] text-white border-[#2EC4B6]"
              : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#2EC4B6]"
          }`}
          style={{ fontSize: "13px", fontWeight: activeTab === "medical_history" ? 600 : 400 }}>
          <Activity className="w-4 h-4" /> Medical History
        </button>
      </div>

      {activeTab === "prescriptions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patientRx.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <p className="text-[#334155]" style={{ fontSize: "16px", fontWeight: 600 }}>No prescriptions yet</p>
              <p className="text-[#64748B] mt-1" style={{ fontSize: "14px" }}>
                Prescriptions from your doctors will appear here.
              </p>
            </div>
          ) : (
            patientRx.map((rx, idx) => (
              <motion.div key={rx.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#6366F1] transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#EEF2FF] text-[#6366F1] rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <a
                    href={`http://localhost:5000/uploads/${rx.filePath}`}
                    target="_blank"
                    rel="noreferrer"
                    download={rx.fileName}
                    className="p-2 text-[#94A3B8] hover:text-[#6366F1] hover:bg-[#EEF2FF] rounded-lg transition-all"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>
                <div>
                  <h3 className="text-[#0F172A]" style={{ fontSize: "16px", fontWeight: 700 }}>{rx.diagnosis}</h3>
                  <div className="flex items-center gap-1.5 text-[#64748B] mt-2 mb-1">
                    <span className="w-1.5 h-1.5 bg-[#CBD5E1] rounded-full" />
                    <p style={{ fontSize: "13px" }}>{rx.doctorName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#64748B]">
                    <Calendar className="w-3.5 h-3.5" />
                    <p style={{ fontSize: "13px" }}>{rx.date}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === "medical_history" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicalRecords.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <p className="text-[#334155]" style={{ fontSize: "16px", fontWeight: 600 }}>No medical history uploaded</p>
              <p className="text-[#64748B] mt-1" style={{ fontSize: "14px" }}>
                Upload your previous lab results or medical files here.
              </p>
            </div>
          ) : (
            medicalRecords.map((record, idx) => (
              <motion.div key={record.record_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#2EC4B6] transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#E6FBF9] text-[#2EC4B6] rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6" />
                  </div>
                  <a
                    href={`http://localhost:5000/uploads/${record.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-[#94A3B8] hover:text-[#2EC4B6] hover:bg-[#E6FBF9] rounded-lg transition-all"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>
                <div>
                  <h3 className="text-[#0F172A] truncate" style={{ fontSize: "15px", fontWeight: 600 }} title={record.file_name}>
                    {record.file_name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[#64748B] mt-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <p style={{ fontSize: "12px" }}>
                      {new Date(record.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
                <h3 className="text-[#0F172A]" style={{ fontSize: "18px", fontWeight: 700 }}>Upload Medical Record</h3>
                <button onClick={() => !isUploading && setShowUploadModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 text-center">
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <div
                  onClick={handleUploadClick}
                  className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-8 hover:bg-[#F8FAFC] hover:border-[#6366F1] transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    {isUploading ? (
                      <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent flex items-center justify-center rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-[#6366F1]" />
                    )}
                  </div>
                  <p className="text-[#0F172A] mb-1" style={{ fontSize: "16px", fontWeight: 600 }}>
                    {isUploading ? "Uploading..." : "Click to browse files"}
                  </p>
                  <p className="text-[#94A3B8]" style={{ fontSize: "13px" }}>
                    {isUploading ? "Please wait..." : "PDF, PNG, or JPG (max 10MB)"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}