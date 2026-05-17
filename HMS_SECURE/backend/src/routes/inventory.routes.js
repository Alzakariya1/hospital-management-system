const express = require('express');
const {
  Supplier,
  InventoryItem,
  InventoryBatch,
  PurchaseOrder,
  SupplierBill,
  StockReceiving,
  StockReturn,
  InventoryTransaction,
  Medicine,
  PharmacySale,
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');
const { createNotification } = require('../utils/notifications');

const router = express.Router();
router.use(verifyToken, attachTenant);

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function today() { return new Date().toISOString().slice(0, 10); }
function code(prefix) { return `${prefix}-${Date.now()}`; }
function publicDoc(doc) { return doc?.toJSON ? doc.toJSON() : doc; }
function calcLineTotal(item = {}) {
  const qty = num(item.quantity ?? item.ordered_quantity, 0);
  const rate = num(item.unit_price ?? item.cost_price, 0);
  const tax = num(item.tax_amount, 0);
  const disc = num(item.discount_amount, 0);
  return qty * rate + tax - disc;
}
function totals(items = [], body = {}) {
  const subtotal = items.reduce((s, item) => s + (num(item.quantity ?? item.ordered_quantity, 0) * num(item.unit_price ?? item.cost_price, 0)), 0);
  const tax = num(body.tax_amount, items.reduce((s, item) => s + num(item.tax_amount, 0), 0));
  const discount = num(body.discount_amount, items.reduce((s, item) => s + num(item.discount_amount, 0), 0));
  return { subtotal, tax_amount: tax, discount_amount: discount, total_amount: subtotal + tax - discount };
}
async function logTransaction(req, payload) {
  return InventoryTransaction.create(tenantCreateData(req, {
    transaction_number: code('ITX'),
    performed_by: req.user?.id,
    ...payload,
  }));
}
async function ensureItemFromMedicine(req, med) {
  let item = await InventoryItem.findOne(tenantFilter(req, { medicine_id: med.id }));
  if (!item) {
    item = await InventoryItem.create(tenantCreateData(req, {
      item_code: `MED-${med.id}`,
      name: med.name,
      item_type: 'medicine',
      category: med.category || '',
      unit: med.unit || 'pcs',
      barcode: med.barcode || '',
      medicine_id: med.id,
      reorder_level: num(med.low_stock_threshold, 10),
      status: med.status || 'active',
    }));
  }
  return item;
}
async function syncMedicineFromBatch(req, batch) {
  if (!batch.medicine_id) return;
  const all = await InventoryBatch.find(tenantFilter(req, { medicine_id: batch.medicine_id, status: { $ne: 'cancelled' } })).lean();
  const qty = all.reduce((s, b) => s + num(b.quantity, 0), 0);
  await Medicine.updateOne(tenantFilter(req, { id: batch.medicine_id }), { $set: { quantity: qty, stock: qty } });
}

router.get('/summary', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  const [suppliers, items, batches, pos, bills, returns] = await Promise.all([
    Supplier.countDocuments(tenantFilter(req, { status: { $ne: 'archived' } })),
    InventoryItem.countDocuments(tenantFilter(req, { status: { $ne: 'archived' } })),
    InventoryBatch.find(tenantFilter(req, { status: { $ne: 'cancelled' } })).lean(),
    PurchaseOrder.find(tenantFilter(req)).lean(),
    SupplierBill.find(tenantFilter(req)).lean(),
    StockReturn.countDocuments(tenantFilter(req)),
  ]);
  const expiring = batches.filter((b) => b.expiry_date && b.expiry_date <= new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10));
  const lowStock = batches.filter((b) => num(b.quantity, 0) <= 0);
  res.json({
    suppliers,
    items,
    batches: batches.length,
    stock_units: batches.reduce((s, b) => s + num(b.quantity, 0), 0),
    purchase_orders: pos.length,
    open_purchase_orders: pos.filter((p) => !['received', 'cancelled'].includes(p.status)).length,
    pending_bills: bills.filter((b) => ['pending', 'partial'].includes(b.status)).length,
    payable_amount: bills.reduce((s, b) => s + num(b.balance_amount, num(b.amount, 0) - num(b.paid_amount, 0)), 0),
    expiry_alerts: expiring.length,
    stock_returns: returns,
    low_or_empty_batches: lowStock.length,
  });
}));

