import { Navigate, Link } from "react-router-dom";
import API from "../api/apiClient";
import FindoraLogo from "./FindoraLogo";

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = API.getCurrentUser();
  const token = localStorage.getItem("token");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="page flex items-center justify-center" style={{ padding: "var(--space-6)" }}>
        <div
          className="card animate-scale-in"
          style={{ maxWidth: 440, width: "100%", textAlign: "center", padding: "var(--space-8)" }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-4)" }}>
            <FindoraLogo size={42} showWordmark={true} />
          </div>

          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--danger-subtle)",
              color: "var(--danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              margin: "var(--space-4) auto var(--space-4)",
              border: "1px solid var(--danger-border)",
            }}
          >
            <i className="fas fa-lock"></i>
          </div>

          <h2 style={{ fontSize: "1.35rem", marginBottom: "var(--space-2)" }}>Access Restricted</h2>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              marginBottom: "var(--space-6)",
              lineHeight: 1.6,
            }}
          >
            Your account role is{" "}
            <span style={{ color: "var(--warning)", fontWeight: 700, textTransform: "capitalize" }}>
              {user.role}
            </span>
            . You do not have authorization to access this operational panel.
          </p>

          <Link
            to={user.role === "guard" ? "/guard" : user.role === "admin" ? "/admin" : "/"}
            className="btn-primary btn-full btn-lg"
            style={{ textDecoration: "none" }}
          >
            <i className="fas fa-arrow-left"></i>
            <span>Return to Authorized Area</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
