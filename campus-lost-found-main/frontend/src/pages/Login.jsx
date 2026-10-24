import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/apiClient";
import { useToast } from "../components/ToastContext";
import FindoraLogo from "../components/FindoraLogo";

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.warning("Please fill in your email and password.");
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        toast.warning("Please enter your full name.");
        return;
      }
      if (!rollNumber.trim()) {
        toast.warning("Please enter your student roll number.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        // Registration is strictly student-only
        const data = await API.register(email.trim(), password, name.trim(), rollNumber.trim(), "student");
        toast.success("Account created successfully! Redirecting...");
        setTimeout(() => redirectUser(data.user.role), 800);
      } else {
        const data = await API.login(email.trim(), password);
        toast.success("Welcome back! Redirecting...");
        setTimeout(() => redirectUser(data.user.role), 800);
      }
    } catch (err) {
      toast.error(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const redirectUser = (userRole) => {
    if (userRole === "admin") navigate("/admin");
    else if (userRole === "guard") navigate("/guard");
    else navigate("/");
  };

  return (
    <div className="auth-split-container">
      {/* Brand Experience Panel (Left on Desktop) */}
      <div className="auth-brand-side">
        <div className="auth-brand-glow"></div>

        <div>
          <FindoraLogo size={48} showWordmark={true} />
          <p
            style={{
              fontSize: "1.05rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginTop: "var(--space-3)",
              letterSpacing: "-0.01em",
            }}
          >
            Find what's lost. Return what's found.
          </p>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginTop: "var(--space-2)",
              maxWidth: 380,
              lineHeight: 1.6,
            }}
          >
            An intelligent, multimodal vision-language platform engineered for seamless campus lost and found retrieval.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="auth-feature-list">
          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <i className="fas fa-wand-magic-sparkles"></i>
            </div>
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                SigLIP Neural Matching
              </h4>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                Multimodal AI compares item photos and descriptions across the entire campus database.
              </p>
            </div>
          </div>

          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <i className="fas fa-shield-halved"></i>
            </div>
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Verified Handover Protocol
              </h4>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                Gate security inspects claimant student identification before releasing held belongings.
              </p>
            </div>
          </div>

          <div className="auth-feature-item">
            <div className="auth-feature-icon">
              <i className="fas fa-comments"></i>
            </div>
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Live Campus Assistant
              </h4>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                Ask Findora assistant in natural language about lost keys, bottles, documents, and devices.
              </p>
            </div>
          </div>
        </div>

        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", zIndex: 2 }}>
          Findora Platform &copy; {new Date().getFullYear()} &bull; Campus Lost &amp; Found
        </div>
      </div>

      {/* Form Panel (Right on Desktop, Full on Mobile) */}
      <div className="auth-form-side">
        <div className="auth-card-wrap">
          {/* Mobile Brand Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-2)" }}>
              <FindoraLogo size={44} showWordmark={true} />
            </div>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--primary-light)",
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              Find what's lost. Return what's found.
            </p>
          </div>

          {/* Main Card */}
          <div className="card" style={{ padding: "var(--space-6)", borderRadius: "var(--radius-2xl)" }}>
            {/* Sign In vs Register Tabs */}
            <div className="tab-switcher mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setEmail("");
                  setPassword("");
                }}
                className={!isRegister ? "active" : ""}
              >
                <i className="fas fa-arrow-right-to-bracket"></i>
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setRole("student");
                  setEmail("");
                  setPassword("");
                }}
                className={isRegister ? "active" : ""}
              >
                <i className="fas fa-user-plus"></i>
                <span>Create Account</span>
              </button>
            </div>

            {/* Form Title */}
            <div style={{ marginBottom: "var(--space-5)" }}>
              <h2 style={{ fontSize: "1.25rem", margin: 0, color: "var(--text-primary)" }}>
                {isRegister ? "Register Student Account" : "Access Your Account"}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 4 }}>
                {isRegister
                  ? "Self-registration is available for students with a campus ID."
                  : "Sign in with your campus credentials to manage items."}
              </p>
            </div>

            {/* Role Selector (Sign-in Only) */}
            {!isRegister ? (
              <div className="mb-5">
                <label className="form-label">
                  Account Role
                </label>
                <div className="role-grid">
                  {[
                    { id: "student", label: "Student", icon: "fa-graduation-cap" },
                    { id: "guard", label: "Guard", icon: "fa-shield-halved" },
                    { id: "admin", label: "Admin", icon: "fa-user-tie" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`role-card ${role === r.id ? "active" : ""}`}
                    >
                      <i className={`fas ${r.icon}`}></i>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--primary-subtle)",
                  border: "1px solid var(--primary-border)",
                  borderRadius: "var(--radius-lg)",
                  marginBottom: "var(--space-5)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <i className="fas fa-circle-info" style={{ color: "var(--primary-light)", fontSize: "1rem" }}></i>
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                  <strong>Student Only:</strong> Staff accounts for Guards and Admins are fixed by campus security administration.
                </p>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="form-label">
                    Full Name <span className="required-dot">*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">
                      <i className="fas fa-user"></i>
                    </span>
                    <input
                      type="text"
                      placeholder="e.g., Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {isRegister && (
                <div>
                  <label className="form-label">
                    Student Roll Number <span className="required-dot">*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">
                      <i className="fas fa-id-card"></i>
                    </span>
                    <input
                      type="text"
                      placeholder="e.g., 2024101"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">
                  Email Address <span className="required-dot">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">
                    <i className="fas fa-envelope"></i>
                  </span>
                  <input
                    type="email"
                    placeholder={
                      role === "student"
                        ? "student@campus.edu"
                        : role === "guard"
                        ? "guard@campus.edu"
                        : "admin@campus.edu"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Password <span className="required-dot">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">
                    <i className="fas fa-lock"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="input-action-btn"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary btn-full btn-lg"
                style={{ marginTop: "var(--space-6)" }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <i className={`fas ${isRegister ? "fa-user-check" : "fa-arrow-right-to-bracket"}`}></i>
                    <span>{isRegister ? "Complete Student Registration" : "Sign In to Findora"}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