router.get('/suppliers', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  res.json(await Supplier.find(tenantFilter(req)).sort({ id: -1 }));
}));
router.post('/suppliers', requirePermission('pharmacy.create'), asyncHandler(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ message: 'Supplier name is required' });
  const row = await Supplier.create(tenantCreateData(req, { supplier_code: req.body.supplier_code || code('SUP'), ...req.body }));
  res.status(201).json({ message: 'Supplier created', supplier: publicDoc(row) });
}));
router.put('/suppliers/:id', requirePermission('pharmacy.stock.manage'), asyncHandler(async (req, res) => {
  const row = await Supplier.findOneAndUpdate(tenantFilter(req, { id: Number(req.params.id) }), { $set: req.body }, { new: true });
  if (!row) return res.status(404).json({ message: 'Supplier not found' });
  res.json({ message: 'Supplier updated', supplier: publicDoc(row) });
}));

router.get('/items', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.item_type) filter.item_type = req.query.item_type;
  res.json(await InventoryItem.find(filter).sort({ id: -1 }));
}));
router.post('/items', requirePermission('pharmacy.create'), asyncHandler(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ message: 'Item name is required' });
  const row = await InventoryItem.create(tenantCreateData(req, { item_code: req.body.item_code || code('ITM'), ...req.body }));
  res.status(201).json({ message: 'Inventory item created', item: publicDoc(row) });
}));
router.put('/items/:id', requirePermission('pharmacy.stock.manage'), asyncHandler(async (req, res) => {
  const row = await InventoryItem.findOneAndUpdate(tenantFilter(req, { id: Number(req.params.id) }), { $set: req.body }, { new: true });
  if (!row) return res.status(404).json({ message: 'Inventory item not found' });
  res.json({ message: 'Inventory item updated', item: publicDoc(row) });
}));

router.get('/batches', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.item_id) filter.item_id = Number(req.query.item_id);
  if (req.query.medicine_id) filter.medicine_id = Number(req.query.medicine_id);
  res.json(await InventoryBatch.find(filter).sort({ expiry_date: 1, id: -1 }));
}));
router.get('/expiry-alerts', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  const days = num(req.query.days, 30);
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await InventoryBatch.find(tenantFilter(req, { expiry_date: { $lte: until }, quantity: { $gt: 0 } })).sort({ expiry_date: 1 });
  res.json(rows);
}));

router.get('/purchase-orders', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  res.json(await PurchaseOrder.find(tenantFilter(req)).sort({ id: -1 }));
}));
router.post('/purchase-orders', requirePermission('pharmacy.create'), asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: 'At least one PO item is required' });
  const supplier = req.body.supplier_id ? await Supplier.findOne(tenantFilter(req, { id: Number(req.body.supplier_id) })).lean() : null;
  const cleanItems = items.map((item) => ({ ...item, quantity: num(item.quantity ?? item.ordered_quantity, 0), line_total: calcLineTotal(item) }));
  const row = await PurchaseOrder.create(tenantCreateData(req, {
    ...req.body,
    po_number: req.body.po_number || code('PO'),
    supplier_id: supplier?.id || num(req.body.supplier_id, 0),
    supplier_name: supplier?.name || req.body.supplier_name || '',
    order_date: req.body.order_date || today(),
    status: req.body.status || 'ordered',
    ...totals(cleanItems, req.body),
    items: cleanItems,
    created_by: req.user?.id,
  }));
  res.status(201).json({ message: 'Purchase order created', purchase_order: publicDoc(row) });
}));
router.put('/purchase-orders/:id/status', requirePermission('pharmacy.stock.manage'), asyncHandler(async (req, res) => {
  const row = await PurchaseOrder.findOneAndUpdate(tenantFilter(req, { id: Number(req.params.id) }), { $set: { status: req.body.status || 'ordered' } }, { new: true });
  if (!row) return res.status(404).json({ message: 'Purchase order not found' });
  res.json({ message: 'Purchase order status updated', purchase_order: publicDoc(row) });
}));

