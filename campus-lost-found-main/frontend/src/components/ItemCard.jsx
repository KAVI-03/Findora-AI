import { useState } from "react";
import API from "../api/apiClient";
import ImageLightbox from "./ImageLightbox";

export default function ItemCard({ item, onClaimClick }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageUrl = item.image_url || (item.filename ? API.getImageUrl(item.filename) : null);

  // Format timestamp / date
  const displayDate = item.timestamp
    ? new Date(item.timestamp * 1000).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : item.date
    ? new Date(item.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  const status = (item.status || "held").toLowerCase();
  const statusClass =
    status === "claimed" || status === "resolved"
      ? "badge-success"
      : status === "disputed"
      ? "badge-danger"
      : status === "lost"
      ? "badge-warning"
      : "badge-primary";

  const statusDotClass =
    status === "claimed" || status === "resolved"
      ? "status-dot-claimed"
      : status === "disputed"
      ? "status-dot-disputed"
      : status === "lost"
      ? "status-dot-lost"
      : "status-dot-held";

  return (
    <>
      <div
        className="card animate-slide-up"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
        }}
      >
        <div>
          {/* Media Header Container */}
          <div
            className="item-img-container"
            onClick={() => imageUrl && !imgError && setLightboxOpen(true)}
            role={imageUrl && !imgError ? "button" : undefined}
            tabIndex={imageUrl && !imgError ? 0 : undefined}
            onKeyDown={(e) => {
              if (imageUrl && !imgError && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setLightboxOpen(true);
              }
            }}
            aria-label={imageUrl && !imgError ? "View item photo enlarged" : undefined}
          >
            {imageUrl && !imgError ? (
              <img
                src={imageUrl}
                alt={item.description || "Found property on campus"}
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              <div className="item-no-img">
                <i className="fas fa-image"></i>
                <span>No Photo Available</span>
              </div>
            )}

            {/* Category Chip */}
            {item.category && (
              <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", zIndex: 2 }}>
                <span className="badge badge-glass">{item.category}</span>
              </div>
            )}

            {/* Status Badge */}
            <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", zIndex: 2 }}>
              <span className={`badge ${statusClass}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span className={`status-dot ${statusDotClass}`}></span>
                {status}
              </span>
            </div>
          </div>

          {/* Item Content Details */}
          <div className="card-body">
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                marginBottom: "var(--space-3)",
                lineHeight: 1.35,
                minHeight: 40,
              }}
              className="line-clamp-2"
              title={item.description || "Unidentified Item"}
            >
              {item.description || "Unidentified Lost Property"}
            </h3>

            <div className="space-y-2" style={{ marginTop: "var(--space-2)" }}>
              <div className="info-row">
                <span className="info-row-icon">
                  <i className="fas fa-location-dot"></i>
                </span>
                <span className="truncate">
                  {status === "lost" ? "Lost near:" : "Found at:"}{" "}
                  <span className="info-row-value">{item.location || "Campus"}</span>
                </span>
              </div>

              <div className="info-row">
                <span className="info-row-icon">
                  <i className="fas fa-calendar"></i>
                </span>
                <span>
                  Logged: <span className="info-row-value">{displayDate}</span>
                </span>
              </div>

              <div className="info-row">
                <span className="info-row-icon">
                  <i className="fas fa-user-tag"></i>
                </span>
                <span className="truncate" style={{ maxWidth: "calc(100% - 24px)" }}>
                  Contact:{" "}
                  <span
                    style={{
                      color: "var(--primary-light)",
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {item.contact || "Security Desk"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {onClaimClick && status !== "claimed" && (
          <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
            <button
              type="button"
              onClick={() => onClaimClick(item)}
              className="btn-primary btn-full btn-sm"
            >
              <i className="fas fa-handshake"></i>
              <span>I Claim This Item</span>
            </button>
          </div>
        )}
      </div>

      {/* Enlarged Image Lightbox */}
      {lightboxOpen && imageUrl && !imgError && (
        <ImageLightbox
          src={imageUrl}
          alt={item.description}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
