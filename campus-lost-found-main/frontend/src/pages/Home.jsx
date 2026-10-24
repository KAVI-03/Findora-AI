import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../api/apiClient";
import { useToast } from "../components/ToastContext";
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import ReportForm from "../components/ReportForm";
import ItemCard from "../components/ItemCard";
import { SkeletonGrid } from "../components/Skeleton";
import FindoraLogo from "../components/FindoraLogo";

export default function Home() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("found");
  const [foundItems, setFoundItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");

  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! 👋 I'm the Findora assistant. Ask me if your item was found, how to report or claim something, or for campus stats.",
      items: [],
      suggestions: [
        "Is my item found?",
        "How to report lost item?",
        "How to claim my item?",
        "Show latest found items",
      ],
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const currentUser = API.getCurrentUser() || { email: "student@campus.edu", role: "student" };

  const loadFoundItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.getAllFound();
      setFoundItems(data.items || []);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFoundItems();
  }, [loadFoundItems]);

  const topHotspots = useMemo(() => {
    const locCounts = {};
    foundItems.forEach((item) => {
      if (item.location) {
        const loc = item.location.trim().toLowerCase();
        locCounts[loc] = (locCounts[loc] || 0) + 1;
      }
    });
    return Object.entries(locCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([loc]) => loc.charAt(0).toUpperCase() + loc.slice(1));
  }, [foundItems]);

  const filteredFoundItems = useMemo(() => {
    return foundItems.filter((item) => {
      const matchesCat = categoryFilter === "all" || (item.category || "").toLowerCase() === categoryFilter.toLowerCase();
      const matchesText =
        !searchFilter.trim() ||
        (item.description || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
        (item.location || "").toLowerCase().includes(searchFilter.toLowerCase());
      return matchesCat && matchesText;
    });
  }, [foundItems, categoryFilter, searchFilter]);

  const handleSearchByImage = async (file) => {
    if (!file) {
      toast.warning("Please select an image file to match.");
      return;
    }
    setLoading(true);
    try {
      const results = await API.searchLost({ file });
      const matches = results.matches || [];
      setSearchResults(matches);
      if (matches.length > 0) {
        toast.success(`Found ${matches.length} matching items via SigLIP visual analysis!`);
      } else {
        toast.info("No matches found above threshold. Try another photo.");
      }
    } catch (error) {
      toast.error("Visual search error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByText = async (text) => {
    if (!text.trim()) {
      toast.warning("Please enter a description to search.");
      return;
    }
    setLoading(true);
    try {
      const results = await API.searchLost({ text_query: text.trim() });
      const matches = results.matches || [];
      setSearchResults(matches);
      if (matches.length > 0) {
        toast.success(`Found ${matches.length} matching items via semantic search!`);
      } else {
        toast.info("No matches found. Try alternative keywords.");
      }
    } catch (error) {
      toast.error("Search error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (formData, reportFile, reportType) => {
    if ((reportType === "found" && !reportFile) || !formData.location || !formData.contact) {
      toast.warning("Please fill in all required fields.");
      return;
    }
    const form = new FormData();
    if (reportFile) {
      form.append("file", reportFile);
    }
    form.append("location", formData.location);
    form.append("contact", formData.contact);
    form.append("description", formData.description);
    form.append("category", formData.category);

    setLoading(true);
    try {
      if (reportType === "found") {
        await API.reportFound(form);
        toast.success("Found item reported and indexed into Findora!");
      } else {
        await API.reportLost(form);
        toast.success("Lost item inquiry logged into Findora!");
      }
      setActiveTab("my-reports");
      loadFoundItems();
    } catch (error) {
      toast.error("Error submitting report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagDispute = async (filename) => {
    if (!window.confirm("Are you sure you want to flag this handover as disputed? Administrators will be notified.")) {
      return;
    }
    setLoading(true);
    try {
      await API.updateItemStatus(filename, "disputed");
      toast.success("Dispute flagged successfully! Security staff notified for review.");
      loadFoundItems();
    } catch (error) {
      toast.error("Error flagging dispute: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading, activeTab]);

  const sendChat = async (text) => {
    const msg = (text ?? chatInput).trim();
    if (!msg || chatLoading) return;

    const history = chatMessages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const data = await API.chat(msg, history);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          items: data.items || [],
          suggestions: data.suggestions || [],
        },
      ]);
    } catch (err) {
      let replyText;
      if (err.message === "SESSION_EXPIRED") {
        replyText =
          "Your login session has expired. Redirecting you to the sign-in page to refresh your authentication...";
        setTimeout(() => {
          window.location.href = "/login";
        }, 2200);
      } else if (err.message === "CHAT_NOT_FOUND") {
        replyText =
          "The Findora chat service endpoint is currently offline. Please ensure the backend is running.";
      } else if (err instanceof TypeError) {
        replyText =
          "Unable to connect to the Findora backend server. Please check your network or backend service.";
      } else {
        replyText = `The server returned an error (${err.message}).`;
      }
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: replyText, items: [], suggestions: [] },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const myReportedItems = foundItems.filter((item) => item.reported_by === currentUser.email);

  return (
    <div className="page animate-fade-in">
      <Header />

      <main className="page-content">
        {/* TAB 1: Report Lost / Found Item */}
        {activeTab === "report" && (
          <div className="max-w-2xl mx-auto mb-8 animate-slide-up">
            <ReportForm
              onSubmit={handleReport}
              loading={loading}
              onCancel={() => setActiveTab("found")}
            />
          </div>
        )}

        {/* TAB 2: Browse Found Inventory */}
        {activeTab === "found" && (
          <div className="animate-slide-up">
            {/* Welcome Hero */}
            <div className="hero-glow-card mb-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-primary">Campus Portal</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Live Retrieval Platform
                    </span>
                  </div>
                  <h1
                    className="gradient-text"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    Welcome back, {currentUser.name || "Student"} 👋
                  </h1>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                    <strong>{foundItems.length}</strong> items currently cataloged in the campus repository
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("report")}
                  className="btn-primary"
                >
                  <i className="fas fa-plus"></i>
                  <span>Report an Item</span>
                </button>
              </div>
            </div>

            {/* Campus Hotspot Banner */}
            {topHotspots.length > 0 && (
              <div
                className="card mb-6"
                style={{
                  padding: "var(--space-4) var(--space-5)",
                  borderLeft: "4px solid var(--warning)",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "var(--warning-subtle)",
                    color: "var(--warning)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "0.95rem",
                  }}
                >
                  <i className="fas fa-triangle-exclamation"></i>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 2px 0", color: "var(--text-primary)" }}>
                    Frequent Lost Property Hotspots
                  </h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                    Belongings are frequently discovered near:{" "}
                    <strong style={{ color: "var(--text-secondary)" }}>{topHotspots.join(", ")}</strong>. Be vigilant with personal belongings!
                  </p>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="flex justify-between items-center flex-wrap gap-3 mb-6">
              <div className="section-header" style={{ marginBottom: 0 }}>
                <i className="fas fa-boxes-stacked"></i>
                <h2>Campus Inventory</h2>
              </div>

              <div className="flex gap-2 flex-wrap" style={{ alignItems: "center" }}>
                {/* Search query in browse */}
                <div className="input-icon-wrapper" style={{ width: 220 }}>
                  <span className="input-icon">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    placeholder="Filter inventory..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{ padding: "0.5rem 0.75rem 0.5rem 2.4rem", fontSize: "0.8rem" }}
                  />
                </div>

                {/* Category select */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ width: 140, padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
                >
                  <option value="all">All Categories</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="accessories">Accessories</option>
                  <option value="documents">Documents</option>
                  <option value="bags">Bags</option>
                  <option value="footwear">Footwear</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Items Grid */}
            {loading ? (
              <SkeletonGrid count={4} />
            ) : filteredFoundItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <i className="fas fa-box-open"></i>
                </div>
                <h3>No Items Found</h3>
                <p>
                  {searchFilter || categoryFilter !== "all"
                    ? "No items match your active filters. Try broadening your criteria."
                    : "There are currently no items in the inventory. New reports will appear here."}
                </p>
              </div>
            ) : (
              <div className="grid grid-4">
                {filteredFoundItems.map((item, idx) => (
                  <ItemCard key={item.filename || idx} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI Search */}
        {activeTab === "lost" && (
          <div className="animate-slide-up">
            <SearchBar
              onImageSearch={handleSearchByImage}
              onTextSearch={handleSearchByText}
              loading={loading}
            />

            {/* AI Results */}
            {searchResults.length > 0 && (
              <div className="mt-8 animate-slide-up">
                <div className="section-header">
                  <i className="fas fa-circle-nodes text-success"></i>
                  <h3>SigLIP Neural Matches</h3>
                  <span className="badge badge-success" style={{ marginLeft: "auto" }}>
                    {searchResults.length} Match{searchResults.length === 1 ? "" : "es"} Found
                  </span>
                </div>

                <div className="grid grid-4">
                  {searchResults.map((item, idx) => (
                    <div key={item.filename || idx} className="relative">
                      <ItemCard item={item} />
                      {/* Match Information Badge (Grounded in real API data) */}
                      {(item.confidence || typeof item.similarity === "number" || item.match_reason) && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "var(--space-3)",
                            right: "var(--space-3)",
                            zIndex: 3,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 4,
                          }}
                        >
                          {item.confidence && (
                            <span
                              className={`badge ${
                                item.confidence === "High"
                                  ? "badge-success"
                                  : item.confidence === "Medium"
                                  ? "badge-warning"
                                  : "badge-primary"
                              }`}
                              style={{ fontSize: "0.65rem", boxShadow: "var(--shadow-sm)" }}
                            >
                              {item.confidence} Confidence
                              {typeof item.similarity === "number" && ` (${Math.round(item.similarity * 100)}%)`}
                            </span>
                          )}
                          {item.match_reason && (
                            <span
                              className="badge badge-glass"
                              style={{ fontSize: "0.62rem" }}
                            >
                              {item.match_reason}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && searchResults.length === 0 && (
              <div className="empty-state mt-6">
                <div className="empty-state-icon">
                  <i className="fas fa-wand-magic-sparkles"></i>
                </div>
                <h3>Multimodal Neural Retrieval</h3>
                <p>
                  Upload an image of your lost item or describe it in natural language. Findora's
                  SigLIP vision-language model calculates cosine similarity embeddings to locate matches.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: My Reports */}
        {activeTab === "my-reports" && (
          <div className="animate-slide-up">
            <div className="card">
              <div className="card-body">
                <div className="section-header" style={{ marginBottom: "var(--space-5)" }}>
                  <i className="fas fa-clipboard-list"></i>
                  <h3>My Reported Items Registry</h3>
                </div>

                {myReportedItems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <i className="fas fa-file-circle-question"></i>
                    </div>
                    <h3>No Reports Filed Yet</h3>
                    <p>Items you report as lost or found will be tracked here for instant claim updates.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Photo</th>
                          <th>Description</th>
                          <th>Location</th>
                          <th>Date Logged</th>
                          <th>Status</th>
                          <th style={{ textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myReportedItems.map((item, idx) => (
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
                                {item.description || "Found Item"}
                              </div>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                {item.category || "General"}
                              </span>
                            </td>
                            <td>{item.location}</td>
                            <td>
                              {item.timestamp
                                ? new Date(item.timestamp * 1000).toLocaleDateString()
                                : "Recently"}
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
                            <td style={{ textAlign: "center" }}>
                              {item.status === "claimed" && (
                                <button
                                  type="button"
                                  onClick={() => handleFlagDispute(item.filename)}
                                  className="btn-danger btn-sm"
                                >
                                  <i className="fas fa-triangle-exclamation"></i>
                                  <span>Dispute</span>
                                </button>
                              )}
                              {(item.status === "held" || !item.status) && (
                                <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 500 }}>
                                  Held at Gates
                                </span>
                              )}
                              {item.status === "disputed" && (
                                <span style={{ color: "var(--danger)", fontSize: "0.72rem", fontWeight: 700 }}>
                                  Under Review
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Chat Assistant */}
        {activeTab === "chat" && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <div className="chat-window-card">
              {/* Chat Header */}
              <div
                style={{
                  padding: "var(--space-4) var(--space-5)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--bg-elevated)",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "var(--primary-subtle)",
                    color: "var(--primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--primary-border)",
                    fontSize: "1.05rem",
                  }}
                >
                  <i className="fas fa-robot"></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Findora Assistant
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--success)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }}></span>
                    Online &bull; Answers from live campus inventory
                  </div>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="chat-messages-area">
                {chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                    }}
                  >
                    <div
                      className={`chat-bubble ${
                        m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Inline Item Cards (when live matches returned) */}
                    {m.items && m.items.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          overflowX: "auto",
                          marginTop: 8,
                          paddingBottom: 4,
                        }}
                      >
                        {m.items.map((it) => (
                          <div
                            key={it.filename}
                            style={{
                              minWidth: 160,
                              maxWidth: 160,
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-lg)",
                              overflow: "hidden",
                            }}
                          >
                            <img
                              src={API.getImageUrl(it.filename)}
                              alt={it.description}
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                              }}
                              style={{ width: "100%", height: 95, objectFit: "cover", display: "block" }}
                            />
                            <div style={{ padding: 8 }}>
                              <div
                                className="truncate"
                                style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}
                              >
                                {it.description || "Found Item"}
                              </div>
                              <div
                                className="truncate"
                                style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2 }}
                              >
                                {it.location} &bull; {it.when}
                              </div>
                              <span className="badge badge-primary" style={{ marginTop: 4, fontSize: "0.6rem" }}>
                                {it.status || "held"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick-reply Suggestion Chips */}
                    {m.role === "assistant" &&
                      idx === chatMessages.length - 1 &&
                      m.suggestions &&
                      m.suggestions.length > 0 &&
                      !chatLoading && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {m.suggestions.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => sendChat(sug)}
                              className="chat-quick-chip"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}

                {chatLoading && (
                  <div
                    className="chat-bubble chat-bubble-assistant"
                    style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <i className="fas fa-circle-notch fa-spin text-violet"></i>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Findora is searching live items...
                    </span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Composer */}
              <div
                style={{
                  padding: "var(--space-4)",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  gap: 10,
                  background: "var(--bg-elevated)",
                }}
              >
                <input
                  type="text"
                  placeholder="Ask Findora anything... e.g. 'black earphones found?'"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  disabled={chatLoading}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => sendChat()}
                  disabled={chatLoading || !chatInput.trim()}
                  aria-label="Send message"
                  style={{ padding: "0 1.25rem" }}
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar (Mobile / Responsive) */}
      <nav className="bottom-nav" aria-label="Student Navigation">
        {/* Brand Logo - Desktop Sidebar Mode */}
        <div className="sidebar-brand">
          <FindoraLogo size={32} showWordmark={true} />
        </div>

        {/* Navigation Links */}
        <div className="sidebar-nav-links">
          <button
            type="button"
            onClick={() => {
              setActiveTab("found");
              setSearchResults([]);
            }}
            className={`nav-item ${activeTab === "found" ? "active" : ""}`}
          >
            <i className="fas fa-compass"></i>
            <span>Browse</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("lost");
              setSearchResults([]);
            }}
            className={`nav-item ${activeTab === "lost" ? "active" : ""}`}
          >
            <i className="fas fa-wand-magic-sparkles"></i>
            <span>AI Search</span>
          </button>

          {/* Central Report Action Button */}
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`nav-fab ${activeTab === "report" ? "active" : ""}`}
            aria-label="Report lost or found item"
          >
            <div className="nav-fab-circle">
              <i className="fas fa-plus"></i>
            </div>
            <span>Report</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("chat");
              setSearchResults([]);
            }}
            className={`nav-item ${activeTab === "chat" ? "active" : ""}`}
          >
            <i className="fas fa-comments"></i>
            <span>Assistant</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("my-reports");
              setSearchResults([]);
            }}
            className={`nav-item ${activeTab === "my-reports" ? "active" : ""}`}
          >
            <i className="fas fa-clipboard-list"></i>
            <span>My Reports</span>
          </button>

          {currentUser.role && currentUser.role !== "student" && (
            <Link
              to={currentUser.role === "admin" ? "/admin" : "/guard"}
              className="nav-item"
              style={{ textDecoration: "none" }}
            >
              <i className="fas fa-shield-halved"></i>
              <span>Staff Area</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