router.post('/stock-receivings', requirePermission('pharmacy.stock.manage'), asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: 'At least one received item is required' });
  const po = req.body.purchase_order_id ? await PurchaseOrder.findOne(tenantFilter(req, { id: Number(req.body.purchase_order_id) })) : null;
  const supplier = req.body.supplier_id ? await Supplier.findOne(tenantFilter(req, { id: Number(req.body.supplier_id) })).lean() : null;
  const receivedItems = [];
  for (const raw of items) {
    let item = raw.item_id ? await InventoryItem.findOne(tenantFilter(req, { id: Number(raw.item_id) })) : null;
    let med = raw.medicine_id ? await Medicine.findOne(tenantFilter(req, { id: Number(raw.medicine_id) })) : null;
    if (!item && med) item = await ensureItemFromMedicine(req, med);
    if (!item && raw.name) item = await InventoryItem.create(tenantCreateData(req, { item_code: code('ITM'), name: raw.name, item_type: raw.item_type || 'consumable', unit: raw.unit || 'pcs', barcode: raw.barcode || '' }));
    if (!item) return res.status(400).json({ message: 'Each received row needs item_id, medicine_id, or name' });
    const qty = Math.abs(num(raw.quantity, 0));
    if (!qty) return res.status(400).json({ message: `Quantity required for ${item.name}` });
    const batchNumber = raw.batch_number || `B-${Date.now()}-${item.id}`;
    let batch = await InventoryBatch.findOne(tenantFilter(req, { item_id: item.id, batch_number: batchNumber }));
    if (batch) {
      batch.quantity = num(batch.quantity, 0) + qty;
      batch.received_quantity = num(batch.received_quantity, 0) + qty;
      batch.expiry_date = raw.expiry_date || batch.expiry_date;
      batch.barcode = raw.barcode || batch.barcode;
      await batch.save();
    } else {
      batch = await InventoryBatch.create(tenantCreateData(req, {
        item_id: item.id,
        medicine_id: med?.id || item.medicine_id || raw.medicine_id,
        item_name: item.name,
        batch_number: batchNumber,
        barcode: raw.barcode || item.barcode || '',
        expiry_date: raw.expiry_date || '',
        manufacture_date: raw.manufacture_date || '',
        quantity: qty,
        received_quantity: qty,
        cost_price: num(raw.cost_price, raw.unit_price),
        selling_price: num(raw.selling_price, 0),
        supplier_id: supplier?.id || num(req.body.supplier_id, 0),
        supplier_name: supplier?.name || req.body.supplier_name || '',
        location: raw.location || item.location || '',
      }));
    }
    if (med) {
      med.batch_number = batch.batch_number;
      med.expiry_date = batch.expiry_date || med.expiry_date;
      med.cost_price = num(raw.cost_price, med.cost_price);
      med.selling_price = num(raw.selling_price, med.selling_price);
      await med.save();
      await syncMedicineFromBatch(req, batch);
    }
    await logTransaction(req, { transaction_type: 'receive', item_id: item.id, batch_id: batch.id, medicine_id: batch.medicine_id, item_name: item.name, batch_number: batch.batch_number, quantity: qty, balance_after: batch.quantity, reference_type: 'stock_receiving', notes: req.body.notes || '' });
    receivedItems.push({ ...raw, item_id: item.id, item_name: item.name, batch_id: batch.id, quantity: qty });
  }
  const receiving = await StockReceiving.create(tenantCreateData(req, { receiving_number: req.body.receiving_number || code('GRN'), purchase_order_id: po?.id || num(req.body.purchase_order_id, 0), supplier_id: supplier?.id || num(req.body.supplier_id, 0), supplier_name: supplier?.name || req.body.supplier_name || po?.supplier_name || '', received_date: req.body.received_date || today(), items: receivedItems, notes: req.body.notes || '', received_by: req.user?.id }));
  if (po) {
    po.status = 'received';
    await po.save();
  }
  await createNotification(req, { title: 'Stock received', message: `${receivedItems.length} inventory item(s) received.`, type: 'inventory', severity: 'success', module: 'pharmacy', entity_type: 'stock_receiving', entity_id: receiving.id, target_path: '/inventory' });
  res.status(201).json({ message: 'Stock received', receiving: publicDoc(receiving) });
}));
router.get('/stock-receivings', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  res.json(await StockReceiving.find(tenantFilter(req)).sort({ id: -1 }).limit(num(req.query.limit, 100)));
}));

