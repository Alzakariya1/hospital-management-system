const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, allowRoles } = require('../middleware/auth');
const { PilotDeployment, PilotTask, Hospital, AuditLog } = require('../models');
const router = express.Router();
router.use(verifyToken);
const adminOnly = allowRoles('super_admin','admin');
const DEFAULT_CHECKLIST = [
  'Tenant created and plan assigned','Admin user created','Core modules enabled','Demo/master data loaded','Initial patient data migration verified','Staff training completed','Backup schedule verified','Go-live approval captured'
];
async function audit(userId, action){ try{ await AuditLog.create({user_id:userId, action, module_name:'pilot'}); }catch(_){} }
router.get('/pilot/summary', adminOnly, asyncHandler(async(req,res)=>{
  const [total,planning,active,live,blocked,tasksOpen] = await Promise.all([
    PilotDeployment.countDocuments(), PilotDeployment.countDocuments({deployment_stage:'planning'}), PilotDeployment.countDocuments({deployment_stage:'active'}), PilotDeployment.countDocuments({deployment_stage:'live'}), PilotDeployment.countDocuments({deployment_stage:'blocked'}), PilotTask.countDocuments({status:{$ne:'done'}})
  ]);
  res.json({total,planning,active,live,blocked,tasksOpen});
}));
router.get('/pilot/deployments', adminOnly, asyncHandler(async(req,res)=>res.json(await PilotDeployment.find().sort({id:-1}).lean())));
router.post('/pilot/deployments', adminOnly, asyncHandler(async(req,res)=>{
  const b=req.body; const checklist=(b.checklist&&b.checklist.length?b.checklist:DEFAULT_CHECKLIST.map(x=>({title:x,status:'pending'})));
  const r=await PilotDeployment.create({...b, checklist}); await audit(req.user.id,`Created pilot deployment ${r.hospital_name}`); res.status(201).json(r);
}));
router.patch('/pilot/deployments/:id', adminOnly, asyncHandler(async(req,res)=>{ await PilotDeployment.updateOne({id:Number(req.params.id)},{$set:req.body}); await audit(req.user.id,`Updated pilot deployment ${req.params.id}`); res.json({message:'Pilot deployment updated'}); }));
router.post('/pilot/deployments/:id/link-hospital', adminOnly, asyncHandler(async(req,res)=>{ const pilot=await PilotDeployment.findOne({id:Number(req.params.id)}); if(!pilot) return res.status(404).json({message:'Pilot not found'}); const hospital=await Hospital.findOne({id:Number(req.body.hospital_id)}); if(!hospital) return res.status(404).json({message:'Hospital not found'}); pilot.hospital_id=hospital.id; pilot.hospital_name=hospital.name; await pilot.save(); res.json({message:'Hospital linked', pilot}); }));
router.get('/pilot/tasks', adminOnly, asyncHandler(async(req,res)=>{ const q=req.query.pilot_id?{pilot_id:Number(req.query.pilot_id)}:{}; res.json(await PilotTask.find(q).sort({id:-1}).lean()); }));
router.post('/pilot/tasks', adminOnly, asyncHandler(async(req,res)=>{ const r=await PilotTask.create(req.body); res.status(201).json(r); }));
router.patch('/pilot/tasks/:id', adminOnly, asyncHandler(async(req,res)=>{ const update={...req.body}; if(update.status==='done') update.completed_at=new Date(); await PilotTask.updateOne({id:Number(req.params.id)},{$set:update}); res.json({message:'Pilot task updated'}); }));
router.get('/pilot/readiness/:id', adminOnly, asyncHandler(async(req,res)=>{ const pilot=await PilotDeployment.findOne({id:Number(req.params.id)}).lean(); if(!pilot) return res.status(404).json({message:'Pilot not found'}); const tasks=await PilotTask.find({pilot_id:pilot.id}).lean(); const checklist=pilot.checklist||[]; const doneChecklist=checklist.filter(x=>x.status==='done'||x.completed).length; const doneTasks=tasks.filter(x=>x.status==='done').length; const total=checklist.length+tasks.length; const done=doneChecklist+doneTasks; res.json({pilot, tasks, readinessPercent: total?Math.round(done*100/total):0, openTasks:tasks.filter(x=>x.status!=='done').length}); }));
module.exports = router;
