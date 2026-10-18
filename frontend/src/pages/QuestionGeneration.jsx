import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, Clock3, FileText, Sparkles } from 'lucide-react';
import { getGenerationCourses, getGeneratedQuestions, generateQuestions } from '../api/questions';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ThemeToggle } from '../components/common/ThemeToggle';

const getErrorDetails = (error) => {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'object' && detail) return detail;
  return { code: 'request_failed', message: detail || 'Could not complete the request. Please try again.' };
};

const fieldLabel = (items, id, nameField) => items.find((item) => item.id === id)?.[nameField] || '';

export const QuestionGeneration = () => {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [courseCode, setCourseCode] = useState(searchParams.get('course') || '');
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [count, setCount] = useState(3);
  const [questionType, setQuestionType] = useState('case_scenario');
  const [difficulty, setDifficulty] = useState('medium');
  const [bloomLevel, setBloomLevel] = useState('Analyze');
  const [marks, setMarks] = useState(10);
  const [history, setHistory] = useState([]);
  const [newQuestions, setNewQuestions] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pageError, setPageError] = useState('');
  const [courseNotice, setCourseNotice] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [generationError, setGenerationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    getGenerationCourses()
      .then((items) => {
        const readyCourses = Array.isArray(items) ? items : [];
        setCourses(readyCourses);
        const requestedCode = searchParams.get('course')?.toUpperCase();
        if (requestedCode && !readyCourses.some((course) => course.course_code === requestedCode)) {
          setCourseNotice(`${requestedCode} does not have embedded in-syllabus chunks available yet. Choose a course shown below to generate questions.`);
        }
        if (readyCourses.length && !readyCourses.some((course) => course.course_code === courseCode)) {
          setCourseCode(readyCourses.some((course) => course.course_code === requestedCode) ? requestedCode : readyCourses[0].course_code);
        }
      })
      .catch((error) => setPageError(getErrorDetails(error).message))
      .finally(() => setLoadingCourses(false));
  }, []);

  const course = courses.find((item) => item.course_code === courseCode);
  const units = course?.units || [];
  const unit = units.find((item) => item.id === unitId);
  const availableTopics = useMemo(() => unit ? (unit.topics || []) : units.flatMap((item) => item.topics || []), [unit, units]);

  useEffect(() => {
    if (!courseCode) { setHistory([]); return; }
    let active = true;
    setLoadingHistory(true);
    setHistoryError('');
    getGeneratedQuestions(courseCode)
      .then((items) => { if (active) setHistory(Array.isArray(items) ? items : []); })
      .catch((error) => { if (active) setHistoryError(getErrorDetails(error).message); })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [courseCode]);

  const handleGenerate = async (event) => {
    event.preventDefault();
    setGenerating(true);
    setGenerationError(null);
    setSuccessMessage('');
    setNewQuestions([]);
    try {
      const result = await generateQuestions({
        course_code: courseCode,
        unit_id: unitId || null,
        topic_id: topicId || null,
        count: Number(count),
        question_type: questionType,
        difficulty,
        bloom_level: bloomLevel,
        marks: Number(marks),
      });
      setNewQuestions(result.questions || []);
      setSuccessMessage(`Generated and saved ${result.questions?.length || 0} grounded question${result.questions?.length === 1 ? '' : 's'} using ${result.context_count} retrieved source chunks.`);
      try {
        const savedHistory = await getGeneratedQuestions(courseCode);
        setHistory(Array.isArray(savedHistory) ? savedHistory : []);
      } catch (historyLoadError) {
        setHistoryError(getErrorDetails(historyLoadError).message);
      }
    } catch (error) {
      setGenerationError(getErrorDetails(error));
    } finally {
      setGenerating(false);
    }
  };

  const renderQuestion = (question) => (
    <article className="question-result-card" key={question.id || question.question_text}>
      <div className="question-result-meta">
        <span>{question.course_code}</span><span>{question.bloom_level}</span><span>{question.difficulty}</span>
        <span>{question.marks} marks</span><span>{question.question_type}</span>
      </div>
      <h3>{question.question_text}</h3>
      <div className="question-answer-block"><b>Suggested answer</b><p>{question.answer || 'No answer was stored for this question.'}</p></div>
      {question.explanation && <div className="question-answer-block"><b>Explanation</b><p>{question.explanation}</p></div>}
      {!!question.sources?.length && <div className="question-source-list"><b><FileText size={14} /> Sources</b>{question.sources.map((source) => <span key={source.chunk_id}>Chunk {source.chunk_id.slice(-7)}{source.page_number ? ` · page ${source.page_number}` : ''}{source.unit_id ? ` · ${source.unit_id}` : ''}{source.topic_id ? ` · ${source.topic_id}` : ''}</span>)}</div>}
    </article>
  );

  return (
    <div className="student-shell min-h-screen">
      <header className="student-topbar">
        <Link to="/" className="student-brand" aria-label="HOTS home"><span className="student-brand-icon"><BookOpen size={19} /></span><span><strong>HOTS</strong><small>Study workspace</small></span></Link>
        <div className="student-header-actions"><ThemeToggle /><Link to="/login" className="student-admin-link">Developer portal</Link></div>
      </header>
      <main className="student-main question-generation-main">
        <Link to={courseCode ? `/course/${encodeURIComponent(courseCode)}` : '/'} className="student-back"><ArrowLeft size={16} /> {courseCode ? 'Course syllabus' : 'All courses'}</Link>
        <section className="question-generation-hero">
          <div className="student-eyebrow"><Sparkles size={14} /> RETRIEVAL-GROUNDED STUDY</div>
          <h1>Generate HOTS questions</h1>
          <p>Questions are generated from retrieved, syllabus-aligned material for your selected course.</p>
        </section>

        {loadingCourses && <div className="student-state"><LoadingSpinner size={26} /><p>Finding courses with embedded material…</p></div>}
        {!loadingCourses && pageError && <div className="question-alert error" role="alert">{pageError}</div>}
        {!loadingCourses && !pageError && courseNotice && <div className="question-alert info" role="status">{courseNotice}</div>}
        {!loadingCourses && !pageError && courses.length === 0 && <div className="student-empty question-empty"><BookOpen size={25} /><h2>No courses ready for generation</h2><p>Courses appear here after in-syllabus chunks have embeddings stored.</p><Link to="/" className="student-card-action">Browse courses</Link></div>}

        {!loadingCourses && !pageError && course && <div className="question-generation-layout">
          <form className="question-options-card" onSubmit={handleGenerate}>
            <div className="question-card-heading"><div><p className="student-eyebrow">SET UP YOUR PRACTICE</p><h2>Question settings</h2></div><Sparkles size={19} /></div>
            <label>Course<select value={courseCode} onChange={(event) => { setCourseCode(event.target.value); setUnitId(''); setTopicId(''); setNewQuestions([]); setSuccessMessage(''); setGenerationError(null); }}>
              {courses.map((item) => <option key={item.course_code} value={item.course_code}>{item.course_code} — {item.course_name}</option>)}
            </select></label>
            <label>Unit<select value={unitId} onChange={(event) => { setUnitId(event.target.value); setTopicId(''); }}><option value="">All units</option>{units.map((item, index) => <option key={item.id || index} value={item.id}>{item.unit_name}</option>)}</select></label>
            <label>Topic<select value={topicId} onChange={(event) => setTopicId(event.target.value)}><option value="">All topics in selection</option>{availableTopics.map((item, index) => <option key={item.id || index} value={item.id}>{item.topic_name}</option>)}</select></label>
            <div className="question-option-grid">
              <label>Question count<select value={count} onChange={(event) => setCount(event.target.value)}>{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <label>Question type<select value={questionType} onChange={(event) => setQuestionType(event.target.value)}><option value="case_scenario">Case / scenario</option><option value="analytical">Analytical</option><option value="design">Design</option><option value="numerical">Numerical</option></select></label>
              <label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
              <label>HOTS level<select value={bloomLevel} onChange={(event) => setBloomLevel(event.target.value)}><option>Apply</option><option>Analyze</option><option>Evaluate</option><option>Create</option></select></label>
              <label>Marks per question<input type="number" min="1" max="100" value={marks} onChange={(event) => setMarks(event.target.value)} required /></label>
            </div>
            {generationError && <div className={`question-alert ${generationError.code === 'empty_context' ? 'empty-context' : 'error'}`} role="alert"><b>{generationError.code === 'empty_context' ? 'No matching context' : generationError.code === 'vector_index_unavailable' ? 'Vector search is not ready' : 'Generation failed'}</b><span>{generationError.message}</span></div>}
            <button type="submit" className="question-generate-button" disabled={generating || !courseCode}><Sparkles size={17} />{generating ? 'Retrieving context and generating…' : `Generate ${count} question${Number(count) === 1 ? '' : 's'}`}</button>
            {generating && <div className="question-loading"><LoadingSpinner size={20} /><span>Searching the selected course, then generating and validating questions…</span></div>}
            {successMessage && <div className="question-alert success" role="status"><Check size={17} /><span>{successMessage}</span></div>}
          </form>

          <section className="question-history-card">
            <div className="question-card-heading"><div><p className="student-eyebrow">SAVED TO YOUR COURSE</p><h2>Generated questions</h2></div><span className="question-history-count">{history.length}</span></div>
            {newQuestions.length > 0 && <div className="question-results-group"><h3><Sparkles size={15} /> Just generated</h3>{newQuestions.map(renderQuestion)}</div>}
            <div className="question-results-group"><h3><Clock3 size={15} /> Previous questions</h3>
              {loadingHistory && <div className="question-history-state"><LoadingSpinner size={20} />Loading saved questions…</div>}
              {!loadingHistory && historyError && <div className="question-alert error" role="alert">{historyError}</div>}
              {!loadingHistory && !historyError && history.length === 0 && newQuestions.length === 0 && <div className="question-history-state">No saved generated questions for this course yet.</div>}
              {!loadingHistory && history.filter((item) => !newQuestions.some((created) => created.id === item.id)).map(renderQuestion)}
            </div>
          </section>
        </div>}
      </main>
    </div>
  );
};
