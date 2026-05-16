const express = require('express');
const { Notification } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');
const { createNotification } = require('../utils/notifications');

const router = express.Router();
router.use(verifyToken, attachTenant);

function publicNotification(req, item) {
  const plain = item?.toJSON ? item.toJSON() : item;
  const userId = Number(req.user?.id || 0);
  const readBy = Array.isArray(plain.read_by) ? plain.read_by.map(Number) : [];
  return {
    ...plain,
    is_read: readBy.includes(userId),
  };
}

function audienceFilter(req) {
  const userId = Number(req.user?.id || 0);
  const role = req.user?.role;
  return {
    $and: [
      tenantFilter(req, { is_active: { $ne: false } }),
      {
        $or: [
          { user_id: { $exists: false } },
          { user_id: null },
          { user_id: userId },
          { role: { $exists: false } },
          { role: null },
          { role },
        ],
      },
    ],
  };
}

router.get('/notifications', requirePermission('notification.view'), asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 30), 100);
  const rows = await Notification.find(audienceFilter(req)).sort({ id: -1 }).limit(limit);
  const notifications = rows.map((item) => publicNotification(req, item));
  const unread_count = notifications.filter((item) => !item.is_read).length;
  res.json({ notifications, unread_count });
}));

router.post('/notifications', requirePermission('notification.manage'), asyncHandler(async (req, res) => {
  const notification = await createNotification(req, req.body);
  res.status(201).json({ message: 'Notification created', notification: publicNotification(req, notification) });
}));

router.patch('/notifications/:id/read', requirePermission('notification.view'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const userId = Number(req.user?.id || 0);
  const row = await Notification.findOneAndUpdate(
    { ...tenantFilter(req, { id }), $or: [{ user_id: null }, { user_id: userId }, { role: null }, { role: req.user?.role }, { user_id: { $exists: false } }, { role: { $exists: false } }] },
    { $addToSet: { read_by: userId } },
    { new: true },
  );
  if (!row) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Notification marked as read', notification: publicNotification(req, row) });
}));

router.patch('/notifications/read-all', requirePermission('notification.view'), asyncHandler(async (req, res) => {
  const userId = Number(req.user?.id || 0);
  const result = await Notification.updateMany(audienceFilter(req), { $addToSet: { read_by: userId } });
  res.json({ message: 'All notifications marked as read', modified: result.modifiedCount || 0 });
}));

router.delete('/notifications/:id', requirePermission('notification.manage'), asyncHandler(async (req, res) => {
  const row = await Notification.findOneAndUpdate(
    tenantFilter(req, { id: Number(req.params.id) }),
    { $set: { is_active: false } },
    { new: true },
  );
  if (!row) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Notification archived' });
}));

module.exports = router;
