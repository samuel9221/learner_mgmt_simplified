// ============================================================================
// REPORTS PAGE
// Generate DB-backed learner, stream, class, and subject reports
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { FiBarChart2, FiDownload, FiFileText, FiUsers } from 'react-icons/fi';
import api from '../../services/api';

const get = async (url) => {
  const response = await api.get(url);
  return response.data;
};

const blobMessage = async (blob) => {
  const text = await blob.text().catch(() => '');
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    return parsed.message || parsed.error || text;
  } catch {
    return text.slice(0, 240);
  }
};

const REPORT_MODES = [
  { id: 'mid_term', label: 'Mid Term Report', help: 'Uses only saved mid term marks.' },
  { id: 'end_of_term', label: 'End of Term Report', help: 'Uses only saved end of term marks.' },
  { id: 'combined', label: 'Combined Report', help: 'Uses mid term, end of term, final score, grade, and ranks.' },
];

const TARGETS = [
  { id: 'stream', label: 'Stream Reports', icon: FiUsers, color: 'blue', help: 'Report cards for every learner in a stream.' },
  { id: 'class', label: 'Class Reports', icon: FiUsers, color: 'green', help: 'Report cards for every learner in a class.' },
  { id: 'learner', label: 'Learner Report', icon: FiFileText, color: 'purple', help: 'A single learner report card.' },
  { id: 'subject', label: 'Subject Report', icon: FiBarChart2, color: 'yellow', help: 'Subject performance across learners.' },
];

const colorClasses = {
  blue: 'bg-blue-50 border-blue-600 text-blue-700 hover:bg-blue-100',
  green: 'bg-green-50 border-green-600 text-green-700 hover:bg-green-100',
  purple: 'bg-purple-50 border-purple-600 text-purple-700 hover:bg-purple-100',
  yellow: 'bg-yellow-50 border-yellow-600 text-yellow-700 hover:bg-yellow-100',
};

