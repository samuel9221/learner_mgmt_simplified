// ============================================================================
// LEARNER DETAIL PAGE
// View learner profile and enroll in stream
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiUserPlus, FiBook, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as learnerService from '../../services/learnerService';
import * as classService from '../../services/classService';
import * as subjectService from '../../services/subjectService';
import * as subjectCombinationService from '../../services/subjectCombinationService';
import * as academicYearService from '../../services/academicYearService';

const LearnerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [learner, setLearner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  
  // Enrollment form data
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [optionalSubjects, setOptionalSubjects] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [subsidiaries, setSubsidiaries] = useState([]);
  
  const [enrollData, setEnrollData] = useState({
    class_id: '',
    stream_id: '',
    academic_year_id: '',
    optional_subjects: [],
    combination_id: '',
    subsidiary_id: '',
  });

  useEffect(() => {
    fetchLearner();
  }, [id]);

  const fetchLearner = async () => {
    try {
      setLoading(true);
      const response = await learnerService.getLearnerById(id);
      if (response.success) {
        setLearner(response.data);
      }
    } catch (error) {
      toast.error('Failed to load learner details');
      navigate('/dashboard/learners');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEnrollModal = async () => {
    try {
      // Fetch enrollment options
      const [classesRes, yearsRes, combsRes, subsRes] = await Promise.all([
        classService.getClasses(),
        academicYearService.getAcademicYears(),
        subjectCombinationService.getCombinations({ is_active: true }),
        subjectService.getSubsidiarySubjects(),
      ]);

      if (classesRes.success) setClasses(classesRes.data);
      if (yearsRes.success) setAcademicYears(yearsRes.data);
      if (combsRes.success) setCombinations(combsRes.data);
      if (subsRes.success) {
        // Filter out GP (it's auto-assigned)
        const nonGPSubs = subsRes.data.filter(s => s.subject_code !== 'GP');
        setSubsidiaries(nonGPSubs);
      }

      setShowEnrollModal(true);
    } catch (error) {
      toast.error('Failed to load enrollment options');
    }
  };

  const handleClassChange = async (classId) => {
    setEnrollData({ ...enrollData, class_id: classId, stream_id: '' });
    
    // Find selected class and get its streams
    const selectedClass = classes.find(c => c.id === classId);
    if (selectedClass) {
      setStreams(selectedClass.streams || []);
      
      // Get optional subjects for this class level
      const classLevel = selectedClass.class_name;
      if (classLevel.match(/S[1-4]/)) {
        try {
          const response = await subjectService.getOptionalSubjects(classLevel);
          if (response.success) {
            setOptionalSubjects(response.data);
          }
        } catch (error) {
          console.error('Error fetching optional subjects:', error);
        }
      }
    }
  };

  const handleOptionalSubjectToggle = (subjectId) => {
    const current = enrollData.optional_subjects;
    if (current.includes(subjectId)) {
      setEnrollData({
        ...enrollData,
        optional_subjects: current.filter(id => id !== subjectId),
      });
    } else {
      if (current.length < 2) {
        setEnrollData({
          ...enrollData,
          optional_subjects: [...current, subjectId],
        });
      } else {
        toast.error('Maximum 2 optional subjects allowed');
      }
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    
    try {
      const selectedClass = classes.find(c => c.id === enrollData.class_id);
      const classLevel = selectedClass?.class_name;

      // Validate based on class level
      if (classLevel?.match(/S[1-4]/)) {
        if (enrollData.optional_subjects.length !== 2) {
          toast.error('Please select exactly 2 optional subjects');
          return;
        }
      } else if (classLevel?.match(/S[5-6]/)) {
        if (!enrollData.combination_id || !enrollData.subsidiary_id) {
          toast.error('Please select combination and subsidiary subject');
          return;
        }
      }

      const response = await learnerService.enrollLearner(id, enrollData);
      
      if (response.success) {
        toast.success('Learner enrolled successfully');
        setShowEnrollModal(false);
        fetchLearner();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to enroll learner';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!learner) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Learner not found</p>
      </div>
    );
  }

  const selectedClass = classes.find(c => c.id === enrollData.class_id);
  const isS1ToS4 = selectedClass?.class_name?.match(/S[1-4]/);
  const isS5ToS6 = selectedClass?.class_name?.match(/S[5-6]/);

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <Link
        to="/dashboard/learners"
        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <FiArrowLeft />
        <span>Back to Learners</span>
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-3xl">
                {learner.first_name[0]}{learner.last_name[0]}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {learner.first_name} {learner.middle_name} {learner.last_name}
              </h1>
              <p className="text-gray-600 mt-1">Admission #: {learner.admission_number}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  learner.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {learner.status}
                </span>
                <span className="text-sm text-gray-600">{learner.gender}</span>
                <span className="text-sm text-gray-600">
                  DOB: {new Date(learner.date_of_birth).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!learner.current_enrollment && (
              <button
                onClick={handleOpenEnrollModal}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <FiUserPlus className="w-5 h-5" />
                <span>Enroll</span>
              </button>
            )}
            <Link
              to={`/dashboard/learners/${id}/edit`}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiEdit2 className="w-5 h-5" />
              <span>Edit</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              {learner.phone_number && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900">{learner.phone_number}</p>
                </div>
              )}
              {learner.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900">{learner.email}</p>
                </div>
              )}
              {learner.address && (
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-gray-900">{learner.address}</p>
                </div>
              )}
              {learner.nationality && (
                <div>
                  <p className="text-sm text-gray-600">Nationality</p>
                  <p className="text-gray-900">{learner.nationality}</p>
                </div>
              )}
            </div>
          </div>

          {/* Guardian Information */}
          {learner.guardian_name && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Guardian Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-gray-900">{learner.guardian_name}</p>
                </div>
                {learner.guardian_phone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-gray-900">{learner.guardian_phone}</p>
                  </div>
                )}
                {learner.guardian_email && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-gray-900">{learner.guardian_email}</p>
                  </div>
                )}
                {learner.guardian_relationship && (
                  <div>
                    <p className="text-sm text-gray-600">Relationship</p>
                    <p className="text-gray-900">{learner.guardian_relationship}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medical Information */}
          {(learner.blood_group || learner.medical_conditions || learner.allergies) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Medical Information</h2>
              <div className="space-y-3">
                {learner.blood_group && (
                  <div>
                    <p className="text-sm text-gray-600">Blood Group</p>
                    <p className="text-gray-900">{learner.blood_group}</p>
                  </div>
                )}
                {learner.medical_conditions && (
                  <div>
                    <p className="text-sm text-gray-600">Medical Conditions</p>
                    <p className="text-gray-900">{learner.medical_conditions}</p>
                  </div>
                )}
                {learner.allergies && (
                  <div>
                    <p className="text-sm text-gray-600">Allergies</p>
                    <p className="text-gray-900">{learner.allergies}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Enrollment & Subjects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Enrollment */}
          {learner.current_enrollment ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Current Enrollment</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Academic Year</p>
                  <p className="text-lg font-semibold text-gray-900">{learner.current_enrollment.academic_year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Class & Stream</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {learner.current_enrollment.class_name} {learner.current_enrollment.stream_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Enrollment Date</p>
                  <p className="text-gray-900">
                    {new Date(learner.current_enrollment.enrollment_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                    {learner.current_enrollment.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <FiCalendar className="w-6 h-6 text-yellow-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-yellow-900">Not Enrolled</h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    This learner is not currently enrolled in any class. Click the "Enroll" button to assign them to a class and stream.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Assigned Subjects */}
          {learner.subjects && learner.subjects.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FiBook className="w-6 h-6 mr-2" />
                Assigned Subjects ({learner.subjects.length})
              </h2>
              
              {/* Group by type */}
              {learner.subjects.some(s => s.is_compulsory && !s.is_subsidiary) && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {learner.combination_name ? 'Principal Subjects' : 'Compulsory Subjects'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {learner.subjects
                      .filter(s => s.is_compulsory && !s.is_subsidiary)
                      .map((subject) => (
                        <div key={subject.id} className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            {subject.subject_code}
                          </span>
                          <span className="text-sm text-gray-900">{subject.subject_name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {learner.subjects.some(s => !s.is_compulsory && !s.is_subsidiary) && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Optional Subjects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {learner.subjects
                      .filter(s => !s.is_compulsory && !s.is_subsidiary)
                      .map((subject) => (
                        <div key={subject.id} className="flex items-center space-x-2 p-2 bg-yellow-50 rounded">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                            {subject.subject_code}
                          </span>
                          <span className="text-sm text-gray-900">{subject.subject_name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {learner.subjects.some(s => s.is_subsidiary) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Subsidiary Subjects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {learner.subjects
                      .filter(s => s.is_subsidiary)
                      .map((subject) => (
                        <div key={subject.id} className="flex items-center space-x-2 p-2 bg-purple-50 rounded">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                            {subject.subject_code}
                          </span>
                          <span className="text-sm text-gray-900">{subject.subject_name}</span>
                          {subject.subject_code === 'GP' && (
                            <span className="text-xs text-purple-600">(Auto)</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {learner.combination_name && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-900">
                    <strong>Combination:</strong> {learner.combination_name} ({learner.combination_code})
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Enroll Learner</h2>
            <form onSubmit={handleEnroll}>
              <div className="space-y-4">
                {/* Academic Year */}
                <div>
                  <label className="form-label">Academic Year *</label>
                  <select
                    value={enrollData.academic_year_id}
                    onChange={(e) => setEnrollData({...enrollData, academic_year_id: e.target.value})}
                    className="form-select"
                    required
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.year_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="form-label">Class *</label>
                  <select
                    value={enrollData.class_id}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stream */}
                {streams.length > 0 && (
                  <div>
                    <label className="form-label">Stream *</label>
                    <select
                      value={enrollData.stream_id}
                      onChange={(e) => setEnrollData({...enrollData, stream_id: e.target.value})}
                      className="form-select"
                      required
                    >
                      <option value="">Select Stream</option>
                      {streams.map((stream) => (
                        <option key={stream.id} value={stream.id}>
                          {stream.stream_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* S1-S4: Optional Subjects */}
                {isS1ToS4 && optionalSubjects.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Select 2 Optional Subjects *
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {optionalSubjects.map((subject) => (
                        <label
                          key={subject.id}
                          className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                            enrollData.optional_subjects.includes(subject.id)
                              ? 'bg-yellow-200 border-2 border-yellow-400'
                              : 'bg-white border-2 border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={enrollData.optional_subjects.includes(subject.id)}
                            onChange={() => handleOptionalSubjectToggle(subject.id)}
                            className="form-checkbox"
                          />
                          <span className="text-sm font-medium">{subject.subject_name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-700 mt-2">
                      Selected: {enrollData.optional_subjects.length}/2
                    </p>
                  </div>
                )}

                {/* S5-S6: Combination */}
                {isS5ToS6 && (
                  <>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Subject Combination *</h3>
                      <select
                        value={enrollData.combination_id}
                        onChange={(e) => setEnrollData({...enrollData, combination_id: e.target.value})}
                        className="form-select"
                        required
                      >
                        <option value="">Select Combination</option>
                        {combinations.map((comb) => (
                          <option key={comb.id} value={comb.id}>
                            {comb.combination_name} ({comb.combination_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Choose Subsidiary Subject *</h3>
                      <select
                        value={enrollData.subsidiary_id}
                        onChange={(e) => setEnrollData({...enrollData, subsidiary_id: e.target.value})}
                        className="form-select"
                        required
                      >
                        <option value="">Select Subsidiary</option>
                        {subsidiaries.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.subject_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-purple-700 mt-2">
                        Note: General Paper is automatically included
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Enroll Learner
                </button>
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerDetailPage;