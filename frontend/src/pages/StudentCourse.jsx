import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Layers3, ListTree } from 'lucide-react';
import { getPublicCourseTopics } from '../api/publicCourses';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const StudentCourse = () => {
  const { courseCode } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openUnits, setOpenUnits] = useState({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPublicCourseTopics(courseCode)
      .then((data) => { if (active) { setCourse(data); setOpenUnits(Object.fromEntries((data.units || []).map((unit, index) => [unit.id || index, true]))); } })
      .catch((err) => { if (active) setError(err.response?.data?.detail || 'Unable to load this course syllabus.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseCode]);

  return (
    <div className="student-shell min-h-screen">
      <header className="student-topbar">
        <Link to="/" className="student-brand"><span className="student-brand-icon"><BookOpen size={19} /></span><span><strong>HOTS</strong><small>Study workspace</small></span></Link>
        <Link to="/login" className="student-admin-link">Developer portal</Link>
      </header>
      <main className="student-main student-detail-main">
        <Link to="/" className="student-back"><ArrowLeft size={16} /> All courses</Link>
        {loading && <div className="student-state"><LoadingSpinner size={26} /><p>Loading syllabus…</p></div>}
        {!loading && error && <div className="student-empty"><h2>Course unavailable</h2><p>{error}</p><Link to="/" className="student-back">Return to courses</Link></div>}
        {!loading && !error && course && <>
          <section className="student-course-hero">
            <span className="student-course-code">{course.course_code}</span>
            <h1>{course.course_name}</h1>
            <p>{course.description || 'Explore the units and topics in this course syllabus.'}</p>
            <div className="student-course-facts"><span><Layers3 size={16} /> {course.units?.length || 0} units</span><span><ListTree size={16} /> {(course.units || []).reduce((sum, unit) => sum + (unit.topics?.length || 0), 0)} topics</span></div>
          </section>
          <section className="student-syllabus">
            <div className="student-section-heading"><div><p className="student-eyebrow">COURSE OUTLINE</p><h2>Syllabus</h2></div></div>
            {!course.units?.length && <div className="student-empty"><BookOpen size={25} /><h3>Syllabus topics are not available yet</h3><p>Check back when the course outline has been added.</p></div>}
            {(course.units || []).map((unit, index) => {
              const key = unit.id || index;
              const isOpen = openUnits[key];
              return <article className="student-unit" key={key}>
                <button className="student-unit-toggle" onClick={() => setOpenUnits((current) => ({ ...current, [key]: !current[key] }))} aria-expanded={!!isOpen}>
                  <span className="student-unit-number">{String(unit.unit_number ?? index + 1).padStart(2, '0')}</span>
                  <span className="student-unit-title"><small>UNIT {unit.unit_number ?? index + 1}</small><strong>{unit.unit_name}</strong></span>
                  <span className="student-unit-count">{unit.topics?.length || 0} topics</span>
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                {isOpen && <div className="student-topics">{(unit.topics || []).map((topic, topicIndex) => <div className="student-topic" key={topic.id || topicIndex}>
                  <div className="student-topic-marker">{String(topicIndex + 1).padStart(2, '0')}</div>
                  <div className="student-topic-content"><h3>{topic.topic_name}</h3>{topic.cat_designation && <span className="student-topic-tag">{topic.cat_designation}</span>}
                    {!!topic.subtopics?.length && <ul>{topic.subtopics.map((subtopic, subIndex) => <li key={subtopic.id || subIndex}>{subtopic.title}{subtopic.description && <p>{subtopic.description}</p>}</li>)}</ul>}
                  </div>
                </div>)}</div>}
              </article>;
            })}
          </section>
        </>}
      </main>
    </div>
  );
};
