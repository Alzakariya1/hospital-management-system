const { Notification } = require('../models');

function hospitalIdFromReq(req) {
  return Number(req?.tenant?.hospital_id || req?.user?.hospital_id || 1);
}

async function createNotification(req, data = {}) {
  try {
    const title = String(data.title || '').trim();
    if (!title) return null;
    return await Notification.create({
      hospital_id: hospitalIdFromReq(req),
      title,
      message: data.message || '',
      type: data.type || 'system',
      severity: data.severity || 'info',
      module: data.module || 'system',
      entity_type: data.entity_type || null,
      entity_id: data.entity_id == null ? null : String(data.entity_id),
      target_path: data.target_path || null,
      user_id: data.user_id ? Number(data.user_id) : null,
      role: data.role || null,
      read_by: [],
      is_active: true,
      created_by: req?.user?.id || null,
    });
  } catch (error) {
    console.warn('Notification skipped:', error?.message || error);
    return null;
  }
}

async function createLowStockNotification(req, medicine) {
  if (!medicine) return null;
  const qty = Number(medicine.quantity ?? medicine.stock ?? 0);
  const threshold = Number(medicine.low_stock_threshold ?? 10);
  if (qty > threshold) return null;
  return createNotification(req, {
    title: 'Low stock alert',
    message: `${medicine.name || 'Medicine'} has ${qty} unit(s) remaining.`,
    type: 'pharmacy',
    severity: qty <= 0 ? 'critical' : 'warning',
    module: 'pharmacy',
    entity_type: 'medicine',
    entity_id: medicine.id,
    target_path: '/pharmacy',
  });
}

module.exports = { createNotification, createLowStockNotification };
