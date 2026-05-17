const express = require('express');
const { verifyToken, requirePermission } = require('../middleware/auth');
const {
  Appointment,
  Bed,
  Billing,
  Doctor,
  IpdAdmission,
  InventoryBatch,
  InventoryItem,
  LabTest,
  Medicine,
  Patient,
  PharmacySale,
  RadiologyTest,
} = require('../models');

const router = express.Router();
router.use(verifyToken);

function tenantFilter(req) {
  if (req.user?.role === 'super_admin' && req.query.hospital_id) return { hospital_id: Number(req.query.hospital_id) };
  return { hospital_id: Number(req.user?.hospital_id || req.query.hospital_id || 1) };
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function dateKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function daysAgo(days) {
  const d = startOfDay();
  d.setDate(d.getDate() - Number(days || 0));
  return d;
}

function toAmount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function sumAmounts(rows, field = 'amount') {
  return rows.reduce((sum, row) => sum + toAmount(row[field]), 0);
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

async function count(model, filter) {
  return model.countDocuments(filter);
}

router.get('/command-center/summary', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const base = tenantFilter(req);
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const today = dateKey();
    const last30 = daysAgo(30);

    const [
      totalPatients,
      totalDoctors,
      totalAppointmentsToday,
      completedAppointmentsToday,
      totalBeds,
      occupiedBeds,
      bills30,
      unpaidBills,
      lowStockMedicines,
      expiringBatches,
      pendingLabReports,
      criticalIncidents,
      emergencyAdmissions,
    ] = await Promise.all([
      count(Patient, base),
      count(Doctor, base),
      count(Appointment, { ...base, appointment_date: today }),
      count(Appointment, { ...base, appointment_date: today, status: { $in: ['completed', 'done'] } }),
      count(Bed, base),
      count(Bed, { ...base, status: { $in: ['occupied', 'admitted'] } }),
      Billing.find({ ...base, created_at: { $gte: last30 } }).lean(),
      Billing.find({ ...base, status: { $in: ['unpaid', 'pending', 'partially_paid'] } }).lean(),
      Medicine.find({ ...base, $expr: { $lte: ['$quantity', '$low_stock_threshold'] } }).limit(20).lean().catch(() => []),
      InventoryBatch.find({ ...base, expiry_date: { $lte: daysAgo(-30) }, available_quantity: { $gt: 0 } }).sort({ expiry_date: 1 }).limit(20).lean().catch(() => []),
      count(LabTest, { ...base, test_status: { $in: ['sample_collected', 'result_entered', 'pending_approval'] } }),
      count(RadiologyTest, { ...base, priority: { $in: ['stat', 'urgent', 'emergency'] }, status: { $nin: ['approved', 'reported', 'completed', 'cancelled'] } }),
      count(IpdAdmission, { ...base, admission_type: { $in: ['emergency', 'ER', 'casualty'] }, status: { $nin: ['discharged', 'cancelled'] } }).catch(() => 0),
    ]);

    const revenue30 = sumAmounts(bills30);
    const pendingRevenue = sumAmounts(unpaidBills);

    res.json({
      period: { from: last30, to: todayEnd },
      kpis: {
        totalPatients,
        totalDoctors,
        appointmentsToday: totalAppointmentsToday,
        completedAppointmentsToday,
        appointmentCompletionRate: pct(completedAppointmentsToday, totalAppointmentsToday),
        totalBeds,
        occupiedBeds,
        availableBeds: Math.max(totalBeds - occupiedBeds, 0),
        occupancyRate: pct(occupiedBeds, totalBeds),
        revenue30,
        pendingRevenue,
        lowStockCount: lowStockMedicines.length,
        expiringBatchCount: expiringBatches.length,
        pendingLabReports,
        criticalIncidents,
        emergencyAdmissions,
      },
      alerts: {
        lowStockMedicines,
        expiringBatches,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/command-center/revenue', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const base = tenantFilter(req);
    const from = req.query.from ? new Date(req.query.from) : daysAgo(30);
    const to = req.query.to ? endOfDay(req.query.to) : endOfDay();
    const bills = await Billing.find({ ...base, created_at: { $gte: from, $lte: to } }).sort({ created_at: 1 }).lean();
    const byStatus = bills.reduce((acc, bill) => {
      const status = bill.status || 'unknown';
      acc[status] = (acc[status] || 0) + toAmount(bill.amount);
      return acc;
    }, {});
    const byDayMap = new Map();
    for (const bill of bills) {
      const key = new Date(bill.created_at || bill.updated_at || Date.now()).toISOString().slice(0, 10);
      byDayMap.set(key, (byDayMap.get(key) || 0) + toAmount(bill.amount));
    }
    res.json({
      totalRevenue: sumAmounts(bills),
      collectedRevenue: sumAmounts(bills.filter((b) => b.status === 'paid')),
      pendingRevenue: sumAmounts(bills.filter((b) => b.status !== 'paid')),
      billCount: bills.length,
      byStatus,
      byDay: Array.from(byDayMap.entries()).map(([date, amount]) => ({ date, amount })),
      recentBills: bills.slice(-10).reverse(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/command-center/occupancy', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const base = tenantFilter(req);
    const beds = await Bed.find(base).lean();
    const byStatus = beds.reduce((acc, bed) => {
      const status = bed.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const byWard = beds.reduce((acc, bed) => {
      const ward = bed.ward || 'General';
      if (!acc[ward]) acc[ward] = { ward, total: 0, occupied: 0, available: 0 };
      acc[ward].total += 1;
      if (['occupied', 'admitted'].includes(bed.status)) acc[ward].occupied += 1;
      if (['available', 'vacant'].includes(bed.status)) acc[ward].available += 1;
      return acc;
    }, {});
    res.json({ total: beds.length, byStatus, byWard: Object.values(byWard) });
  } catch (error) {
    next(error);
  }
});

router.get('/command-center/doctor-performance', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const base = tenantFilter(req);
    const from = req.query.from ? new Date(req.query.from) : daysAgo(30);
    const to = req.query.to ? endOfDay(req.query.to) : endOfDay();
    const [doctors, appointments, bills] = await Promise.all([
      Doctor.find(base).lean(),
      Appointment.find({ ...base, created_at: { $gte: from, $lte: to } }).lean(),
      Billing.find({ ...base, created_at: { $gte: from, $lte: to } }).lean(),
    ]);
    const rows = doctors.map((doctor) => {
      const doctorId = String(doctor.id || doctor.doctor_id || '');
      const appts = appointments.filter((a) => String(a.doctor_id) === doctorId || String(a.doctor_id) === String(doctor.doctor_id));
      const completed = appts.filter((a) => ['completed', 'done'].includes(a.status)).length;
      const revenue = bills.filter((b) => String(b.doctor_id || '') === doctorId || String(b.doctor_id || '') === String(doctor.doctor_id || '')).reduce((sum, b) => sum + toAmount(b.amount), 0);
      return {
        doctor_id: doctor.doctor_id || doctor.id,
        full_name: doctor.full_name,
        specialization: doctor.specialization,
        appointments: appts.length,
        completed,
        completionRate: pct(completed, appts.length),
        revenue,
      };
    }).sort((a, b) => b.appointments - a.appointments);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/command-center/queue', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const base = tenantFilter(req);
    const today = dateKey();
    const appointments = await Appointment.find({ ...base, appointment_date: today }).sort({ appointment_time: 1, created_at: 1 }).lean();
    const grouped = appointments.reduce((acc, appt) => {
      const status = appt.status || 'scheduled';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    res.json({ total: appointments.length, byStatus: grouped, queue: appointments.slice(0, 50) });
  } catch (error) {
    next(error);
  }
});

router.get('/command-center/pharmacy', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const base = tenantFilter(req);
    const from = req.query.from ? new Date(req.query.from) : daysAgo(30);
    const [medicines, items, batches, sales] = await Promise.all([
      Medicine.find(base).lean(),
      InventoryItem.find(base).lean().catch(() => []),
      InventoryBatch.find(base).lean().catch(() => []),
      PharmacySale.find({ ...base, created_at: { $gte: from } }).lean().catch(() => []),
    ]);
    const lowStock = medicines.filter((m) => Number(m.quantity || 0) <= Number(m.low_stock_threshold || 0));
    const expiring = batches.filter((b) => b.expiry_date && new Date(b.expiry_date) <= daysAgo(-30) && Number(b.available_quantity || 0) > 0);
    res.json({
      medicineCount: medicines.length,
      inventoryItemCount: items.length,
      batchCount: batches.length,
      lowStockCount: lowStock.length,
      expiringBatchCount: expiring.length,
      salesCount: sales.length,
      salesValue: sumAmounts(sales, 'total_amount'),
      lowStock: lowStock.slice(0, 20),
      expiring: expiring.slice(0, 20),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/command-center/lab-tat', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const base = tenantFilter(req);
    const from = req.query.from ? new Date(req.query.from) : daysAgo(30);
    const [labs, rads] = await Promise.all([
      LabTest.find({ ...base, created_at: { $gte: from } }).lean(),
      RadiologyTest.find({ ...base, created_at: { $gte: from } }).lean(),
    ]);
    const calcTat = (row) => {
      const start = row.sample_collected_at || row.created_at;
      const end = row.approved_at || row.reported_at || row.updated_at;
      if (!start || !end) return null;
      const hours = (new Date(end) - new Date(start)) / 36e5;
      return Number.isFinite(hours) && hours >= 0 ? Math.round(hours * 10) / 10 : null;
    };
    const all = [...labs.map((x) => ({ ...x, type: 'Lab' })), ...rads.map((x) => ({ ...x, type: 'Radiology' }))];
    const completed = all.map((x) => ({ ...x, tat_hours: calcTat(x) })).filter((x) => x.tat_hours !== null);
    const avgTat = completed.length ? Math.round((completed.reduce((s, x) => s + x.tat_hours, 0) / completed.length) * 10) / 10 : 0;
    const pending = all.filter((x) => !['approved', 'reported', 'completed', 'cancelled'].includes(x.status || x.test_status));
    res.json({
      totalTests: all.length,
      completedReports: completed.length,
      pendingReports: pending.length,
      averageTatHours: avgTat,
      recentCompleted: completed.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 20),
      pending: pending.slice(0, 20),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/command-center/emergency', requirePermission('analytics.view'), async (req, res, next) => {
  try {
    const base = tenantFilter(req);
    const today = dateKey();
    const [urgentAppointments, emergencyAdmissions, urgentLabs, urgentRads] = await Promise.all([
      Appointment.find({ ...base, appointment_date: today, priority: { $in: ['urgent', 'emergency', 'stat'] } }).sort({ appointment_time: 1 }).lean().catch(() => []),
      IpdAdmission.find({ ...base, admission_type: { $in: ['emergency', 'ER', 'casualty'] }, status: { $nin: ['discharged', 'cancelled'] } }).lean().catch(() => []),
      LabTest.find({ ...base, priority: { $in: ['urgent', 'emergency', 'stat'] }, test_status: { $nin: ['approved', 'reported', 'completed', 'cancelled'] } }).lean().catch(() => []),
      RadiologyTest.find({ ...base, priority: { $in: ['urgent', 'emergency', 'stat'] }, status: { $nin: ['approved', 'reported', 'completed', 'cancelled'] } }).lean().catch(() => []),
    ]);
    res.json({
      activeEmergencyCount: urgentAppointments.length + emergencyAdmissions.length + urgentLabs.length + urgentRads.length,
      urgentAppointments,
      emergencyAdmissions,
      urgentLabs,
      urgentRads,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
