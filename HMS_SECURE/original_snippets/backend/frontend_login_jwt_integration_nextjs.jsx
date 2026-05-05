// Frontend Login + JWT Integration
// File: src/app/login/page.jsx
// Next.js + React + Axios + Redux Toolkit

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        'http://localhost:8081/api/auth/login',
        formData
      );

      const { token, user } = response.data;

      // Save JWT + user details
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-3xl font-bold mb-2">Hospital Login</h1>
        <p className="text-gray-500 mb-6">
          Secure access to Enterprise HMS
        </p>

        {error && (
          <div className="mb-4 rounded-xl border p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border rounded-xl px-4 py-3 outline-none"
              placeholder="admin@hospital.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border rounded-xl px-4 py-3 outline-none"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-3 bg-black text-white font-medium"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}


// --------------------------------------------
// File: src/services/api.js
// Protected Axios Instance
// --------------------------------------------

import axiosLib from 'axios';

export const api = axiosLib.create({
  baseURL: 'http://localhost:8081/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


// --------------------------------------------
// Example Protected Dashboard API Call
// File: src/app/dashboard/page.jsx
// --------------------------------------------

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export function DashboardStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  if (!stats) return <p>Loading dashboard...</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard Stats</h2>
      <p>Total Patients: {stats.totalPatients}</p>
      <p>Total Doctors: {stats.totalDoctors}</p>
      <p>Appointments: {stats.totalAppointments}</p>
      <p>Available Beds: {stats.availableBeds}</p>
      <p>Daily Revenue: ₹{stats.dailyRevenue}</p>
    </div>
  );
}
