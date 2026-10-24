import { useState, useRef } from "react";

export default function ReportForm({ onSubmit, loading, onCancel }) {
  const [reportType, setReportType] = useState("found");
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    contact: "",
    category: "",
  });
  const [reportFile, setReportFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const categories = [
    { name: "Electronics", icon: "fa-laptop" },
    { name: "Clothing", icon: "fa-shirt" },
    { name: "Accessories", icon: "fa-glasses" },
    { name: "Documents", icon: "fa-file-lines" },
    { name: "Bags", icon: "fa-bag-shopping" },
    { name: "Footwear", icon: "fa-shoe-prints" },
    { name: "Other", icon: "fa-ellipsis" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectFile = (file) => {
    if (!file) {
      setReportFile(null);
      setPreviewUrl(null);
      return;
    }
    setReportFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setReportFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleSelectFile(files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData, reportFile, reportType);
    setFormData({ description: "", location: "", contact: "", category: "" });
    setReportFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="card animate-slide-up" style={{ borderRadius: "var(--radius-2xl)" }}>
      <div className="card-body">
        {/* Header & Mode Switcher */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", margin: 0 }}>
              {reportType === "found" ? "Report a Found Item" : "Report a Lost Item"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 2 }}>
              {reportType === "found"
                ? "Help return found property to its verified owner."
                : "Submit details of your lost property for AI matching."}
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-icon"
              style={{ width: 34, height: 34 }}
              aria-label="Cancel and close form"
            >
              <i className="fas fa-times" style={{ fontSize: "0.85rem" }}></i>
            </button>
          )}
        </div>

        {/* Type Toggle Segmented Control */}
        <div className="tab-switcher mb-6">
          <button
            type="button"
            onClick={() => setReportType("found")}
            className={reportType === "found" ? "active" : ""}
          >
            <i className="fas fa-hand-holding-heart"></i>
            <span>Found an Item</span>
          </button>
          <button
            type="button"
            onClick={() => setReportType("lost")}
            className={reportType === "lost" ? "active" : ""}
          >
            <i className="fas fa-magnifying-glass"></i>
            <span>Lost an Item</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Item Photo Upload */}
          <div>
            <label className="form-label">
              Upload Item Photo {reportType === "found" && <span className="required-dot">*</span>}
              <span style={{ textTransform: "none", fontWeight: 400, marginLeft: 6, color: "var(--text-dim)" }}>
                {reportType === "found" ? "(Required for visual AI matching)" : "(Optional)"}
              </span>
            </label>

            {previewUrl ? (
              <div className="upload-preview-container">
                <img src={previewUrl} alt="Item Preview" className="upload-preview-img" />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="upload-remove-btn"
                  title="Remove image"
                  aria-label="Remove image"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <div
                className="upload-zone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  borderColor: isDragging ? "var(--primary)" : undefined,
                  background: isDragging ? "var(--primary-subtle)" : undefined,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSelectFile(e.target.files?.[0] || null)}
                  required={reportType === "found"}
                  style={{ display: "none" }}
                />
                <div className="upload-zone-icon">
                  <i className="fas fa-cloud-arrow-up"></i>
                </div>
                <p style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 700 }}>
                  Click to browse or drag & drop photo
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  JPG, PNG, WebP supported. Best results when item is well lit.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Description */}
          <div>
            <label className="form-label">
              Item Description
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon" style={{ top: "0.85rem", transform: "none" }}>
                <i className="fas fa-pen-nib"></i>
              </span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Key features (e.g. Navy blue Dell backpack, silver keychain, scratch on front)..."
                rows="3"
                style={{ paddingLeft: "2.75rem" }}
              />
            </div>
          </div>

          {/* Section 3: Category Visual Selection */}
          <div>
            <label className="form-label">
              Category <span className="required-dot">*</span>
            </label>
            <div className="category-chip-grid">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, category: cat.name }))}
                  className={`category-chip ${formData.category === cat.name ? "active" : ""}`}
                >
                  <i className={`fas ${cat.icon}`}></i>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
            {/* Hidden input for HTML5 validity */}
            <input type="hidden" name="category" value={formData.category} required />
          </div>

          {/* Section 4: Location */}
          <div>
            <label className="form-label">
              {reportType === "found" ? "Location Found" : "Approximate Location Lost"}{" "}
              <span className="required-dot">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <i className="fas fa-location-dot"></i>
              </span>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="E.g., Library 2nd floor, Student Center tables, Main Gate..."
                required
              />
            </div>
          </div>

          {/* Section 5: Contact Details */}
          <div>
            <label className="form-label">
              Your Contact Details <span className="required-dot">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <i className="fas fa-envelope"></i>
              </span>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="Phone number, student email, or campus room number..."
                required
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3" style={{ paddingTop: "var(--space-2)" }}>
            <button
              type="submit"
              disabled={loading || !formData.category || (reportType === "found" && !reportFile)}
              className="btn-success flex-1 btn-lg"
            >
              {loading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  <span>Submitting to Findora...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i>
                  <span>Submit {reportType === "found" ? "Found" : "Lost"} Report</span>
                </>
              )}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary btn-lg"
                style={{ minWidth: 100 }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
