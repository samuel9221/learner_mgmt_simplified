// ============================================================================
// ADMIT LEARNER PAGE
// Form to admit new learner
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as learnerService from '../../services/learnerService';
import * as academicYearService from '../../services/academicYearService';

const AdmitLearnerPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  
  const [formData, setFormData] = useState({
    // Basic Info
    admission_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    
    // Entry Info
    entry_year_id: '',
    entry_class: '',
    former_school: '',
    
    // Contact Info
    nationality: 'Ugandan',
    phone_number: '',
    email: '',
    address: '',
    
    // Guardian Info
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    guardian_relationship: '',
    
    // Medical Info
    medical_conditions: '',
    allergies: '',
    blood_group: '',
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const response = await academicYearService.getAcademicYears();
      if (response.success) {
        setAcademicYears(response.data);
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await learnerService.admitLearner(formData);
      
      if (response.success) {
        toast.success('Learner admitted successfully');
        navigate('/dashboard/learners');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to admit learner';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admit New Learner</h1>
        <p className="text-gray-600 mt-1">Enter learner information to create their profile</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Admission Number *</label>
                <input
                  type="text"
                  name="admission_number"
                  value={formData.admission_number}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 2024/001"
                  required
                />
              </div>

              <div>
                <label className="form-label">Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Middle Name</label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Entry Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Entry Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Entry Year</label>
                <select
                  name="entry_year_id"
                  value={formData.entry_year_id}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select Year</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.year_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Entry Class</label>
                <select
                  name="entry_class"
                  value={formData.entry_class}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select Class</option>
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                  <option value="S3">S3</option>
                  <option value="S4">S4</option>
                  <option value="S5">S5</option>
                  <option value="S6">S6</option>
                </select>
              </div>

              <div>
                <label className="form-label">Former School</label>
                <input
                  type="text"
                  name="former_school"
                  value={formData.former_school}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Previous school attended"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="+256 700 000000"
                />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="learner@example.com"
                />
              </div>

              <div>
                <label className="form-label">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Home address"
                />
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Guardian Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Guardian Name</label>
                <input
                  type="text"
                  name="guardian_name"
                  value={formData.guardian_name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Parent/Guardian full name"
                />
              </div>

              <div>
                <label className="form-label">Guardian Phone *</label>
                <input
                  type="tel"
                  name="guardian_phone"
                  value={formData.guardian_phone}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="+256 700 000000"
                />
              </div>

              <div>
                <label className="form-label">Guardian Email</label>
                <input
                  type="email"
                  name="guardian_email"
                  value={formData.guardian_email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="guardian@example.com"
                />
              </div>

              <div>
                <label className="form-label">Relationship</label>
                <select
                  name="guardian_relationship"
                  value={formData.guardian_relationship}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select Relationship</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Medical Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="form-label">Medical Conditions</label>
                <textarea
                  name="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={handleChange}
                  className="form-input"
                  rows="3"
                  placeholder="Any medical conditions, disabilities, or special needs"
                />
              </div>

              <div>
                <label className="form-label">Blood Group</label>
                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="form-label">Allergies</label>
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  className="form-input"
                  rows="2"
                  placeholder="Any known allergies"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              to="/dashboard/learners"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FiSave className="w-5 h-5" />
              <span>{loading ? 'Admitting...' : 'Admit Learner'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdmitLearnerPage;