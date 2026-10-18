import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText, Search, Upload } from 'lucide-react';
import { getMaterials } from '../api/materials';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';

const prettyType = (type) => ({ syllabus: 'Syllabus', lecture_material: 'Lecture material', reference_book: 'Reference material', exam_paper: 'Exam paper' }[type] || type);
const sizeLabel = (bytes = 0) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const MaterialsPage = () => {
  const [materials, setMaterials] = useState([]); const [loading, setLoading] = useState(true); const [query, setQuery] = useState(''); const [status, setStatus] = useState('all'); const [error, setError] = useState('');
  useEffect(() => { getMaterials().then(setMaterials).catch((err) => setError(err.response?.data?.detail || 'Could not load materials.')).finally(() => setLoading(false)); }, []);
  const rows = useMemo(() => materials.filter((item) => `${item.original_filename} ${item.course_code} ${item.source_type}`.toLowerCase().includes(query.toLowerCase()) && (status === 'all' || item.processing_status === status)), [materials, query, status]);
  return <div className="admin-page">
    <div className="admin-page-heading"><div><p className="admin-kicker">Workspace / Library</p><h1>Materials</h1><p>Uploaded course files and their current processing status.</p></div><Link className="admin-primary" to="/courses"><Upload size={16}/> Upload material</Link></div>
    <div className="admin-filter-bar"><label className="admin-search"><Search size={16}/><input placeholder="Search materials…" value={query} onChange={(e) => setQuery(e.target.value)}/></label><select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="uploaded">Uploaded</option><option value="processing">Processing</option><option value="processed">Processed</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option></select></div>
    {error && <div className="admin-alert">{error}</div>}{loading ? <div className="admin-loading"><LoadingSpinner size={28}/>Loading materials…</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Material</th><th>Course</th><th>Category</th><th>Size</th><th>Status</th><th></th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><Link to={`/materials/${encodeURIComponent(item.id)}`} className="admin-file-cell admin-file-link"><FileText size={17}/><span><b>{item.original_filename}</b><small>{item.file_type?.toUpperCase()}</small></span></Link></td><td><Link to={`/courses/${encodeURIComponent(item.course_code)}`} className="admin-code-link">{item.course_code}</Link></td><td>{prettyType(item.source_type)}{item.exam_type ? ` · ${item.exam_type} ${item.year || ''}` : ''}</td><td>{sizeLabel(item.file_size_bytes)}</td><td><StatusBadge status={item.processing_status} errorMsg={item.error_message}/></td><td><Link className="admin-small-action" to={`/materials/${encodeURIComponent(item.id)}`} title="View processing details"><ArrowUpRight size={16}/></Link></td></tr>)}</tbody></table>{rows.length === 0 && <div className="admin-empty">No materials match these filters.</div>}</div>}
  </div>;
};
