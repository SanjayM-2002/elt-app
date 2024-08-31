'use client';

import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import Link from 'next/link';
import { emailState } from '../recoil/atom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Reports() {
  const email = useRecoilValue(emailState);
  const [reports, setReports] = useState([]);
  const [files, setFiles] = useState({ paymentReport: null, taxReport: null });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      if (email) {
        try {
          const response = await fetch(
            `http://localhost:5000/api/fetch-service/reports?email=${email}`
          );
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const data = await response.json();
          setReports(data);
        } catch (error) {
          console.error('Error fetching reports:', error);
        }
      }
    };

    fetchReports();
  }, [email]);

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    setFiles((prevFiles) => ({
      ...prevFiles,
      [name]: files[0],
    }));
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!files.paymentReport || !files.taxReport) {
      toast.error('Please select both files before uploading.');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('paymentReport', files.paymentReport);
    formData.append('taxReport', files.taxReport);
    formData.append('email', email);

    try {
      const response = await fetch(
        'http://localhost:5000/api/upload-service/upload',
        {
          method: 'POST',
          body: formData,
        }
      );
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      toast.success('Files uploaded successfully.');
      // Optionally refresh reports after upload
      setUploading(false);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files.');
      setUploading(false);
    }
  };

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>Reports</h1>
      <h1 className='text-2xl font-bold mb-4'>Email: {email}</h1>
      <div className='mb-4'>
        <h2 className='text-xl font-semibold mb-2'>Upload Reports</h2>
        <form onSubmit={handleUpload} className='space-y-4'>
          <div>
            <label className='block mb-2'>Payment Report (CSV):</label>
            <input
              type='file'
              name='paymentReport'
              accept='.csv'
              onChange={handleFileChange}
              className='border border-gray-300 rounded-md p-2'
            />
          </div>
          <div>
            <label className='block mb-2'>Tax Report (XLSX):</label>
            <input
              type='file'
              name='taxReport'
              accept='.xlsx'
              onChange={handleFileChange}
              className='border border-gray-300 rounded-md p-2'
            />
          </div>
          <button
            type='submit'
            disabled={uploading}
            className='bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400'
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </form>
      </div>
      <table className='min-w-full bg-white'>
        <thead>
          <tr>
            <th className='py-2 px-4 border-b'>Task ID</th>
            <th className='py-2 px-4 border-b'>Created At</th>
            <th className='py-2 px-4 border-b'>Details</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.taskId}>
              <td className='py-2 px-4 border-b'>{report.id}</td>
              <td className='py-2 px-4 border-b'>
                {new Date(report.createdAt).toLocaleString()}
              </td>
              <td className='py-2 px-4 border-b'>
                <Link
                  href={`/reports/${report.id}`}
                  className='text-blue-500 hover:underline'
                >
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ToastContainer />
    </div>
  );
}
