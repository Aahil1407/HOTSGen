import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Search, Shield, Sparkles } from 'lucide-react';
import { getPublicCourses } from '../api/publicCourses';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const StudentCatalog = () => {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicCourses()
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.response?.data?.detail || 'Course catalog is unavailable right now.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredCourses = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((course) =>
      `${course.course_code} ${course.course_name} ${course.description || ''}`.toLowerCase().includes(term)
    );
  }, [courses, query]);

  return (
    <div className="student-shell min-h-screen">
      <header className="student-topbar">
        <Link to="/" className="student-brand" aria-label="HOTS home">
          <span className="student-brand-icon"><BookOpen size={19} /></span>
          <span><strong>HOTS</strong><small>Study workspace</small></span>
        </Link>
        <Link to="/login" className="student-admin-link"><Shield size={15} /> Developer portal</Link>
      </header>

      <main className="student-main">
        <section className="student-hero">
          <div className="student-eyebrow"><Sparkles size={14} /> COURSE KNOWLEDGE BASE</div>
          <h1>Find your course.<br /><span>Explore what you’ll learn.</span></h1>
          <p>Browse course descriptions and structured syllabus topics in one place.</p>
          <label className="student-search">
            <Search size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by course code or name" />
            <span>⌘ K</span>
          </label>
        </section>

        <section className="student-catalog-section">
          <div className="student-section-heading">
            <div><p className="student-eyebrow">YOUR CATALOG</p><h2>Available courses</h2></div>
            <span>{loading ? 'Loading…' : `${filteredCourses.length} ${filteredCourses.length === 1 ? 'course' : 'courses'}`}</span>
          </div>
          {loading && <div className="student-state"><LoadingSpinner size={26} /><p>Loading the course catalog…</p></div>}
          {!loading && error && <div className="student-state student-error"><p>{error}</p><button onClick={() => { setLoading(true); setError(''); getPublicCourses().then(setCourses).catch((err) => setError(err.response?.data?.detail || 'Course catalog is unavailable right now.')).finally(() => setLoading(false)); }}>Try again</button></div>}
          {!loading && !error && filteredCourses.length === 0 && <div className="student-empty"><BookOpen size={25} /><h3>{courses.length ? 'No matching courses' : 'No courses published yet'}</h3><p>{courses.length ? 'Try another course code or name.' : 'Courses will appear here when they are available.'}</p></div>}
          {!loading && !error && filteredCourses.length > 0 && (
            <div className="student-course-grid">
              {filteredCourses.map((course, index) => (
                <Link to={`/course/${encodeURIComponent(course.course_code)}`} key={course.course_code} className="student-course-card">
                  <div className={`student-course-art art-${index % 4}`}><span>{course.course_code.slice(0, 2)}</span><BookOpen size={24} /></div>
                  <div className="student-course-card-body">
                    <div className="student-course-code">{course.course_code}</div>
                    <h3>{course.course_name}</h3>
                    <p>{course.description || 'Explore the course syllabus and topics.'}</p>
                    <span className="student-card-action">View syllabus <ArrowRight size={15} /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <footer className="student-footer">Course information is provided by the university knowledge base.</footer>
      </main>
    </div>
  );
};
