import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Bed, Calendar, LogOut, Pill, ReceiptText, Stethoscope, TestTube2, Users } from 'lucide-react';
import api from './api/client';
import './style.css';

const emptyPatient = { full_name:'', age:'', gender:'male', phone:'', email:'', address:'', blood_group:'', medical_notes:'' };
const emptyDoctor = { full_name:'', email:'', phone:'', specialization:'', qualification:'', consultation_fee:'' };

function Login({ onLogin }) {
  const [form,setForm]=useState({email:'admin@hospital.com',password:'admin12345'}); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e){e.preventDefault(); setLoading(true); setError(''); try{const {data}=await api.post('/auth/login',form); localStorage.setItem('token',data.token); localStorage.setItem('user',JSON.stringify(data.user)); onLogin(data.user);}catch(err){setError(err.response?.data?.message||'Login failed');}finally{setLoading(false)}}
  return <div className="loginWrap"><form className="card login" onSubmit={submit}><h1>Enterprise HMS</h1><p>Login to manage hospital operations.</p>{error&&<div className="error">{error}</div>}<input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button disabled={loading}>{loading?'Signing in...':'Login'}</button><small>After DB import, run backend seed to use admin@hospital.com / admin12345.</small></form></div>
}

function Stat({icon:Icon,title,value}){return <div className="stat"><Icon size={22}/><div><p>{title}</p><b>{value ?? 0}</b></div></div>}
function Table({rows}){ if(!rows?.length) return <p className="muted">No records found.</p>; return <div className="tableWrap"><table><thead><tr>{Object.keys(rows[0]).slice(0,7).map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{Object.keys(rows[0]).slice(0,7).map(k=><td key={k}>{String(r[k] ?? '')}</td>)}</tr>)}</tbody></table></div> }

function App(){
  const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('user')||'null')); const [tab,setTab]=useState('dashboard');
  const [stats,setStats]=useState({}); const [patients,setPatients]=useState([]); const [doctors,setDoctors]=useState([]); const [appointments,setAppointments]=useState([]); const [beds,setBeds]=useState([]); const [labs,setLabs]=useState([]); const [rads,setRads]=useState([]); const [meds,setMeds]=useState([]); const [bills,setBills]=useState([]);
  const [patient,setPatient]=useState(emptyPatient); const [doctor,setDoctor]=useState(emptyDoctor);
  async function load(){ if(!localStorage.getItem('token')) return; const calls=[api.get('/dashboard/stats'),api.get('/patients'),api.get('/doctors'),api.get('/appointments'),api.get('/beds'),api.get('/lab/tests'),api.get('/radiology/tests'),api.get('/pharmacy/medicines'),api.get('/billing/all')]; const [s,p,d,a,b,l,r,m,bi]=await Promise.allSettled(calls); if(s.value)setStats(s.value.data); if(p.value)setPatients(p.value.data); if(d.value)setDoctors(d.value.data); if(a.value)setAppointments(a.value.data); if(b.value)setBeds(b.value.data); if(l.value)setLabs(l.value.data); if(r.value)setRads(r.value.data); if(m.value)setMeds(m.value.data); if(bi.value)setBills(bi.value.data); }
  useEffect(()=>{load()},[user]);
  if(!user) return <Login onLogin={setUser}/>;
  async function addPatient(e){e.preventDefault(); await api.post('/patients', patient); setPatient(emptyPatient); await load();}
  async function addDoctor(e){e.preventDefault(); await api.post('/doctors', doctor); setDoctor(emptyDoctor); await load();}
  function logout(){localStorage.clear(); setUser(null)}
  const tabs=[['dashboard','Dashboard',Activity],['patients','Patients',Users],['doctors','Doctors',Stethoscope],['appointments','Appointments',Calendar],['beds','Beds',Bed],['labs','Lab/Radiology',TestTube2],['pharmacy','Pharmacy',Pill],['billing','Billing',ReceiptText]];
  return <div className="app"><aside><h2>HMS</h2><p>{user.full_name}<br/><small>{user.role}</small></p>{tabs.map(([id,label,Icon])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}><Icon size={17}/>{label}</button>)}<button onClick={logout}><LogOut size={17}/>Logout</button></aside><main><header><h1>{tabs.find(t=>t[0]===tab)?.[1]}</h1><button onClick={load}>Refresh</button></header>
  {tab==='dashboard'&&<section><div className="grid"><Stat icon={Users} title="Total Patients" value={stats.totalPatients}/><Stat icon={Stethoscope} title="Total Doctors" value={stats.totalDoctors}/><Stat icon={Calendar} title="Appointments Today" value={stats.appointmentsToday}/><Stat icon={Bed} title="Available Beds" value={stats.availableBeds}/></div><h2>Recent Activity</h2><Table rows={stats.recentActivity}/></section>}
  {tab==='patients'&&<section><Form title="Add Patient" data={patient} setData={setPatient} submit={addPatient}/><Table rows={patients}/></section>}
  {tab==='doctors'&&<section><Form title="Add Doctor" data={doctor} setData={setDoctor} submit={addDoctor}/><Table rows={doctors}/></section>}
  {tab==='appointments'&&<section><Table rows={appointments}/></section>}
  {tab==='beds'&&<section><Table rows={beds}/></section>}
  {tab==='labs'&&<section><h2>Lab Tests</h2><Table rows={labs}/><h2>Radiology Tests</h2><Table rows={rads}/></section>}
  {tab==='pharmacy'&&<section><Table rows={meds}/></section>}
  {tab==='billing'&&<section><Table rows={bills}/></section>}
  </main></div>
}
function Form({title,data,setData,submit}){return <form className="card form" onSubmit={submit}><h2>{title}</h2><div className="formGrid">{Object.keys(data).map(k=><input key={k} required={k==='full_name'} placeholder={k.replaceAll('_',' ')} value={data[k]??''} onChange={e=>setData({...data,[k]:e.target.value})}/>)}</div><button>Save</button></form>}
createRoot(document.getElementById('root')).render(<App/>);
