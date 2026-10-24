import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/apiClient";
import FindoraLogo from "./FindoraLogo";
import { useTheme } from "../context/ThemeContext";

export default function Header() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const user = API.getCurrentUser();

  const userDropdownRef = useRef(null);
  const notificationRef = useRef(null);

  // Close dropdowns on outside click or escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowDropdown(false);
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    API.logout();
    navigate("/login");
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    if (user.role === "admin") return "/admin";
    if (user.role === "guard") return "/guard";
    return "/";
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Brand Link */}
        <Link to={getDashboardLink()} className="brand-link" aria-label="Findora Home">
          <FindoraLogo size={36} showWordmark={true} />
          <span className="brand-badge">Find what's lost. Return what's found.</span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-icon"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <i className={`fas ${theme === "dark" ? "fa-sun" : "fa-moon"}`}></i>
          </button>

          {user ? (
            <>
              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications((prev) => !prev);
                    setShowDropdown(false);
                  }}
                  className="btn-icon"
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                  title="Notifications"
                >
                  <i className="fas fa-bell"></i>
                </button>

                {/* Notifications Popover Dropdown (Strictly empty, no fake data) */}
                {showNotifications && (
                  <div className="dropdown notification-dropdown" role="region" aria-label="Notifications Panel">
                    <div
                      style={{
                        paddingBottom: "var(--space-2)",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "var(--space-3)",
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        Notifications
                      </span>
                      <span className="badge badge-primary" style={{ fontSize: "0.62rem" }}>
                        Live
                      </span>
                    </div>
                    <div style={{ padding: "var(--space-4) var(--space-2)", textAlign: "center", color: "var(--text-muted)" }}>
                      <i className="fas fa-bell-slash" style={{ fontSize: "1.4rem", marginBottom: 8, display: "block", opacity: 0.6 }}></i>
                      <span style={{ fontSize: "0.78rem", fontWeight: 500 }}>No new notifications</span>
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown((prev) => !prev);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-3 cursor-pointer select-none"
                  aria-label="User Account Menu"
                  aria-expanded={showDropdown}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    padding: "5px 12px 5px 6px",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    color: "inherit",
                    font: "inherit",
                  }}
                >
                  {/* User Avatar */}
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
                    }}
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>

                  <div className="sm-hidden" style={{ textAlign: "left" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        fontSize: "0.825rem",
                        display: "block",
                        lineHeight: 1.2,
                      }}
                    >
                      {user.name || "Explorer"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.625rem",
                        color: "var(--text-muted)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        display: "block",
                        marginTop: 1,
                      }}
                    >
                      {user.role === "student"
                        ? `Student ${user.roll_number && user.roll_number !== "N/A" ? `• ${user.roll_number}` : ""}`
                        : user.role}
                    </span>
                  </div>

                  <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", marginLeft: 2 }}>
                    <i className={`fas fa-chevron-${showDropdown ? "up" : "down"}`}></i>
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="dropdown" role="menu">
                    <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border)" }}>
                      <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                        {user.name}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: 2 }} className="truncate">
                        {user.email}
                      </p>
                    </div>

                    <div style={{ padding: "var(--space-1)" }}>
                      {user.role !== "student" && (
                        <Link
                          to={getDashboardLink()}
                          onClick={() => setShowDropdown(false)}
                          className="dropdown-item"
                          role="menuitem"
                        >
                          <i className="fas fa-gauge" style={{ width: 16 }}></i>
                          My Dashboard
                        </Link>
                      )}

                      {user.role === "admin" && (
                        <Link
                          to="/"
                          onClick={() => setShowDropdown(false)}
                          className="dropdown-item"
                          role="menuitem"
                        >
                          <i className="fas fa-home" style={{ width: 16 }}></i>
                          Student Panel View
                        </Link>
                      )}

                      <div className="dropdown-divider"></div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          handleLogout();
                        }}
                        className="dropdown-item dropdown-item-danger"
                        role="menuitem"
                      >
                        <i className="fas fa-sign-out-alt" style={{ width: 16 }}></i>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="btn-primary"
              style={{ fontSize: "0.85rem", padding: "8px 18px" }}
            >
              Access Platform
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
