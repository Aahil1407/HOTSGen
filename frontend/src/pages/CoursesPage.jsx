import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle2, Circle, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { deleteCourse, getCourses } from '../api/courses';
import { getMaterials } from '../api/materials';
import { AddCourseModal } from '../components/dashboard/AddCourseModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const TYPES = ['syllabus', 'lecture_material', 'reference_book', 'exam_paper'];
const labels = ['Syllabus', 'Lectures', 'References', 'Exam papers'];
const ready = (list) => TYPES.every((type) => { const subset = list.filter((item) => item.source_type === type); return subset.length && subset.every((item) => ['processed', 'completed'].includes(item.processing_status)); });

export const CoursesPage = () => {
  const [courses, setCourses] = useState([]); const [materials, setMaterials] = useState([]);
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all'); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [addOpen, setAddOpen] = useState(false); const [deletingCourse, setDeletingCourse] = useState('');
  const load = () => { setLoading(true); setError(''); Promise.all([getCourses(), getMaterials()]).then(([c, m]) => { setCourses(c || []); setMaterials(m || []); }).catch((err) => setError(err.response?.data?.detail || 'Could not load courses.')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const handleDelete = async (course) => {
    const confirmed = window.confirm(
      `Delete ${course.course_code} — ${course.course_name} and all associated materials, uploaded files, processing data, and generated questions? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingCourse(course.course_code);
    setError('');
    try {
      await deleteCourse(course.course_code);
      setCourses((current) => current.filter((item) => item.course_code !== course.course_code));
    } catch (err) {
      setError(err.response?.data?.detail || `Could not delete ${course.course_code}.`);
    } finally {
      setDeletingCourse('');
    }
  };
  const rows = useMemo(() => courses.map((course) => { const items = materials.filter((item) => item.course_code === course.course_code); const isReady = ready(items); const failed = items.some((item) => item.processing_status === 'failed' || item.processing_status === 'pending'); const processing = items.some((item) => ['uploaded', 'processing'].includes(item.processing_status)); return { course, items, isReady, failed, processing }; }).filter((row) => `${row.course.course_code} ${row.course.course_name}`.toLowerCase().includes(query.toLowerCase())).filter((row) => filter === 'all' || (filter === 'ready' && row.isReady) || (filter === 'processing' && row.processing) || (filter === 'attention' && row.failed)), [courses, materials, query, filter]);
  return <div className="admin-page">
    <div className="admin-page-heading"><div><p className="admin-kicker">Workspace / Catalog</p><h1>Courses</h1><p>Manage courses, materials, and RAG readiness.</p></div><button className="admin-primary" onClick={() => setAddOpen(true)}><Plus size={16}/> Create course</button></div>
    <div className="admin-filter-bar"><label className="admin-search"><Search size={16}/><input placeholder="Search courses…" value={query} onChange={(event) => setQuery(event.target.value)}/></label><div className="admin-filter-chips">{[['all','All courses'],['ready','Complete'],['processing','Processing'],['attention','Needs attention']].map(([value,label]) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
    {error && <div className="admin-alert"><AlertCircle size={17}/>{error}<button onClick={load}>Retry</button></div>}
    {loading ? <div className="admin-loading"><LoadingSpinner size={28}/>Loading courses…</div> : rows.length === 0 ? <div className="admin-empty admin-empty-box"><BookOpen size={26}/><h2>{courses.length ? 'No matching courses' : 'No courses available'}</h2><p>{courses.length ? 'Change the search or status filter.' : 'Create a course to start adding learning materials.'}</p></div> : <div className="admin-course-grid">{rows.map(({course,items,isReady,failed,processing}) => { const status = isReady ? 'Complete' : failed ? 'Needs attention' : processing ? 'Processing' : 'Incomplete'; const tone = isReady ? 'teal' : failed ? 'red' : processing ? 'amber' : 'muted'; return <div className="admin-course-card-shell" key={course.course_code}><Link to={`/courses/${encodeURIComponent(course.course_code)}`} className="admin-course-card"><div className="admin-course-card-top"><span>{course.course_code}</span><span className={`admin-pill ${tone}`}>{status}</span></div><h2>{course.course_name}</h2><p>{items.length} {items.length === 1 ? 'material' : 'materials'}{course.updated_at ? ` · Updated ${new Date(course.updated_at).toLocaleDateString()}` : ''}</p><div className="admin-course-readiness"><small>Material categories</small><div>{TYPES.map((type, index) => { const subset = items.filter((item) => item.source_type === type); const categoryReady = subset.length > 0 && subset.every((item) => ['processed','completed'].includes(item.processing_status)); return <span key={type} className={categoryReady ? 'category-done' : ''}>{categoryReady ? <CheckCircle2 size={14}/> : <Circle size={14}/>} {labels[index]}</span>; })}</div></div><strong className="admin-course-link">View course <span>→</span></strong></Link><button type="button" className="admin-course-delete" aria-label={`Delete course ${course.course_code}`} title="Delete course" disabled={Boolean(deletingCourse)} onClick={() => handleDelete(course)}><Trash2 size={15}/></button></div>; })}</div>}
    {!loading && <p className="admin-result-count">{rows.length} {rows.length === 1 ? 'course' : 'courses'} shown</p>}
    <AddCourseModal isOpen={addOpen} onClose={() => setAddOpen(false)} onCourseCreated={(course) => setCourses((current) => [course, ...current])}/>
  </div>;
};
