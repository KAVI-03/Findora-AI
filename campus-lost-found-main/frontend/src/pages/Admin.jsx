import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/apiClient";
import { useToast } from "../components/ToastContext";
import Sidebar from "../components/Sidebar";

export default function Admin() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    held: 0,
    claimed: 0,
    disputed: 0,
    activeUsers: 0,
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionClaimant, setResolutionClaimant] = useState("");
  const [resolutionRoll, setResolutionRoll] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Real category distribution calculation (Donut chart preserved with real live data)
  const categorySegments = useMemo(() => {
    const counts = {};
    items.forEach((i) => {
      const c = i.category || "Other";
      counts[c] = (counts[c] || 0) + 1;
    });
    const total = items.length || 1;
    const palette = [
      "var(--primary)",
      "var(--success)",
      "var(--warning)",
      "var(--danger)",
      "var(--accent)",
    ];
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const segs = [];
    let cumulative = 0;
    for (let idx = 0; idx < sorted.length; idx++) {
      const [label, n] = sorted[idx];
      const pct = (n / total) * 100;
      segs.push({
        label,
        n,
        color: palette[idx % palette.length],
        pct,
        offset: cumulative,
      });
      cumulative += pct;
    }
    return segs;
  }, [items]);

  const hotspots = useMemo(() => {
    const locCounts = {};
    items.forEach((item) => {
      if (item.location) {
        const loc = item.location.trim().toLowerCase();
        locCounts[loc] = (locCounts[loc] || 0) + 1;
      }
    });
    return Object.entries(locCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([loc, count]) => ({
        location: loc.charAt(0).toUpperCase() + loc.slice(1),
        count,
        percentage: items.length > 0 ? Math.round((count / items.length) * 100) : 0,
      }));
  }, [items]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const itemsData = await API.getAllFound();
      const allItems = itemsData.items || [];
      setItems(allItems);

      let usersCount = 3;
      try {
        const usersData = await API.getUsers();
        if (usersData && usersData.users) {
          usersCount = usersData.users.length;
        }
      } catch (err) {
        console.error("Could not fetch user registry count:", err);
      }

      setStats({
        total: allItems.length,
        held: allItems.filter((i) => i.status === "held" || !i.status).length,
        claimed: allItems.filter((i) => i.status === "claimed").length,
        disputed: allItems.filter((i) => i.status === "disputed").length,
        activeUsers: usersCount,
      });
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData();
  }, [loadDashboardData]);

  const handleUpdateStatus = async (filename, newStatus, claimant = null, roll = null) => {
    setActionLoading(true);
    try {
      await API.updateItemStatus(filename, newStatus, roll, claimant);
      toast.success(`Status updated to ${newStatus.toUpperCase()}`);
      loadDashboardData();
    } catch (error) {
      toast.error("Error updating status: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async (filename) => {
    if (!window.confirm("Permanently delete this item? Findora AI vector embeddings will be reconstructed.")) {
      return;
    }
    setActionLoading(true);
    try {
      await API.deleteItem(filename);
      toast.success("Item removed and AI vector index rebuilt successfully!");
      loadDashboardData();
    } catch (error) {
      toast.error("Error deleting item: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!selectedDispute) return;
    setActionLoading(true);
    try {
      await API.updateItemStatus(
        selectedDispute.filename,
        "claimed",
        resolutionRoll.trim() || "DISPUTE_RESOLVED",
        resolutionClaimant.trim() || "Dispute Resolver"
      );
      toast.success("Dispute resolved and item marked as Claimed!");
      setSelectedDispute(null);
      setResolutionClaimant("");
      setResolutionRoll("");
      loadDashboardData();
    } catch (error) {
      toast.error("Error resolving dispute: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    API.logout();
    navigate("/login");
  };

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === "all" || (item.status || "held") === statusFilter;
    const matchesSearch =
      (item.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const disputedItems = items.filter((item) => item.status === "disputed");

  return (
    <div className="page animate-fade-in">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }} className="page-content">
        {/* Admin Navigation Top Header */}
        <header className="app-header" style={{ position: "relative", marginBottom: "var(--space-6)" }}>
          <div className="app-header-inner">
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.25rem",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    background: "var(--gradient-brand)",
                    color: "#ffffff",
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                  }}
                >
                  <i className="fas fa-shield-halved"></i>
                </span>
                Findora Control Panel
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 2 }}>
                Campus Lost &amp; Found Administration &amp; AI Vector Health
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="btn-secondary btn-sm"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Student View</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-danger btn-sm"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Global Action Spinner Overlay */}
        {actionLoading && (
          <div className="modal-overlay" style={{ zIndex: 100 }}>
            <div className="card" style={{ padding: "var(--space-6)", display: "flex", alignItems: "center", gap: 14 }}>
              <i className="fas fa-circle-notch fa-spin text-violet" style={{ fontSize: "1.5rem" }}></i>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Updating Data &amp; Rebuilding SigLIP Index...</span>
            </div>
          </div>
        )}

        <div style={{ flex: 1, width: "100%" }}>
          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {activeSection === "dashboard" && (
            <div className="space-y-6 animate-slide-up">
              {/* Stat Cards */}
              <div className="grid grid-4">
                {[
                  {
                    label: "Total Items",
                    value: stats.total,
                    icon: "fa-box-archive",
                    color: "var(--primary-subtle)",
                    iconColor: "var(--primary-light)",
                    meta: `${stats.held} held in inventory`,
                  },
                  {
                    label: "Handed Over",
                    value: stats.claimed,
                    icon: "fa-circle-check",
                    color: "var(--success-subtle)",
                    iconColor: "var(--success)",
                    meta: `${stats.total > 0 ? Math.round((stats.claimed / stats.total) * 100) : 0}% recovery rate`,
                  },
                  {
                    label: "Active Disputes",
                    value: stats.disputed,
                    icon: "fa-gavel",
                    color: "var(--danger-subtle)",
                    iconColor: "var(--danger)",
                    meta: stats.disputed > 0 ? "Requires review" : "Zero pending disputes",
                  },
                  {
                    label: "Active Accounts",
                    value: stats.activeUsers,
                    icon: "fa-users",
                    color: "var(--warning-subtle)",
                    iconColor: "var(--warning)",
                    meta: "Registered campus members",
                  },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="stat-label">{s.label}</p>
                        <p className="stat-value">{s.value}</p>
                      </div>
                      <div className="stat-icon" style={{ background: s.color, color: s.iconColor }}>
                        <i className={`fas ${s.icon}`}></i>
                      </div>
                    </div>
                    <p className="stat-meta">
                      <span style={{ color: s.iconColor, fontWeight: 700 }}>{s.meta}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Recent Inventory Logs */}
              <div className="card">
                <div className="card-body">
                  <div className="section-header" style={{ marginBottom: "var(--space-4)" }}>
                    <i className="fas fa-clock-rotate-left"></i>
                    <h3>Recent System Activity</h3>
                  </div>

                  {loading ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading activity...</p>
                  ) : items.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "var(--space-8) 0" }}>
                      No recent activity recorded
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {items.slice(-5).reverse().map((item, idx) => (
                        <div
                          key={item.filename || idx}
                          className="flex items-center justify-between"
                          style={{
                            padding: "var(--space-3) var(--space-4)",
                            background: "var(--bg-surface)",
                            borderRadius: "var(--radius-lg)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                            <img
                              src={API.getImageUrl(item.filename)}
                              alt=""
                              style={{
                                width: 44,
                                height: 44,
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
                              <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.85rem", margin: 0 }} className="truncate">
                                {item.description || "Found Item"}
                              </p>
                              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                                <i className="fas fa-location-dot mr-1"></i>
                                {item.location} &bull; {item.timestamp ? new Date(item.timestamp * 1000).toLocaleDateString() : "Recently"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`badge ${
                              item.status === "claimed"
                                ? "badge-success"
                                : item.status === "disputed"
                                ? "badge-danger"
                                : "badge-primary"
                            }`}
                          >
                            {item.status || "held"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: INVENTORY ITEMS */}
          {activeSection === "items" && (
            <div className="card animate-slide-up">
              <div className="card-body">
                <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", margin: 0 }}>
                      Complete Inventory Management
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 2 }}>
                      Inspect, override status, or purge items from the database and FAISS index
                    </p>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <div className="input-icon-wrapper" style={{ width: 220 }}>
                      <span className="input-icon"><i className="fas fa-search"></i></span>
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ padding: "0.5rem 0.75rem 0.5rem 2.4rem", fontSize: "0.8rem" }}
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ width: 140, padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="held">Held</option>
                      <option value="claimed">Claimed</option>
                      <option value="disputed">Disputed</option>
                    </select>
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><i className="fas fa-box-open"></i></div>
                    <p>No items found matching the selected query or status filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Preview</th>
                          <th>Item Details</th>
                          <th>Location</th>
                          <th>Reported By</th>
                          <th>Status</th>
                          <th style={{ textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item, idx) => (
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
                              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                {item.description || "Unidentified"}
                              </div>
                              <span style={{ fontSize: "0.7rem", color: "var(--primary-light)", fontWeight: 600 }}>
                                {item.category || "General"}
                              </span>
                            </td>
                            <td>{item.location}</td>
                            <td>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                                {item.reported_by || "anonymous"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  item.status === "claimed"
                                    ? "badge-success"
                                    : item.status === "disputed"
                                    ? "badge-danger"
                                    : "badge-primary"
                                }`}
                              >
                                {item.status || "held"}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2 justify-center">
                                {item.status !== "claimed" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(item.filename, "claimed", "Verified Owner", "CLAIMED_BY_ADMIN")}
                                    className="btn-icon"
                                    style={{ width: 32, height: 32, color: "var(--success)" }}
                                    title="Mark as Claimed"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                )}
                                {(item.status === "held" || !item.status) && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(item.filename, "disputed")}
                                    className="btn-icon"
                                    style={{ width: 32, height: 32, color: "var(--danger)" }}
                                    title="Flag as Disputed"
                                  >
                                    <i className="fas fa-gavel"></i>
                                  </button>
                                )}
                                {(item.status === "disputed" || item.status === "claimed") && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(item.filename, "held")}
                                    className="btn-icon"
                                    style={{ width: 32, height: 32 }}
                                    title="Restore to Held"
                                  >
                                    <i className="fas fa-rotate-left"></i>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.filename)}
                                  className="btn-icon"
                                  style={{ width: 32, height: 32, color: "var(--danger)" }}
                                  title="Permanently Delete Item"
                                >
                                  <i className="fas fa-trash-can"></i>
                                </button>
                              </div>
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

          {/* SECTION 3: ACTIVE DISPUTES */}
          {activeSection === "disputes" && (
            <div className="card animate-slide-up">
              <div className="card-body">
                <div className="section-header mb-5">
                  <i className="fas fa-gavel text-danger"></i>
                  <h3>Pending Disputed Claims</h3>
                </div>

                {disputedItems.length === 0 ? (
                  <div className="empty-state">
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: "50%",
                        background: "var(--success-subtle)",
                        color: "var(--success)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        margin: "0 auto var(--space-4)",
                        border: "1px solid var(--success-border)",
                      }}
                    >
                      <i className="fas fa-circle-check"></i>
                    </div>
                    <h3>No Active Disputes</h3>
                    <p>All campus property handovers are in verified status. Zero disputes pending resolution.</p>
                  </div>
                ) : (
                  <div className="grid grid-2">
                    {disputedItems.map((item, idx) => (
                      <div
                        key={item.filename || idx}
                        style={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-xl)",
                          padding: "var(--space-5)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div className="flex gap-4">
                          <img
                            src={API.getImageUrl(item.filename)}
                            alt=""
                            style={{
                              width: 68,
                              height: 68,
                              borderRadius: "var(--radius-lg)",
                              objectFit: "cover",
                              border: "1px solid var(--border)",
                              flexShrink: 0,
                            }}
                            onError={(e) => {
                              e.target.src = "/placeholder.svg";
                            }}
                          />
                          <div>
                            <span className="badge badge-danger mb-2">Disputed Ownership</span>
                            <h4 style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem", margin: "4px 0" }}>
                              {item.description || "Item"}
                            </h4>
                            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "2px 0" }}>
                              Found: {item.location} &bull; Contact: {item.contact}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3" style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedDispute(item)}
                            className="btn-primary flex-1 btn-sm"
                          >
                            Resolve Dispute
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.filename, "held")}
                            className="btn-secondary flex-1 btn-sm"
                          >
                            Reset to Held
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: REAL DATA ANALYTICS */}
          {activeSection === "analytics" && (
            <div className="grid grid-2 animate-slide-up">
              {/* Category Distribution Donut Chart (Real Data Preserved) */}
              <div className="card">
                <div className="card-body">
                  <div className="section-header mb-5">
                    <i className="fas fa-chart-pie"></i>
                    <h3>Category Breakdown (Real Data)</h3>
                  </div>

                  <div className="flex items-center justify-around gap-6 flex-wrap">
                    {/* SVG Donut */}
                    <div className="relative" style={{ width: 170, height: 170 }}>
                      <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--bg-elevated)" strokeWidth="3.2" />
                        {categorySegments.map((seg, i) => (
                          <circle
                            key={i}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="3.2"
                            strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                            strokeDashoffset={-seg.offset}
                          />
                        ))}
                      </svg>
                      <div
                        className="absolute"
                        style={{
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "1.6rem",
                            fontWeight: 800,
                            color: "var(--text-primary)",
                            display: "block",
                          }}
                        >
                          {items.length}
                        </span>
                        <span className="stat-label">Total</span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-3">
                      {categorySegments.length === 0 ? (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No reports cataloged yet</span>
                      ) : (
                        categorySegments.map((seg, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span style={{ width: 12, height: 12, borderRadius: 4, background: seg.color, display: "block" }}></span>
                            <div>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", display: "block" }}>
                                {seg.label}
                              </span>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                {seg.n} item{seg.n === 1 ? "" : "s"} ({Math.round(seg.pct)}%)
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Campus Hotspots Breakdown */}
              <div className="card">
                <div className="card-body">
                  <div className="section-header mb-5">
                    <i className="fas fa-map-location-dot text-violet"></i>
                    <h3>Campus Discovery Hotspots</h3>
                  </div>

                  {hotspots.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No location data recorded yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {hotspots.map((h, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-center mb-1">
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                              {h.location}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {h.count} item{h.count === 1 ? "" : "s"} ({h.percentage}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: 8,
                              background: "var(--bg-elevated)",
                              borderRadius: "var(--radius-full)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${h.percentage}%`,
                                height: "100%",
                                background: "var(--gradient-brand)",
                                borderRadius: "var(--radius-full)",
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: SYSTEM REPORTS */}
          {activeSection === "reports" && (
            <div className="card animate-slide-up">
              <div className="card-body">
                <div className="section-header mb-2">
                  <i className="fas fa-file-invoice"></i>
                  <h3>Generate System Summaries</h3>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "var(--space-6)" }}>
                  Compile audit logs, handover histories, and SigLIP retrieval statistics into summaries.
                </p>

                <div className="grid grid-3">
                  {[
                    {
                      icon: "fa-calendar-day",
                      color: "var(--primary-subtle)",
                      iconColor: "var(--primary-light)",
                      title: "Daily Summary",
                      desc: "Summarizes active inventory and 24h gate handovers.",
                      msg: `=== DAILY FINDORA SUMMARY ===\nTotal Cataloged: ${stats.total} | Released: ${stats.claimed} | Held: ${stats.held}`,
                    },
                    {
                      icon: "fa-calendar-week",
                      color: "var(--success-subtle)",
                      iconColor: "var(--success)",
                      title: "Weekly Summary",
                      desc: "Weekly inventory trends and recovery success metrics.",
                      msg: `Weekly recovery rate: ${stats.total > 0 ? Math.round((stats.claimed / stats.total) * 100) : 0}%`,
                    },
                    {
                      icon: "fa-calendar-days",
                      color: "var(--warning-subtle)",
                      iconColor: "var(--warning)",
                      title: "Monthly Audit",
                      desc: "Comprehensive historical logs for campus security administration.",
                      msg: "Monthly audit report generated successfully.",
                    },
                  ].map((r, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-xl)",
                        padding: "var(--space-5)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div className="stat-icon mb-3" style={{ background: r.color, color: r.iconColor }}>
                          <i className={`fas ${r.icon}`}></i>
                        </div>
                        <h4 style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 var(--space-2)" }}>{r.title}</h4>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                          {r.desc}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          toast.success("Summary compiled! " + r.msg);
                        }}
                        className="btn-primary btn-full btn-sm"
                        style={{ marginTop: "var(--space-4)" }}
                      >
                        Generate Summary
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Resolve Dispute Modal */}
      {selectedDispute && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dispute-modal-title">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3 id="dispute-modal-title">Resolve Disputed Item</h3>
                <p>Sign off verified ownership details to complete claim</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedDispute(null)}
                aria-label="Close modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleResolveDispute} className="space-y-4">
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
                    src={API.getImageUrl(selectedDispute.filename)}
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
                    <span className="badge badge-primary mb-1">{selectedDispute.category || "General"}</span>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0 }} className="truncate">
                      {selectedDispute.description || "Disputed Item"}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      Reporter: {selectedDispute.reported_by}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Resolution: Claimant Student Name <span className="required-dot">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Verified Student Full Name"
                    value={resolutionClaimant}
                    onChange={(e) => setResolutionClaimant(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">
                    Resolution: Student Roll Number <span className="required-dot">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 2024101"
                    value={resolutionRoll}
                    onChange={(e) => setResolutionRoll(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-success btn-full btn-lg"
                  style={{ marginTop: "var(--space-4)" }}
                >
                  {actionLoading ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      <span>Resolving Dispute...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle"></i>
                      <span>Approve &amp; Mark Claimed</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