const ReportsPage = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [streams, setStreams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [learners, setLearners] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('stream');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLearner, setSelectedLearner] = useState('');
  const [preferredTermId, setPreferredTermId] = useState('');

  const [loading, setLoading] = useState(false);
  const [downloadingMode, setDownloadingMode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    const loadInitialFilters = async () => {
      setError('');
      try {
        const [yearsRes, currentTermRes] = await Promise.all([
          get('/academic-years'),
          get('/terms/current').catch(() => ({ success: false })),
        ]);

        if (!active) return;

        const years = yearsRes.success && Array.isArray(yearsRes.data) ? yearsRes.data : [];
        const currentTerm = currentTermRes.success ? currentTermRes.data : null;
        const currentYear = years.find(y => y.is_current);

        setAcademicYears(years);
        setPreferredTermId(currentTerm?.id || '');
        setSelectedYear(currentTerm?.academic_year_id || currentYear?.id || years[0]?.id || '');
      } catch (e) {
        if (active) setError(e.response?.data?.message || e.message || 'Failed to load academic years');
      }
    };

    loadInitialFilters();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedYear) {
      setTerms([]);
      setStreams([]);
      setClasses([]);
      setSubjects([]);
      setLearners([]);
      setSelectedTerm('');
      return;
    }

    let active = true;

    const loadYearData = async () => {
      setLoading(true);
      setError('');
      try {
        const [termsRes, streamsRes, classesRes, subjectsRes] = await Promise.all([
          get(`/terms?academic_year_id=${selectedYear}`),
          get(`/streams?academic_year_id=${selectedYear}`),
          get(`/classes?academic_year_id=${selectedYear}`),
          get(`/subjects?academic_year_id=${selectedYear}&limit=500`),
        ]);

        if (!active) return;

        const yearTerms = termsRes.success && Array.isArray(termsRes.data) ? termsRes.data : [];
        const preferredTerm = yearTerms.find(t => String(t.id) === String(preferredTermId));
        const currentTerm = yearTerms.find(t => t.is_current);

        setTerms(yearTerms);
        setStreams(streamsRes.success && Array.isArray(streamsRes.data) ? streamsRes.data : []);
        setClasses(classesRes.success && Array.isArray(classesRes.data) ? classesRes.data : []);
        setSubjects(subjectsRes.success && Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
        setSelectedStream('');
        setSelectedClass('');
        setSelectedSubject('');
        setSelectedLearner('');
        setSelectedTerm(previousTerm => (
          yearTerms.some(t => String(t.id) === String(previousTerm))
            ? previousTerm
            : (preferredTerm?.id || currentTerm?.id || '')
        ));
        setPreferredTermId('');
      } catch (e) {
        if (active) setError(e.response?.data?.message || e.message || 'Failed to load report filters');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadYearData();
    return () => { active = false; };
  }, [selectedYear, preferredTermId]);

  useEffect(() => {
    if (!selectedYear || selectedTarget !== 'learner') {
      setLearners([]);
      setSelectedLearner('');
      return;
    }

    let active = true;
    const streamPart = selectedStream ? `&stream_id=${selectedStream}` : '';

    get(`/learners?academic_year_id=${selectedYear}${streamPart}&limit=500`)
      .then(d => {
        if (!active) return;
        setLearners(d.success && Array.isArray(d.data) ? d.data : []);
      })
      .catch(e => {
        if (active) setError(e.response?.data?.message || e.message || 'Failed to load learners');
      });

    return () => { active = false; };
  }, [selectedYear, selectedStream, selectedTarget]);

  const selectedYearObj = academicYears.find(y => String(y.id) === String(selectedYear));
  const selectedTermObj = terms.find(t => String(t.id) === String(selectedTerm));
  const selectedStreamObj = streams.find(s => String(s.id) === String(selectedStream));
  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
  const selectedSubjectObj = subjects.find(s => String(s.id) === String(selectedSubject));
  const selectedLearnerObj = learners.find(l => String(l.id) === String(selectedLearner));

  const contextLabel = [
    selectedYearObj?.year_name,
    selectedTermObj?.term_number ? `Term ${selectedTermObj.term_number}` : null,
    selectedTarget === 'stream' ? [selectedStreamObj?.class_name, selectedStreamObj?.stream_name].filter(Boolean).join(' ') : null,
    selectedTarget === 'class' ? selectedClassObj?.class_name : null,
    selectedTarget === 'subject' ? selectedSubjectObj?.subject_name : null,
    selectedTarget === 'learner' ? [selectedLearnerObj?.first_name, selectedLearnerObj?.last_name].filter(Boolean).join(' ') : null,
  ].filter(Boolean).join(' / ');

  const targetReady = useMemo(() => {
    if (!selectedTerm) return false;
    if (selectedTarget === 'stream') return !!selectedStream;
    if (selectedTarget === 'class') return !!selectedClass;
    if (selectedTarget === 'subject') return !!selectedSubject;
    if (selectedTarget === 'learner') return !!selectedLearner;
    return false;
  }, [selectedTerm, selectedTarget, selectedStream, selectedClass, selectedSubject, selectedLearner]);

  const reportUrl = (mode) => {
    const query = `mode=${mode}`;
    if (selectedTarget === 'stream') return `/reports/stream/${selectedStream}/term/${selectedTerm}/pdf?${query}`;
    if (selectedTarget === 'class') return `/reports/class/${selectedClass}/term/${selectedTerm}/pdf?${query}`;
    if (selectedTarget === 'subject') return `/reports/subject/${selectedSubject}/term/${selectedTerm}/pdf?${query}`;
    return `/reports/learner/${selectedLearner}/term/${selectedTerm}/pdf?${query}`;
  };

  const fileName = (mode) => {
    const label = contextLabel || selectedTarget;
    return `${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${mode}.pdf`;
  };

  const downloadReport = async (mode) => {
    if (!targetReady) {
      setError('Select a term and report target before generating a report.');
      return;
    }

    setDownloadingMode(mode);
    setError('');
    setSuccess('');
    try {
      const response = await api.get(reportUrl(mode), { responseType: 'blob', timeout: 120000 });
      const contentType = response.headers?.['content-type'] || response.data?.type || '';
      if (!contentType.includes('application/pdf')) {
        throw new Error(await blobMessage(response.data) || 'The server did not return a PDF file.');
      }
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName(mode);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setSuccess(`${REPORT_MODES.find(r => r.id === mode)?.label} generated.`);
    } catch (e) {
      const message = e.response?.data instanceof Blob ? await blobMessage(e.response.data) : e.response?.data?.message;
      setError(message || e.message || 'Failed to generate report');
    } finally {
      setDownloadingMode('');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate live report PDFs from saved exam results.</p>
        {contextLabel && (
          <div className="inline-flex mt-3 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold">
            {contextLabel}
          </div>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Report Target</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TARGETS.map((target) => {
            const Icon = target.icon;
            const active = selectedTarget === target.id;
            return (
              <button
                key={target.id}
                onClick={() => setSelectedTarget(target.id)}
                className={`p-5 rounded-lg border-l-4 text-left transition-all ${colorClasses[target.color]} ${active ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
              >
                <Icon className="w-8 h-8 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">{target.label}</h3>
                <p className="text-sm text-gray-600">{target.help}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <select className="form-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              <option value="">Select year</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select className="form-select" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} disabled={!selectedYear}>
              <option value="">Select term</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>Term {t.term_number}{t.is_current ? ' (Current)' : ''}</option>
              ))}
            </select>
          </div>

          {(selectedTarget === 'stream' || selectedTarget === 'learner') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stream</label>
              <select className="form-select" value={selectedStream} onChange={e => setSelectedStream(e.target.value)} disabled={!selectedTerm}>
                <option value="">{selectedTarget === 'learner' ? 'All streams' : 'Select stream'}</option>
                {streams.map(s => (
                  <option key={s.id} value={s.id}>{[s.class_name, s.stream_name].filter(Boolean).join(' ')}</option>
                ))}
              </select>
            </div>
          )}

          {selectedTarget === 'class' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={!selectedTerm}>
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
          )}

          {selectedTarget === 'subject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select className="form-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedTerm}>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
          )}

          {selectedTarget === 'learner' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Learner</label>
              <select className="form-select" value={selectedLearner} onChange={e => setSelectedLearner(e.target.value)} disabled={!selectedTerm}>
                <option value="">Select learner</option>
                {learners.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.admission_number} - {[l.first_name, l.last_name].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Generate PDF</h2>
            <p className="text-sm text-gray-600 mt-1">Choose the report period to generate from database marks.</p>
          </div>
          {loading && <span className="text-sm text-gray-500">Loading filters...</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REPORT_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => downloadReport(mode.id)}
              disabled={!targetReady || !!downloadingMode}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload className="w-5 h-5 mt-1 text-blue-600" />
              <span>
                <span className="block font-bold text-gray-900">
                  {downloadingMode === mode.id ? 'Generating...' : mode.label}
                </span>
                <span className="block text-sm text-gray-600 mt-1">{mode.help}</span>
              </span>
            </button>
          ))}
        </div>

        {!targetReady && (
          <p className="text-sm text-gray-500 mt-4">
            Select an academic year, term, and the required {selectedTarget} before generating a report.
          </p>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
