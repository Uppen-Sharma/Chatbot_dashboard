import React, { useCallback, useRef, useState } from "react";
import { uploadFile } from "../../services/apiClient";
import { useTranslation } from "react-i18next";
import {
  X,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  CheckCircle2,
  AlertCircle,
  Trash2,
  CloudUpload,
} from "lucide-react";

/* ─── Accepted file config ─────────────────────────────────────── */
const ACCEPTED_EXTENSIONS = [
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".pdf",
];

const ACCEPTED_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/pdf",
]);

const ACCEPTED_INPUT_TYPES =
  ".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf";

function getFileExtension(name) {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

function isFileValid(file) {
  const ext = getFileExtension(file.name);
  const mimeOk = ACCEPTED_MIME_TYPES.has(file.type);
  const extOk = ACCEPTED_EXTENSIONS.includes(ext);
  return mimeOk || extOk;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/* ─── File type metadata ────────────────────────────────────────── */
function getFileMeta(name) {
  const ext = getFileExtension(name);

  if ([".doc", ".docx"].includes(ext)) {
    return {
      Icon: FileText,
      label: "Word",
      bg: "bg-blue-50",
      iconColor: "text-blue-500",
      badgeBg: "bg-blue-100",
      badgeText: "text-blue-700",
    };
  }
  if ([".xls", ".xlsx"].includes(ext)) {
    return {
      Icon: FileSpreadsheet,
      label: "Excel",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      badgeBg: "bg-emerald-100",
      badgeText: "text-emerald-700",
    };
  }
  if ([".ppt", ".pptx"].includes(ext)) {
    return {
      Icon: Presentation,
      label: "PowerPoint",
      bg: "bg-orange-50",
      iconColor: "text-orange-500",
      badgeBg: "bg-orange-100",
      badgeText: "text-orange-700",
    };
  }
  if (ext === ".pdf") {
    return {
      Icon: File,
      label: "PDF",
      bg: "bg-rose-50",
      iconColor: "text-rose-500",
      badgeBg: "bg-rose-100",
      badgeText: "text-rose-700",
    };
  }
  return {
    Icon: File,
    label: ext.replace(".", "").toUpperCase(),
    bg: "bg-gray-50",
    iconColor: "text-gray-400",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-600",
  };
}

/* ─── File row component ────────────────────────────────────────── */
function FileRow({ entry, onRemove }) {
  const meta = getFileMeta(entry.file.name);
  const { Icon } = meta;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E7E9F0] bg-white transition-all duration-200 hover:border-[#D7E4F1] hover:shadow-sm group">
      {/* File type icon */}
      <div
        className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${meta.bg}`}
      >
        <Icon size={20} className={meta.iconColor} />
      </div>

      {/* Name + size */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1E3A5F] truncate">
          {entry.file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${meta.badgeBg} ${meta.badgeText}`}
          >
            {meta.label}
          </span>
          <span className="text-xs text-[#64748B]">
            {formatBytes(entry.file.size)}
          </span>
        </div>
      </div>

      {/* Status or remove */}
      <div className="shrink-0 flex items-center">
        {entry.status === "uploading" && (
          <span className="w-5 h-5 border-2 border-[#E7E9F0] border-t-[#007BC6] rounded-full animate-spin" />
        )}
        {entry.status === "done" && (
          <CheckCircle2 size={20} className="text-emerald-500" />
        )}
        {entry.status === "error" && (
          <AlertCircle size={20} className="text-rose-500" />
        )}
        {entry.status === "idle" && (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            aria-label="Remove file"
          >
            <Trash2 size={15} className="icon-wiggle" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main UploadModal component ───────────────────────────────── */
export default function UploadModal({ isOpen, onClose }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null); // single file entry
  const [invalidFile, setInvalidFile] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [loginType, setLoginType] = useState("pre-login");
  const [showConfirm, setShowConfirm] = useState(false);
  const { t } = useTranslation();

  const pickFile = useCallback((rawFile) => {
    if (!rawFile) return;

    if (!isFileValid(rawFile)) {
      setInvalidFile(rawFile.name);
      setTimeout(() => setInvalidFile(""), 4000);
      return;
    }

    setInvalidFile("");
    setUploadDone(false);
    setFile({
      id: `${rawFile.name}-${rawFile.size}-${Date.now()}`,
      file: rawFile,
      status: "idle",
    });
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      pickFile(e.dataTransfer.files[0]);
    },
    [pickFile],
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files?.length) {
      pickFile(e.target.files[0]);
    }
    // Reset so same file can be re-selected after removal
    e.target.value = "";
  };

  const removeFile = () => {
    setFile(null);
    setUploadDone(false);
  };

  const handleUpload = async (overwrite = false) => {
    if (typeof overwrite !== "boolean") overwrite = false;
    if (!file || isUploading) return;

    setIsUploading(true);
    setUploadDone(false);
    setShowConfirm(false);
    setFile((prev) => ({ ...prev, status: "uploading" }));

    try {
      const result = await uploadFile(file.file, loginType, overwrite);
      if (result?.file_exists) {
        // File already exists — ask user to confirm overwrite
        setFile((prev) => ({ ...prev, status: "idle" }));
        setShowConfirm(true);
      } else {
        setFile((prev) => ({ ...prev, status: "done" }));
        setUploadDone(true);
      }
    } catch {
      setFile((prev) => ({ ...prev, status: "error" }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setFile(null);
    setInvalidFile("");
    setUploadDone(false);
    setIsDragging(false);
    setLoginType("pre-login");
    setShowConfirm(false);
    onClose();
  };

  const canUpload = file?.status === "idle" && !isUploading;

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4 animate-in fade-in duration-200 fill-mode-both">
      {/* Modal card */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E7E9F0] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 fill-mode-both"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E7E9F0]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF5FB] flex items-center justify-center">
              <CloudUpload size={18} className="text-[#007BC6]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-black tracking-tight">
                {t("upload.title")}
              </h2>
              <p className="text-xs text-[#64748B] font-medium mt-0.5">
                {t("upload.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-[#F1F5F9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X size={18} className="icon-wiggle" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col gap-4 p-6">
          {/* Login type selector */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#F1F5F9] border border-[#E7E9F0]">
            {[
              { value: "pre-login", label: t("upload.preLogin") },
              { value: "post-login", label: t("upload.postLogin") },
            ].map(({ value, label }) => (
              <label
                key={value}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg cursor-pointer text-sm font-semibold transition-all duration-200 select-none
                  ${
                    loginType === value
                      ? "bg-white text-[#007BC6] shadow-sm border border-[#D7E4F1]"
                      : "text-[#64748B] hover:text-[#1E3A5F]"
                  }`}
              >
                <input
                  type="radio"
                  name="loginType"
                  value={value}
                  checked={loginType === value}
                  onChange={() => setLoginType(value)}
                  className="sr-only"
                />
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors duration-200
                    ${loginType === value ? "border-[#007BC6]" : "border-[#CBD5E1]"}`}
                >
                  {loginType === value && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007BC6] block" />
                  )}
                </span>
                {label}
              </label>
            ))}
          </div>

          {/* Drag & drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-6 cursor-pointer transition-all duration-200 select-none
              ${
                isDragging
                  ? "border-[#007BC6] bg-[#EEF5FB] scale-[1.01]"
                  : "border-[#D7E4F1] bg-[#F9FCFF] hover:border-[#007BC6] hover:bg-[#EEF5FB]"
              }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_INPUT_TYPES}
              className="hidden"
              onChange={handleInputChange}
            />

            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200 ${isDragging ? "bg-[#007BC6]" : "bg-[#EEF5FB]"}`}
            >
              <UploadCloud
                size={28}
                className={`transition-colors duration-200 ${isDragging ? "text-white" : "text-[#007BC6]"}`}
              />
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-[#1E3A5F]">
                {isDragging ? t("upload.dropHere") : t("upload.dragDrop")}
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                {t("upload.browseOr")}{" "}
                <span className="text-[#007BC6] font-semibold underline-offset-2 hover:underline">
                  {t("upload.browse")}
                </span>
              </p>
            </div>

            {/* Accepted types pill row */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
              {[
                { label: "Word", bg: "bg-blue-100", text: "text-blue-700" },
                {
                  label: "Excel",
                  bg: "bg-emerald-100",
                  text: "text-emerald-700",
                },
                {
                  label: "PowerPoint",
                  bg: "bg-orange-100",
                  text: "text-orange-700",
                },
                { label: "PDF", bg: "bg-rose-100", text: "text-rose-700" },
              ].map(({ label, bg, text }) => (
                <span
                  key={label}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${bg} ${text}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Overwrite confirmation banner */}
          {showConfirm && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle
                  size={16}
                  className="text-amber-500 shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    {t("upload.overwriteTitle")}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {t("upload.overwriteBody")}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-white border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  {t("upload.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => handleUpload(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors"
                >
                  {t("upload.overwriteConfirm")}
                </button>
              </div>
            </div>
          )}

          {/* Invalid file warning */}
          {invalidFile && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle
                size={16}
                className="text-rose-500 shrink-0 mt-0.5"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-rose-700">
                  {t("upload.invalidType")}
                </p>
                <p className="text-xs text-rose-600 mt-0.5 truncate">
                  {invalidFile} — Only Word, Excel, PowerPoint &amp; PDF are
                  accepted.
                </p>
              </div>
            </div>
          )}

          {/* Selected file */}
          {file && <FileRow entry={file} onRemove={removeFile} />}

          {/* Upload done success banner */}
          {uploadDone && file?.status === "done" && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <p className="text-sm font-semibold text-emerald-700">
                {t("upload.uploadedSuccess")}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#E7E9F0] bg-[#F9FCFF] rounded-b-2xl">
          <p className="text-xs text-[#94A3B8] font-medium">
            {file ? t("upload.fileSelected") : t("upload.noFileSelected")}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-full text-sm font-semibold text-[#475569] bg-white border border-[#D7E4F1] hover:border-[#C9D7E5] hover:bg-[#F1F5F9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("upload.cancel")}
            </button>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!canUpload}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white bg-[#007BC6] hover:bg-[#0B95E9] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("upload.uploading")}
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  {t("upload.upload")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
