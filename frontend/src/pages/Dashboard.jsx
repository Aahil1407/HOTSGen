import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertCircle, ArrowRight, FileUp, Plus, RefreshCw } from 'lucide-react';
import { getCourses } from '../api/courses';
import { getMaterials } from '../api/materials';
import { getEmbeddingStatus } from '../api/embeddings';
import { AddCourseModal } from '../components/dashboard/AddCourseModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const CATEGORIES = ['syllabus', 'lecture_material', 'reference_book', 'exam_paper'];
const courseReady = (items) => CATEGORIES.every((type) => {
  const category = items.filter((item) => item.source_type === type);
  return category.length > 0 && category.every((item) => ['processed', 'completed'].includes(item.processing_status));
});

export const Dashboard = () => {
  const [courses, setCourses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [embeddingStatus, setEmbeddingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [courseRows, materialRows] = await Promise.all([getCourses(), getMaterials()]);
      setCourses(courseRows || []); setMaterials(materialRows || []);
      try { setEmbeddingStatus(await getEmbeddingStatus()); } catch { setEmbeddingStatus(null); }
    } catch (err) { setError(err.response?.data?.detail || 'Could not load dashboard data.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const byCourse = useMemo(() => Object.fromEntries(courses.map((course) => [course.course_code, materials.filter((item) => item.course_code === course.course_code)])), [courses, materials]);
  const attentionCount = materials.filter((item) => ['failed', 'pending'].includes(item.processing_status)).length;
  const activeCount = materials.filter((item) => ['uploaded', 'processing'].includes(item.processing_status)).length;
  const completedCount = materials.filter((item) => ['processed', 'completed'].includes(item.processing_status)).length;
  const recentCourses = [...courses].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)).slice(0, 5);
  const created = (course) => { setCourses((items) => [course, ...items]); };

  return <div className="admin-page">
    <div className="admin-page-heading"><div><p className="admin-kicker">Workspace overview</p><h1>Good morning, Admin</h1><p>Manage courses, learning materials and the HOTS knowledge base.</p></div><div className="admin-heading-actions"><button className="admin-icon-button" onClick={load} disabled={loading} title="Refresh"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button><button className="admin-primary" onClick={() => setIsAddModalOpen(true)}><Plus size={16} /> Create course</button></div></div>
    {error && <div className="admin-alert"><AlertCircle size={17} />{error}<button onClick={load}>Retry</button></div>}
    {loading ? <div className="admin-loading"><LoadingSpinner size={28} />Loading workspace data…</div> : <>
      <div className="admin-stat-grid">
        <div className="admin-stat-card"><span>Total Courses <i className="dot coral" /></span><strong>{courses.length}</strong><small>Registered courses</small></div>
        <div className="admin-stat-card"><span>Materials <i className="dot teal" /></span><strong>{materials.length}</strong><small>Uploaded documents</small></div>
        <div className="admin-stat-card"><span>Embeddings stored <i className="dot teal" /></span><strong>{embeddingStatus ? embeddingStatus.chunks_with_embeddings + embeddingStatus.questions_with_embeddings : '—'}</strong><small>{embeddingStatus ? `of ${embeddingStatus.total_chunks + embeddingStatus.total_questions} indexed records` : 'Coverage unavailable'}</small></div>
        <div className="admin-stat-card"><span>Needs Attention <i className="dot red" /></span><strong>{attentionCount}</strong><small>Pending or failed materials</small></div>
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-recent-panel"><div className="admin-panel-heading"><h2>Recent Courses</h2><Link to="/courses">View all <ArrowRight size={14} /></Link></div>
          {!recentCourses.length ? <div className="admin-empty">No courses yet. Create a course to get started.</div> : <div className="admin-recent-list">{recentCourses.map((course) => {
            const courseMaterials = byCourse[course.course_code] || [];
            const failed = courseMaterials.some((item) => item.processing_status === 'failed');
            const processing = courseMaterials.some((item) => ['uploaded', 'processing', 'pending'].includes(item.processing_status));
            const status = failed ? 'Needs attention' : processing ? 'Processing' : courseReady(courseMaterials) ? 'Complete' : 'Incomplete';
            const tone = failed ? 'red' : processing ? 'amber' : status === 'Complete' ? 'teal' : 'muted';
            return <Link to={`/courses/${encodeURIComponent(course.course_code)}`} className="admin-recent-row" key={course.course_code}><b className="admin-recent-code">{course.course_code}</b><span className="admin-recent-title"><strong>{course.course_name}</strong><small>{courseMaterials.length} materials · Updated {course.updated_at ? new Date(course.updated_at).toLocaleDateString() : 'recently'}</small></span><span className={`admin-status-dot ${tone}`} /> <span className="admin-row-status">{status}</span></Link>;
          })}</div>}
        </section>
        <section className="admin-panel admin-health-panel"><h2>Material processing</h2><p className="admin-panel-subtitle">Based on current material statuses</p>
          <div className="admin-health-row"><i className="dot teal"/><b>Completed</b><strong>{completedCount}</strong><span>Processed</span></div>
          <div className="admin-health-row"><i className="dot amber"/><b>In progress</b><strong>{activeCount}</strong><span>Uploaded / processing</span></div>
          <div className="admin-health-row"><i className="dot red"/><b>Needs attention</b><strong>{attentionCount}</strong><span>Pending / failed</span></div>
        </section>
        <section className="admin-panel admin-tasks-panel"><p className="admin-panel-subtitle">Common administrator tasks</p>
          <button className="admin-task-row" onClick={() => setIsAddModalOpen(true)}><span className="admin-task-icon coral-bg"><Plus size={18}/></span><span><b>Create a new course</b><small>Set up course details and start material ingestion.</small></span><ArrowRight size={16}/></button>
          <Link to="/materials" className="admin-task-row"><span className="admin-task-icon teal-bg"><FileUp size={18}/></span><span><b>Upload materials</b><small>Add syllabus, lectures, references or exam papers.</small></span><ArrowRight size={16}/></Link>
          <Link to="/processing" className="admin-task-row"><span className="admin-task-icon amber-bg"><Activity size={18}/></span><span><b>Review processing</b><small>Inspect ingestion stages and material status.</small></span><ArrowRight size={16}/></Link>
        </section>
        <section className="admin-panel admin-status-panel"><h2>Backend data</h2><p className="admin-panel-subtitle">Records available through current APIs</p><div className="admin-health-row"><i className="dot teal"/><b>Course records</b><span>{courses.length}</span></div><div className="admin-health-row"><i className="dot teal"/><b>Material records</b><span>{materials.length}</span></div><div className="admin-health-row"><i className="dot teal"/><b>Pipeline status</b><span>Per material</span></div></section>
      </div>
    </>}
    <AddCourseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onCourseCreated={created} />
  </div>;
};
