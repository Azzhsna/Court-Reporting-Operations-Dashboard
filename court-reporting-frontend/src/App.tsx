import { useState, useEffect, useMemo, useRef } from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronRight,
  Plus,
  X,
  Search,
  AlertTriangle,
  User,
  ChevronDown,
} from "lucide-react";
import "./index.css";

const API_BASE = "http://localhost:3000";

type Reporter = { id: string; name: string; location: string };
type Editor = { id: string; name: string };

type Job = {
  id: string;
  caseName: string;
  durationMinutes: number;
  locationType: string;
  city?: string;
  status: string;
  reporter?: { name: string };
  editor?: { name: string };
  reporterPayment?: number;
  editorPayment?: number;
};

const WORKFLOW_STEPS = [
  "NEW",
  "ASSIGNED",
  "TRANSCRIBED",
  "REVIEWED",
  "COMPLETED",
];
const PROGRESS_PCT: Record<string, number> = {
  NEW: 20,
  ASSIGNED: 40,
  TRANSCRIBED: 60,
  REVIEWED: 80,
  COMPLETED: 100,
};

// Custom Select Component
function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={`custom-select-wrapper ${className}`} ref={containerRef}>
      <div
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span
          style={{ color: selectedOption ? "#fff" : "var(--text-secondary)" }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          color="var(--text-secondary)"
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-option ${
                option.value === value ? "selected" : ""
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [showReporterModal, setShowReporterModal] = useState<string | null>(
    null
  );
  const [showEditorModal, setShowEditorModal] = useState<string | null>(null);

  const [newCase, setNewCase] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newLocationType, setNewLocationType] = useState("Remote");
  const [newCity, setNewCity] = useState("");

  const [selectedReporter, setSelectedReporter] = useState("");
  const [selectedEditor, setSelectedEditor] = useState("");

  const fetchData = async () => {
    try {
      const [jobsRes, repRes, edRes] = await Promise.all([
        fetch(`${API_BASE}/jobs`),
        fetch(`${API_BASE}/reporters`),
        fetch(`${API_BASE}/editors`),
      ]);
      setJobs(await jobsRes.json());
      setReporters(await repRes.json());
      setEditors(await edRes.json());
    } catch (e) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseName: newCase,
        durationMinutes: parseInt(newDuration, 10),
        locationType: newLocationType,
        city: newLocationType === "Physical" ? newCity : undefined,
      }),
    });
    setShowJobModal(false);
    setNewCase("");
    setNewDuration("");
    setNewCity("");
    setNewLocationType("Remote");
    fetchData();
  };

  const handleAssignReporter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReporterModal) return;
    await fetch(`${API_BASE}/jobs/${showReporterModal}/assign-reporter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        selectedReporter ? { reporterId: selectedReporter } : {}
      ),
    });
    setShowReporterModal(null);
    setSelectedReporter("");
    fetchData();
  };

  const handleAssignEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditorModal) return;
    await fetch(`${API_BASE}/jobs/${showEditorModal}/assign-editor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedEditor ? { editorId: selectedEditor } : {}),
    });
    setShowEditorModal(null);
    setSelectedEditor("");
    fetchData();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await fetch(`${API_BASE}/jobs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleGetPayout = async (id: string) => {
    await fetch(`${API_BASE}/jobs/${id}/payment`);
    fetchData();
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  const filteredJobs = useMemo(() => {
    return [...jobs]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .filter((job) => {
        const matchSearch = job.caseName
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

        const matchStatus =
          statusFilter === "All" || job.status === statusFilter;

        return matchSearch && matchStatus;
      });
  }, [jobs, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter((j) => j.status === "COMPLETED").length;
    const active = total - completed;
    const payout = jobs.reduce(
      (acc, j) => acc + (j.reporterPayment || 0) + (j.editorPayment || 0),
      0
    );
    return { total, active, completed, payout };
  }, [jobs]);

  if (loading)
    return (
      <div
        className="container"
        style={{ textAlign: "center", marginTop: "100px" }}
      >
        Loading...
      </div>
    );

  return (
    <div className="container">
      <header className="header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              background: "rgba(88,166,255,0.1)",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid rgba(88,166,255,0.2)",
            }}
          >
            <Briefcase size={32} color="#58a6ff" />
          </div>
          <div>
            <h1>Workflow Manager</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Court Reporting Operations Dashboard
            </p>
          </div>
        </div>
        <button className="btn primary" onClick={() => setShowJobModal(true)}>
          <Plus size={16} /> New Job
        </button>
      </header>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Jobs</span>
          <span className="summary-value">{stats.total}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Active Jobs</span>
          <span
            className="summary-value"
            style={{ color: "var(--status-new)" }}
          >
            {stats.active}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Completed Jobs</span>
          <span
            className="summary-value"
            style={{ color: "var(--status-completed)" }}
          >
            {stats.completed}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Payout</span>
          <span className="summary-value">
            Rp{" "}
            {stats.payout >= 1000000
              ? (stats.payout / 1000000).toFixed(1) + "M"
              : stats.payout.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ width: "200px" }}>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "All", label: "All Statuses" },
              { value: "NEW", label: "New" },
              { value: "ASSIGNED", label: "Assigned" },
              { value: "TRANSCRIBED", label: "Transcribed" },
              { value: "REVIEWED", label: "Reviewed" },
              { value: "COMPLETED", label: "Completed" },
            ]}
          />
        </div>
      </div>

      <div className="dashboard-grid">
        {filteredJobs.map((job) => {
          const pct = PROGRESS_PCT[job.status] || 0;
          let progressColor = `var(--status-${job.status.toLowerCase()})`;

          return (
            <div
              key={job.id}
              className={`glass-panel card-border-${job.status.toLowerCase()}`}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "8px",
                }}
              >
                <h3
                  className="job-title"
                  style={{ margin: 0, paddingRight: "12px" }}
                >
                  {job.caseName}
                </h3>
                <span className={`badge ${job.status.toLowerCase()}`}>
                  {job.status}
                </span>
              </div>

              <div className="job-meta" style={{ marginBottom: 16 }}>
                {job.locationType === "Physical" && job.city ? (
                  <span className="meta-item">
                    <MapPin size={14} /> {job.city} ({job.durationMinutes} min)
                  </span>
                ) : (
                  <span className="meta-item">
                    <MapPin size={14} /> Remote ({job.durationMinutes} min)
                  </span>
                )}
              </div>

              {/* Progress Bar Workflow */}
              <div className="progress-container">
                <div className="progress-header">
                  <span>WORKFLOW</span>
                  <span>{pct}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, background: progressColor }}
                  ></div>
                </div>
              </div>

              {/* Assignments with Avatars */}
              <div className="assignments">
                <div className="assign-row">
                  {job.reporter ? (
                    <>
                      <div className="avatar">
                        {getInitials(job.reporter.name)}
                      </div>
                      <div className="assign-info">
                        <span className="assign-role">Reporter</span>
                        <span className="assign-name">{job.reporter.name}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="avatar"
                        style={{
                          background: "transparent",
                          border: "1px dashed var(--warning-color)",
                          color: "var(--warning-color)",
                        }}
                      >
                        <AlertTriangle size={16} />
                      </div>
                      <div className="assign-info">
                        <span className="assign-role">Reporter</span>
                        <span className="empty-state">
                          Assign reporter to continue
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="assign-row">
                  {job.editor ? (
                    <>
                      <div className="avatar">
                        {getInitials(job.editor.name)}
                      </div>
                      <div className="assign-info">
                        <span className="assign-role">Editor</span>
                        <span className="assign-name">{job.editor.name}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="avatar"
                        style={{
                          background: "transparent",
                          border: "1px dashed var(--glass-border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <User size={16} />
                      </div>
                      <div className="assign-info">
                        <span className="assign-role">Editor</span>
                        {job.status === "NEW" || job.status === "ASSIGNED" ? (
                          <span
                            className="empty-state"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Pending transcription
                          </span>
                        ) : (
                          <span className="empty-state">Assign an editor</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "auto" }}>
                {job.status !== "COMPLETED" && (
                  <div className="actions">
                    <span className="action-label">Next Action</span>
                    {job.status === "NEW" && (
                      <button
                        className="btn primary"
                        style={{ width: "100%" }}
                        onClick={() => setShowReporterModal(job.id)}
                      >
                        Assign Reporter <ChevronRight size={14} />
                      </button>
                    )}

                    {job.status === "ASSIGNED" && (
                      <button
                        className="btn"
                        style={{ width: "100%" }}
                        onClick={() =>
                          handleUpdateStatus(job.id, "TRANSCRIBED")
                        }
                      >
                        <CheckCircle2 size={14} color="#e3b341" /> Mark
                        Transcribed
                      </button>
                    )}

                    {job.status === "TRANSCRIBED" && (
                      <button
                        className="btn primary"
                        style={{ width: "100%" }}
                        onClick={() => setShowEditorModal(job.id)}
                      >
                        Assign Editor <ChevronRight size={14} />
                      </button>
                    )}

                    {job.status === "REVIEWED" && (
                      <button
                        className="btn"
                        style={{ width: "100%" }}
                        onClick={() => handleUpdateStatus(job.id, "COMPLETED")}
                      >
                        <CheckCircle2 size={14} color="#56d364" /> Mark
                        Completed
                      </button>
                    )}
                  </div>
                )}

                {job.status === "COMPLETED" && job.reporterPayment === null && (
                  <div className="actions">
                    <span className="action-label">Next Action</span>
                    <button
                      className="btn primary"
                      style={{ width: "100%" }}
                      onClick={() => handleGetPayout(job.id)}
                    >
                      Calculate Payout
                    </button>
                  </div>
                )}

                {job.reporterPayment !== null &&
                  job.reporterPayment !== undefined && (
                    <div className="payout-box" style={{ display: "block" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          className="payout-label"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Reporter Payment
                        </span>
                        <span
                          className="payout-amount"
                          style={{ fontWeight: "normal" }}
                        >
                          Rp {job.reporterPayment.toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          paddingBottom: "12px",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <span
                          className="payout-label"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Editor Payment
                        </span>
                        <span
                          className="payout-amount"
                          style={{ fontWeight: "normal" }}
                        >
                          Rp {(job.editorPayment || 0).toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          className="payout-label"
                          style={{ fontWeight: "bold" }}
                        >
                          Total Payout
                        </span>
                        <span
                          className="payout-amount"
                          style={{ fontSize: "1.25rem" }}
                        >
                          Rp{" "}
                          {(
                            job.reporterPayment + (job.editorPayment || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          );
        })}
        {filteredJobs.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "60px",
              color: "var(--text-secondary)",
            }}
          >
            No jobs match your search criteria.
          </div>
        )}
      </div>

      {/* New Job Modal */}
      {showJobModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h2 className="modal-header" style={{ margin: 0 }}>
                Create New Job
              </h2>
              <button
                className="btn"
                style={{ padding: "4px" }}
                onClick={() => setShowJobModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateJob}>
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Case Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newCase}
                  onChange={(e) => setNewCase(e.target.value)}
                  required
                  placeholder="e.g. Property Dispute"
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  required
                  placeholder="120"
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Location Type
                </label>
                <CustomSelect
                  value={newLocationType}
                  onChange={setNewLocationType}
                  options={[
                    { value: "Remote", label: "Remote" },
                    { value: "Physical", label: "Physical" },
                  ]}
                />
              </div>
              {newLocationType === "Physical" && (
                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    City
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    required
                    placeholder="e.g. Jakarta"
                  />
                </div>
              )}
              <div
                className="modal-actions"
                style={{
                  marginTop: newLocationType === "Remote" ? "24px" : "0",
                }}
              >
                <button
                  type="submit"
                  className="btn primary"
                  style={{ width: "100%" }}
                >
                  Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Reporter Modal */}
      {showReporterModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h2 className="modal-header" style={{ margin: 0 }}>
                Assign Reporter
              </h2>
              <button
                className="btn"
                style={{ padding: "4px" }}
                onClick={() => setShowReporterModal(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAssignReporter}>
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Select Reporter
                </label>
                <CustomSelect
                  value={selectedReporter}
                  onChange={setSelectedReporter}
                  placeholder="-- Auto-assign (Best Match) --"
                  options={[
                    { value: "", label: "-- Auto-assign (Best Match) --" },
                    ...reporters.map((r) => ({
                      value: r.id,
                      label: `${r.name} (${r.location})`,
                    })),
                  ]}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn primary"
                  style={{ width: "100%" }}
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Editor Modal */}
      {showEditorModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h2 className="modal-header" style={{ margin: 0 }}>
                Assign Editor
              </h2>
              <button
                className="btn"
                style={{ padding: "4px" }}
                onClick={() => setShowEditorModal(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAssignEditor}>
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Select Editor
                </label>
                <CustomSelect
                  value={selectedEditor}
                  onChange={setSelectedEditor}
                  placeholder="-- Auto-assign --"
                  options={[
                    { value: "", label: "-- Auto-assign --" },
                    ...editors.map((e) => ({ value: e.id, label: e.name })),
                  ]}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn primary"
                  style={{ width: "100%" }}
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
