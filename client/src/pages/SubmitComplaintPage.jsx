import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const categories = [
  "Infrastructure",
  "Public Services",
  "Corruption",
  "Healthcare",
  "Education",
  "Water & Sanitation",
  "Other"
];

const schema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  category: z.string().min(1),
  subject: z.string().min(10).max(150),
  description: z.string().min(50).max(3000),
  priority: z.enum(["Low", "Medium", "High"])
});

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function SubmitComplaintPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { customerToken, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { priority: "Medium", name: profile?.name || "", email: profile?.email || "" }
  });

  useEffect(() => {
    reset({
      priority: "Medium",
      name: profile?.name || "",
      email: profile?.email || "",
      phone: "",
      category: "",
      subject: "",
      description: ""
    });
  }, [profile, reset]);

  const description = watch("description", "");

  const validateFile = (file) => {
    if (!file) return true;
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) return "Only PDF, JPG, PNG files are allowed";
    if (file.size > 2 * 1024 * 1024) return "File size cannot exceed 2MB";
    return true;
  };

  const onFileChange = (event) => {
    const file = event.target.files?.[0];
    const status = validateFile(file);
    if (status !== true) {
      setError("file", { type: "manual", message: status });
      setFilePreview(null);
      setAttachmentFile(null);
      return;
    }
    setAttachmentFile(file || null);
    if (file && file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const onSubmit = async (values) => {
    if (!customerToken) {
      showToast("Please sign in to file a ticket");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...values };
      if (attachmentFile) {
        payload.attachmentMime = attachmentFile.type;
        payload.attachmentBase64 = await readFileAsBase64(attachmentFile);
      }
      const response = await api.post("/complaints", payload, {
        headers: { "X-Customer-Token": customerToken }
      });
      navigate(`/success?ref=${response.data.ref_number}`, { state: values });
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || "Failed to submit ticket";
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-14 animate-fade-in">
      <div className="dashboard-card p-6 md:p-10 shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">New ticket</h1>
        <p className="text-gray-500 text-sm mt-1">
          Optional PDF or image (max 2MB) is stored with the ticket and appears in the admin case view. Fields are validated server-side.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input className="input-base" {...register("name")} />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input-base" type="email" {...register("email")} />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
            <p className="text-xs text-gray-500 mt-1">Must match the email on your signed-in account.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (India 10-digit)</label>
            <input className="input-base" {...register("phone")} />
            {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="input-base" {...register("category")}>
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input className="input-base" {...register("subject")} />
            {errors.subject && <p className="text-red-600 text-sm mt-1">{errors.subject.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={5} className="input-base" {...register("description")} />
            <p className="text-xs text-gray-500 mt-1">{description.length}/3000 characters</p>
            {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <div className="flex flex-wrap gap-4">
              {["Low", "Medium", "High"].map((priority) => (
                <label key={priority} className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="radio" value={priority} {...register("priority")} />
                  {priority}
                </label>
              ))}
            </div>
            {errors.priority && <p className="text-red-600 text-sm mt-1">{errors.priority.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (optional)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input-base" onChange={onFileChange} />
            {errors.file && <p className="text-red-600 text-sm mt-1">{errors.file.message}</p>}
            {filePreview && <img src={filePreview} alt="preview" className="mt-2 h-24 rounded-lg border border-gray-300" />}
          </div>
          <button type="submit" disabled={loading} className="btn-primary inline-flex items-center gap-2">
            {loading && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" />
              </svg>
            )}
            {loading ? "Submitting…" : "Submit ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}
