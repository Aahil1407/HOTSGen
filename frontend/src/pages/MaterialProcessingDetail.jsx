import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, FileText } from 'lucide-react';
import { getMaterial, getMaterialAlignment, getMaterialChunks, getPipelineStatus } from '../api/materials';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';

const titleCase = (value = '') => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const isContentMaterial = (type) => ['lecture_material', 'reference_book'].includes(type);

export const MaterialProcessingDetail = () => {
  const { materialId } = useParams();
  const [material, setMaterial] = useState(null); const [pipeline, setPipeline] = useState(null); const [chunks, setChunks] = useState(null); const [alignment, setAlignment] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const file = await getMaterial(materialId);
        const state = await getPipelineStatus(materialId);
        let chunkData = null; let alignmentData = null;
        if (isContentMaterial(file.source_type)) {
          [chunkData, alignmentData] = await Promise.allSettled([getMaterialChunks(materialId), getMaterialAlignment(materialId)]).then((results) => results.map((item) => item.status === 'fulfilled' ? item.value : null));
        }
        if (active) { setMaterial(file); setPipeline(state); setChunks(chunkData); setAlignment(alignmentData); }
      } catch (err) { if (active) setError(err.response?.data?.detail || 'Unable to load material processing details.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [materialId]);
  if (loading) return <div className="admin-loading"><LoadingSpinner size={28}/>Loading material processing details…</div>;
  if (error || !material || !pipeline) return <div className="admin-page"><div className="admin-alert">{error || 'Material not found.'}</div><Link className="admin-text-action" to="/processing"><ArrowLeft size={15}/> Back to processing</Link></div>;
  const metrics = [
    { label: 'Pages processed', value: pipeline.extracted_page_count ?? 0 },
    ...(isContentMaterial(material.source_type) ? [{ label: 'Chunks created', value: pipeline.chunk_count ?? chunks?.total_chunks ?? 0 }] : [{ label: 'Questions extracted', value: pipeline.question_count ?? 0 }]),
    ...(isContentMaterial(material.source_type) ? [{ label: 'Embeddings stored', value: pipeline.embeddings_count ?? 0 }] : [{ label: 'Embeddings stored', value: pipeline.embeddings_count ?? 0 }]),
  ];
  return <div className="admin-page">
    <Link className="admin-detail-back" to="/processing"><ArrowLeft size={15}/> Processing</Link>
    <div className="admin-page-heading material-detail-heading"><div><p className="admin-kicker">Course details / {titleCase(material.source_type)} / {material.original_filename}</p><h1><FileText size={22}/>{material.original_filename}</h1><p>{titleCase(material.source_type)} · <Link to={`/courses/${encodeURIComponent(material.course_code)}`}>{material.course_code}</Link></p></div><StatusBadge status={pipeline.processing_status} errorMsg={pipeline.last_error || material.error_message}/></div>
    <section className="admin-panel pipeline-panel"><div className="admin-panel-heading"><h2>Processing pipeline</h2><span className="admin-small-muted">{pipeline.is_fully_ingested ? 'All reported stages complete' : 'Stage status from ingestion API'}</span></div><div className="pipeline-steps">{pipeline.stages?.map((stage, index) => <div className="pipeline-step" key={`${stage.stage}-${index}`}><span className={`pipeline-step-number ${stage.status}`}>{stage.status === 'completed' ? <Check size={14}/> : index + 1}</span><strong>{titleCase(stage.stage)}</strong><StatusBadge status={stage.status} size="xs"/>{stage.error && <small>{stage.error}</small>}{stage.message && <small>{stage.message}</small>}</div>)}</div></section>
    <div className="admin-detail-metrics">{metrics.map((metric) => <div className="admin-stat-card" key={metric.label}><strong>{metric.value}</strong><small>{metric.label}</small></div>)}</div>
    {alignment && <section className="admin-detail-two-col"><div className="admin-panel"><div className="admin-panel-heading"><h2>Syllabus alignment</h2><span className="admin-small-muted">{alignment.total_pages} segments</span></div><div className="alignment-counts"><div><b>{alignment.in_syllabus_count}</b><small>In syllabus</small></div><div><b>{alignment.out_of_syllabus_count}</b><small>Out of syllabus</small></div><div><b>{alignment.ambiguous_count}</b><small>Ambiguous</small></div></div></div><div className="admin-panel"><h2>Alignment records</h2><div className="admin-stage-list">{(alignment.segments || []).slice(0, 4).map((segment, index) => <div key={segment.id || index}><span className={`admin-status-dot ${segment.scope_status === 'in_syllabus' ? 'teal' : segment.scope_status === 'ambiguous' ? 'amber' : 'red'}`}/><b>Page {segment.page_number}</b><span>{titleCase(segment.scope_status)}</span><small>{segment.topic_name || segment.unit_name || 'No syllabus match'}</small></div>)}</div></div></section>}
    {isContentMaterial(material.source_type) && <section className="admin-panel admin-chunk-panel"><div className="admin-panel-heading"><div><h2>Chunk preview</h2><p className="admin-panel-subtitle">Stored chunk text and syllabus metadata for retrieval.</p></div><span className="admin-small-muted">{chunks?.total_chunks ?? pipeline.chunk_count ?? 0} chunks</span></div>{chunks?.chunks?.length ? <div className="admin-chunk-list">{chunks.chunks.slice(0, 8).map((chunk, index) => <article className="admin-chunk" key={chunk.id || index}><div className="admin-chunk-meta"><span>{chunk.unit ? `Unit ${chunk.unit}` : chunk.unit_id || 'Unit unassigned'}</span><span>{chunk.topic || chunk.topic_id || 'Topic unassigned'}</span><span>Page {chunk.page_number ?? '—'}</span><span>{titleCase(chunk.scope_status)}</span></div><p>{chunk.text}</p></article>)}</div> : <div className="admin-empty">No stored chunks are available for this material.</div>}</section>}
    {pipeline.last_error && <div className="admin-alert">{pipeline.last_error}</div>}
  </div>;
};
