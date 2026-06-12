// ============================================================================
// EXCEL EXPORT SERVICE
// API calls for downloading Excel files
// ============================================================================

import api from './api';

/**
 * Download class list for a stream as Excel
 */
export const downloadStreamClassList = async (streamId) => {
  try {
    const response = await api.get(`/classes/streams/${streamId}/download-class-list`, {
      responseType: 'blob',
    });
    
    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from response headers if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'class-list.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Class list downloaded successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Download stream marks (final results) for a term and stream as Excel
 */
export const downloadStreamMarks = async (termId, streamId) => {
  try {
    const response = await api.get(`/final-results/term/${termId}/stream/${streamId}/download`, {
      responseType: 'blob',
    });
    
    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from response headers if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'stream-marks.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Stream marks downloaded successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Download all users as Excel
 */
export const downloadUsersExcel = async () => {
  try {
    const response = await api.get('/users/download/excel', {
      responseType: 'blob',
    });
    
    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from response headers if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'users.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Users list downloaded successfully' };
  } catch (error) {
    throw error;
  }
};
