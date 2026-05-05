// ZIP 1 - Enterprise HMS Frontend
// File: src/app/dashboard/page.jsx
// Next.js + React + Tailwind CSS

const stats = [
  { title: 'Total Patients', value: '12,540' },
  { title: 'Total Doctors', value: '245' },
  { title: 'Total Nurses', value: '310' },
  { title: 'Total Staff', value: '580' },
  { title: 'Appointments Today', value: '486' },
  { title: 'Available Beds', value: '128' },
  { title: 'ICU Availability', value: '18' },
  { title: 'Daily Revenue', value: '₹4,85,000' },
];

const quickActions = [
  'Add Patient',
  'Book Appointment',
  'Create Invoice',
  'Add Doctor',
  'Lab Test Booking',
  'Pharmacy Sale',
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Hospital Management Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Enterprise-level hospital operations control panel
            </p>
          </div>
          <button className="px-5 py-3 rounded-xl bg-black text-white font-medium">
            Generate Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border shadow-sm p-6"
            >
              <p className="text-sm text-gray-500">{item.title}</p>
              <h2 className="text-3xl font-bold mt-2">{item.value}</h2>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="border rounded-xl p-4 text-left hover:shadow-md transition"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="border-b pb-3">New patient registered</div>
              <div className="border-b pb-3">ICU bed allocated</div>
              <div className="border-b pb-3">Invoice payment completed</div>
              <div className="border-b pb-3">Lab report uploaded</div>
              <div className="pb-3">Doctor leave request submitted</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