router.post('/stock-returns', requirePermission('pharmacy.stock.manage'), asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: 'At least one return item is required' });
  const returned = [];
  for (const raw of items) {
    const batch = await InventoryBatch.findOne(tenantFilter(req, { id: Number(raw.batch_id) }));
    if (!batch) return res.status(404).json({ message: `Batch not found: ${raw.batch_id}` });
    const qty = Math.abs(num(raw.quantity, 0));
    if (!qty) return res.status(400).json({ message: 'Return quantity is required' });
    if (num(batch.quantity, 0) < qty) return res.status(400).json({ message: `Insufficient batch stock for ${batch.item_name}` });
    batch.quantity = num(batch.quantity, 0) - qty;
    await batch.save();
    await syncMedicineFromBatch(req, batch);
    await logTransaction(req, { transaction_type: 'return', item_id: batch.item_id, batch_id: batch.id, medicine_id: batch.medicine_id, item_name: batch.item_name, batch_number: batch.batch_number, quantity: -qty, balance_after: batch.quantity, reference_type: 'stock_return', notes: req.body.reason || '' });
    returned.push({ batch_id: batch.id, item_id: batch.item_id, item_name: batch.item_name, batch_number: batch.batch_number, quantity: qty });
  }
  const supplier = req.body.supplier_id ? await Supplier.findOne(tenantFilter(req, { id: Number(req.body.supplier_id) })).lean() : null;
  const row = await StockReturn.create(tenantCreateData(req, { return_number: req.body.return_number || code('RTN'), supplier_id: supplier?.id || num(req.body.supplier_id, 0), supplier_name: supplier?.name || req.body.supplier_name || '', return_date: req.body.return_date || today(), reason: req.body.reason || '', items: returned, notes: req.body.notes || '', returned_by: req.user?.id }));
  res.status(201).json({ message: 'Stock returned', stock_return: publicDoc(row) });
}));
router.get('/stock-returns', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  res.json(await StockReturn.find(tenantFilter(req)).sort({ id: -1 }).limit(num(req.query.limit, 100)));
}));

router.get('/supplier-bills', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  res.json(await SupplierBill.find(tenantFilter(req)).sort({ id: -1 }));
}));
router.post('/supplier-bills', requirePermission('pharmacy.create'), asyncHandler(async (req, res) => {
  const supplier = req.body.supplier_id ? await Supplier.findOne(tenantFilter(req, { id: Number(req.body.supplier_id) })).lean() : null;
  const amount = num(req.body.amount, 0);
  const paid = num(req.body.paid_amount, 0);
  const row = await SupplierBill.create(tenantCreateData(req, { ...req.body, bill_number: req.body.bill_number || code('SB'), supplier_id: supplier?.id || num(req.body.supplier_id, 0), supplier_name: supplier?.name || req.body.supplier_name || '', invoice_date: req.body.invoice_date || today(), amount, paid_amount: paid, balance_amount: amount - paid, status: amount - paid <= 0 ? 'paid' : paid > 0 ? 'partial' : (req.body.status || 'pending') }));
  res.status(201).json({ message: 'Supplier bill saved', supplier_bill: publicDoc(row) });
}));

router.post('/batch-dispense', requirePermission('pharmacy.stock.manage'), asyncHandler(async (req, res) => {
  const batch = await InventoryBatch.findOne(tenantFilter(req, { id: Number(req.body.batch_id) }));
  if (!batch) return res.status(404).json({ message: 'Batch not found' });
  const qty = Math.abs(num(req.body.quantity, 0));
  if (!qty) return res.status(400).json({ message: 'Quantity is required' });
  if (num(batch.quantity, 0) < qty) return res.status(400).json({ message: 'Insufficient batch stock' });
  const sellingPrice = num(req.body.selling_price, batch.selling_price);
  const sale = await PharmacySale.create(tenantCreateData(req, { sale_number: code('PH'), medicine_id: batch.medicine_id, medicine_name: batch.item_name, patient_id: req.body.patient_id || '', doctor_id: req.body.doctor_id || '', batch_id: batch.id, batch_number: batch.batch_number, quantity: qty, selling_price: sellingPrice, total_amount: qty * sellingPrice, sale_type: req.body.patient_id ? 'prescription' : 'direct', sold_at: new Date() }));
  batch.quantity = num(batch.quantity, 0) - qty;
  await batch.save();
  await syncMedicineFromBatch(req, batch);
  await logTransaction(req, { transaction_type: 'dispense', item_id: batch.item_id, batch_id: batch.id, medicine_id: batch.medicine_id, item_name: batch.item_name, batch_number: batch.batch_number, quantity: -qty, balance_after: batch.quantity, reference_type: 'pharmacy_sale', reference_id: sale.id, notes: req.body.notes || '' });
  res.status(201).json({ message: 'Batch dispensed', sale: publicDoc(sale), remaining_batch_quantity: batch.quantity });
}));

router.get('/transactions', requirePermission('pharmacy.view'), asyncHandler(async (req, res) => {
  res.json(await InventoryTransaction.find(tenantFilter(req)).sort({ id: -1 }).limit(num(req.query.limit, 100)));
}));

module.exports = router;
