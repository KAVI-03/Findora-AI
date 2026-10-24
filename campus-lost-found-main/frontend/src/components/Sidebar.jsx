import { useNavigate } from "react-router-dom";
import API from "../api/apiClient";
import FindoraLogo from "./FindoraLogo";

export default function Sidebar({ activeSection, onSectionChange }) {
  const navigate = useNavigate();
  const user = API.getCurrentUser() || { name: "Administrator", email: "admin@campus.edu", role: "admin" };

  const sections = [
    { id: "dashboard", icon: "fa-chart-pie", title: "Dashboard" },
    { id: "items", icon: "fa-boxes-stacked", title: "Items" },
    { id: "disputes", icon: "fa-gavel", title: "Disputes" },
    { id: "analytics", icon: "fa-chart-line", title: "Trends" },
    { id: "reports", icon: "fa-file-invoice", title: "Reports" },
  ];

  const handleLogout = () => {
    API.logout();
    navigate("/login");
  };

  return (
    <nav className="bottom-nav desktop-sidebar" aria-label="Admin Navigation">
      {/* Brand Logo & Wordmark */}
      <div className="sidebar-brand">
        <FindoraLogo size={32} showWordmark={true} />
      </div>

      {/* Navigation Links */}
      <div className="sidebar-nav-links">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionChange(section.id)}
            className={`nav-item ${activeSection === section.id ? "active" : ""}`}
            aria-current={activeSection === section.id ? "page" : undefined}
          >
            <i className={`fas ${section.icon}`}></i>
            <span>{section.title}</span>
          </button>
        ))}
      </div>

      {/* User Profile & Logout */}
      <div className="sidebar-user">
        <div className="flex items-center gap-3" style={{ padding: "4px 0" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--gradient-brand)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.825rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                fontWeight: 700,
                color: "var(--text-primary)",
                fontSize: "0.825rem",
                display: "block",
                lineHeight: 1.2,
              }}
              className="truncate"
            >
              {user.name}
            </span>
            <span
              style={{
                fontSize: "0.625rem",
                color: "var(--text-muted)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                marginTop: 2,
              }}
            >
              {user.role}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="btn-danger btn-full btn-sm"
          style={{ marginTop: "var(--space-2)" }}
        >
          <i className="fas fa-sign-out-alt"></i>
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
