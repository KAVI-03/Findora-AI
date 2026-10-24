import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/apiClient";
import { useToast } from "../components/ToastContext";
import Header from "../components/Header";
import ReportForm from "../components/ReportForm";
import { SkeletonGrid } from "../components/Skeleton";
import ImageLightbox from "../components/ImageLightbox";
import FindoraLogo from "../components/FindoraLogo";

export default function Guard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory");
  const [selectedItem, setSelectedItem] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);

  const [claimantName, setClaimantName] = useState("");
  const [claimantRoll, setClaimantRoll] = useState("");
  const [verifiedId, setVerifiedId] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [stats, setStats] = useState({ held: 0, claimed: 0 });

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.getAllFound();
      const allItems = data.items || [];
      setItems(allItems);
      setStats({
        held: allItems.filter((i) => i.status === "held" || !i.status).length,
        claimed: allItems.filter((i) => i.status === "claimed").length,
      });
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInventory();
  }, [loadInventory]);

  const handleReportFound = async (formData, reportFile) => {
    if (!reportFile || !formData.location || !formData.contact) {
      toast.warning("Please fill in all required fields and attach a photo.");
      return;
    }
    const form = new FormData();
    form.append("file", reportFile);
    form.append("location", formData.location);
    form.append("contact", formData.contact);
    form.append("description", formData.description);
    form.append("category", formData.category);

    setLoading(true);
    try {
      await API.reportFound(form);
      toast.success("Item cataloged into campus gate inventory!");
      setActiveTab("inventory");
      loadInventory();
    } catch (error) {
      toast.error("Error reporting item: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessClaim = async (e) => {
    e.preventDefault();
    if (!claimantName.trim() || !claimantRoll.trim() || !verifiedId) {
      toast.warning("Please complete the ID verification checklist.");
      return;
    }
    setActionLoading(true);
    try {
      await API.updateItemStatus(selectedItem.filename, "claimed", claimantRoll.trim(), claimantName.trim());
      toast.success("Verified item handover logged successfully!");
      setSelectedItem(null);
      setClaimantName("");
      setClaimantRoll("");
      setVerifiedId(false);
      loadInventory();
    } catch (error) {
      toast.error("Error processing claim: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const activeHeldItems = items.filter((item) => item.status === "held" || !item.status);
  const claimedHistory = items.filter((item) => item.status === "claimed");

  return (
    <div className="page animate-fade-in">
      <Header />

      <main className="page-content">
        {/* Page Header & Operational Stats */}
        <div className="flex justify-between items-start flex-wrap gap-4 mb-8 animate-slide-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-primary">Security Desk</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Campus Handover System</span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
                fontWeight: 800,
                margin: 0,
              }}
            >
              Gate Inventory Operations
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
              Inspect held items, record new gate intakes, and log verified handovers
            </p>
          </div>

          <div className="flex gap-3">
            <div className="stat-card" style={{ padding: "var(--space-3) var(--space-5)", textAlign: "center", minWidth: 110 }}>
              <span className="stat-label">Currently Held</span>
              <span className="stat-value" style={{ fontSize: "1.6rem" }}>{stats.held}</span>
            </div>
            <div className="stat-card" style={{ padding: "var(--space-3) var(--space-5)", textAlign: "center", minWidth: 110 }}>
              <span className="stat-label">Handed Over</span>
              <span className="stat-value text-success" style={{ fontSize: "1.6rem" }}>{stats.claimed}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="tab-switcher mb-6" style={{ maxWidth: 440 }}>
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={activeTab === "inventory" ? "active" : ""}
          >
            <i className="fas fa-boxes-stacked"></i>
            <span>Held Inventory ({activeHeldItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("intake")}
            className={activeTab === "intake" ? "active" : ""}
          >
            <i className="fas fa-plus-circle"></i>
            <span>New Intake</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={activeTab === "logs" ? "active" : ""}
          >
            <i className="fas fa-clipboard-check"></i>
            <span>Handover Logs</span>
          </button>
        </div>

        {/* Tab 1: Held Inventory */}
        {activeTab === "inventory" && (
          <div className="animate-slide-up">
            {loading ? (
              <SkeletonGrid count={4} />
            ) : activeHeldItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <i className="fas fa-box-open"></i>
                </div>
                <h3>Gate Inventory Empty</h3>
                <p>No items are currently held at campus security gates. New items will appear here upon submission.</p>
              </div>
            ) : (
              <div className="grid grid-4">
                {activeHeldItems.map((item, idx) => (
                  <div
                    key={item.filename || idx}
                    className="card animate-slide-up"
                    style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                  >
                    <div>
                      <div
                        className="item-img-container"
                        onClick={() => setLightboxImg(API.getImageUrl(item.filename || ""))}
                      >
                        <img
                          src={API.getImageUrl(item.filename || "")}
                          alt={item.description}
                          onError={(e) => {
                            e.target.src = "/placeholder.svg";
                          }}
                        />
                        <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", zIndex: 2 }}>
                          <span className="badge badge-glass">{item.category || "General"}</span>
                        </div>
                      </div>

                      <div className="card-body">
                        <h3
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: "var(--text-primary)",
                            margin: "0 0 var(--space-3)",
                            lineHeight: 1.3,
                          }}
                          className="line-clamp-1"
                        >
                          {item.description || "Unidentified Item"}
                        </h3>

                        <div className="space-y-2">
                          <div className="info-row">
                            <span className="info-row-icon"><i className="fas fa-location-dot"></i></span>
                            <span className="info-row-value truncate">{item.location}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-row-icon"><i className="fas fa-calendar"></i></span>
                            <span className="info-row-value">
                              {item.timestamp ? new Date(item.timestamp * 1000).toLocaleDateString() : "Recently"}
                            </span>
                          </div>
                          <div className="info-row">
                            <span className="info-row-icon"><i className="fas fa-user-tag"></i></span>
                            <span className="info-row-value truncate">{item.contact}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="btn-success btn-full btn-sm"
                      >
                        <i className="fas fa-handshake"></i>
                        <span>Verify &amp; Handover</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: New Intake */}
        {activeTab === "intake" && (
          <div className="max-w-2xl mx-auto animate-slide-up">
            <ReportForm
              onSubmit={handleReportFound}
              loading={loading}
              onCancel={() => setActiveTab("inventory")}
            />
          </div>
        )}

        {/* Tab 3: Handover History Logs */}
        {activeTab === "logs" && (
          <div className="card animate-slide-up">
            <div className="card-body">
              <div className="section-header" style={{ marginBottom: "var(--space-5)" }}>
                <i className="fas fa-history"></i>
                <h3>Verified Release History</h3>
              </div>

              {claimedHistory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <i className="fas fa-folder-open"></i>
                  </div>
                  <h3>No Handover Records Yet</h3>
                  <p>Handover records verified by gate security staff will be cataloged here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Item Description</th>
                        <th>Claimant Student</th>
                        <th>Released By</th>
                        <th>Handover Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claimedHistory.map((item, idx) => (
                        <tr key={item.filename || idx}>
                          <td>
                            <img
                              src={API.getImageUrl(item.filename)}
                              alt=""
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "var(--radius-md)",
                                objectFit: "cover",
                                border: "1px solid var(--border)",
                              }}
                              onError={(e) => {
                                e.target.src = "/placeholder.svg";
                              }}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {item.description || "N/A"}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              Held at: {item.location}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.claimed_by_name || "Verified Student"}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--primary-light)", fontFamily: "var(--font-mono)" }}>
                              Roll: {item.claimed_by || "N/A"}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                              {item.handed_over_by || "Security Staff"}
                            </span>
                          </td>
                          <td>
                            {item.timestamp
                              ? new Date(item.timestamp * 1000).toLocaleDateString()
                              : "Recently"}
                          </td>
                          <td>
                            <span className="badge badge-success">Claimed</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Verified Claim Handover Modal */}
      {selectedItem && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="claim-modal-title">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3 id="claim-modal-title">Verified Claim Handover</h3>
                <p>Inspect claimant's student identity card before release</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedItem(null)}
                aria-label="Close modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleProcessClaim} className="space-y-4">
                {/* Item Summary */}
                <div
                  className="flex gap-3 items-center"
                  style={{
                    padding: "var(--space-3)",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <img
                    src={API.getImageUrl(selectedItem.filename)}
                    alt=""
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "var(--radius-md)",
                      objectFit: "cover",
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      e.target.src = "/placeholder.svg";
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <span className="badge badge-primary mb-1">{selectedItem.category || "General"}</span>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0 }} className="truncate">
                      {selectedItem.description || "Held Belonging"}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      Location: {selectedItem.location}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Claimant Student Name <span className="required-dot">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter student full name"
                    value={claimantName}
                    onChange={(e) => setClaimantName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">
                    Claimant Roll Number <span className="required-dot">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 2024101"
                    value={claimantRoll}
                    onChange={(e) => setClaimantRoll(e.target.value)}
                    required
                  />
                </div>

                {/* ID Inspection Checkbox */}
                <div
                  className="flex gap-3 items-start"
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <input
                    type="checkbox"
                    id="verify_id"
                    checked={verifiedId}
                    onChange={(e) => setVerifiedId(e.target.checked)}
                    required
                    style={{ marginTop: 3 }}
                  />
                  <label
                    htmlFor="verify_id"
                    style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5, cursor: "pointer" }}
                  >
                    I confirm that I have personally inspected the claimant's student identity card and verified ownership.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !verifiedId}
                  className="btn-success btn-full btn-lg"
                  style={{ marginTop: "var(--space-4)" }}
                >
                  {actionLoading ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      <span>Logging Handover...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle"></i>
                      <span>Release Item to Student</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}

      {/* Bottom Navigation */}
      <nav className="bottom-nav" aria-label="Guard Navigation">
        <div className="sidebar-brand">
          <FindoraLogo size={32} showWordmark={true} />
        </div>

        <div className="sidebar-nav-links">
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`nav-item ${activeTab === "inventory" ? "active" : ""}`}
          >
            <i className="fas fa-boxes-stacked"></i>
            <span>Inventory</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("intake")}
            className={`nav-item ${activeTab === "intake" ? "active" : ""}`}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Intake</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`nav-item ${activeTab === "logs" ? "active" : ""}`}
          >
            <i className="fas fa-clipboard-check"></i>
            <span>Logs</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="nav-item"
          >
            <i className="fas fa-circle-arrow-left"></i>
            <span>Student View</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
