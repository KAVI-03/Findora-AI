import { useState, useRef } from "react";

export default function SearchBar({ onImageSearch, onTextSearch, loading }) {
  const [searchMode, setSearchMode] = useState("image");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (!file) {
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleClearFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
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
      handleFileChange(files[0]);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (searchText.trim() && !loading) {
      onTextSearch(searchText.trim());
    }
  };

  return (
    <div className="card animate-slide-up" style={{ borderRadius: "var(--radius-2xl)" }}>
      <div className="card-body">
        {/* Title & Tagline */}
        <div className="mb-5">
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.2rem",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="fas fa-sparkles text-violet"></i>
            Findora Multimodal AI Search
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 4 }}>
            Neural vector matching powered by the Google SigLIP vision-language architecture
          </p>
        </div>

        {/* Mode Switcher Segmented Control */}
        <div className="tab-switcher mb-5" style={{ maxWidth: 380 }}>
          <button
            type="button"
            onClick={() => setSearchMode("image")}
            className={searchMode === "image" ? "active" : ""}
          >
            <i className="fas fa-camera"></i>
            <span>Search by Photo</span>
          </button>
          <button
            type="button"
            onClick={() => setSearchMode("text")}
            className={searchMode === "text" ? "active" : ""}
          >
            <i className="fas fa-font"></i>
            <span>Search by Description</span>
          </button>
        </div>

        {/* Mode A: Image / Photo Search */}
        {searchMode === "image" && (
          <div className="space-y-4">
            {previewUrl ? (
              <div className="upload-preview-container">
                <img src={previewUrl} alt="Search Query Preview" className="upload-preview-img" />
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="upload-remove-btn"
                  title="Remove selected image"
                  aria-label="Remove selected image"
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
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
                <div className="upload-zone-icon">
                  <i className="fas fa-image"></i>
                </div>
                <p style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 700 }}>
                  Upload a photo of your lost item
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Drag & drop or click to browse (JPG, PNG, WebP)
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => onImageSearch(selectedFile)}
              disabled={!selectedFile || loading}
              className="btn-primary btn-full btn-lg"
            >
              {loading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  <span>Analyzing visual features with SigLIP...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-magnifying-glass"></i>
                  <span>Find Visual Matches</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Mode B: Description / Text Search */}
        {searchMode === "text" && (
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div>
              <label className="form-label">
                Describe the item you lost
              </label>
              <div className="input-icon-wrapper">
                <span className="input-icon">
                  <i className="fas fa-magnifying-glass"></i>
                </span>
                <input
                  type="text"
                  placeholder="E.g., black leather wallet with student ID, silver watch, blue hydro flask..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="input-action-btn"
                    aria-label="Clear search input"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!searchText.trim() || loading}
              className="btn-primary btn-full btn-lg"
            >
              {loading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  <span>Computing semantic embeddings...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-magnifying-glass"></i>
                  <span>Search by Description</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
