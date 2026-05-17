import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { integrationApi } from '../api';

const resources = ['Patient','Encounter','Observation','DiagnosticReport','Invoice','MedicationRequest'];
export default function IntegrationCenter(){
  const [summary,setSummary]=useState(null),[keys,setKeys]=useState([]),[logs,setLogs]=useState([]),[hooks,setHooks]=useState([]),[bundle,setBundle]=useState(null);
  const [keyForm,setKeyForm]=useState({name:'Hospital Integration Key',scopes:'fhir.read,webhook.write'});
  const [hookForm,setHookForm]=useState({name:'Default Webhook',target_url:'https://example.com/hms-webhook',events:'patient.created,invoice.created'});
  const [newKey,setNewKey]=useState('');
  async function load(){ const [s,k,l,w]=await Promise.all([integrationApi.summary(),integrationApi.keys(),integrationApi.logs(),integrationApi.webhooks()]); setSummary(s.data); setKeys(k.data); setLogs(l.data); setHooks(w.data); }
  useEffect(()=>{ load().catch(()=>toast.error('Integration data load failed')); },[]);
  async function createKey(e){ e.preventDefault(); const {data}=await integrationApi.createKey({...keyForm,scopes:keyForm.scopes.split(',').map(x=>x.trim()).filter(Boolean)}); setNewKey(data.api_key); toast.success('API key generated. Copy it now.'); load(); }
  async function createHook(e){ e.preventDefault(); await integrationApi.createWebhook({...hookForm,events:hookForm.events.split(',').map(x=>x.trim()).filter(Boolean)}); toast.success('Webhook saved'); load(); }
  async function preview(r){ const {data}=await integrationApi.fhir(r); setBundle({resource:r,data}); }
  return <div className="page-stack">
    <div className="page-head"><div><p className="eyebrow">V34 Enterprise Integration</p><h1>FHIR / HL7 API Foundation</h1><p className="muted">FHIR-like resources, API keys, integration logs and webhook foundation for future hospital integrations.</p></div></div>
    <div className="stats-grid"><div className="stat-card"><span>API Keys</span><b>{summary?.keys||0}</b></div><div className="stat-card"><span>Webhooks</span><b>{summary?.webhooks||0}</b></div><div className="stat-card"><span>Recent Logs</span><b>{summary?.recent_logs?.length||0}</b></div><div className="stat-card"><span>Queued Events</span><b>{summary?.recent_events?.length||0}</b></div></div>
    <div className="grid-2"><section className="card"><h3>Create API Key</h3><form onSubmit={createKey} className="form-grid"><input value={keyForm.name} onChange={e=>setKeyForm({...keyForm,name:e.target.value})} placeholder="Key name"/><input value={keyForm.scopes} onChange={e=>setKeyForm({...keyForm,scopes:e.target.value})} placeholder="Scopes"/><button className="btn primary">Generate Key</button></form>{newKey&&<div className="alert success"><b>Copy now:</b> <code>{newKey}</code></div>}</section>
    <section className="card"><h3>Webhook Foundation</h3><form onSubmit={createHook} className="form-grid"><input value={hookForm.name} onChange={e=>setHookForm({...hookForm,name:e.target.value})}/><input value={hookForm.target_url} onChange={e=>setHookForm({...hookForm,target_url:e.target.value})}/><input value={hookForm.events} onChange={e=>setHookForm({...hookForm,events:e.target.value})}/><button className="btn primary">Save Webhook</button></form></section></div>
    <section className="card"><h3>FHIR-like Endpoint Preview</h3><div className="button-row">{resources.map(r=><button key={r} className="btn" onClick={()=>preview(r)}>{r}</button>)}</div>{bundle&&<pre className="code-box">{JSON.stringify(bundle.data,null,2).slice(0,5000)}</pre>}</section>
    <div className="grid-2"><section className="card"><h3>API Keys</h3><table><tbody>{keys.map(k=><tr key={k.id}><td>{k.name}</td><td>{k.key_preview}</td><td>{k.status}</td></tr>)}</tbody></table></section><section className="card"><h3>Integration Logs</h3><table><tbody>{logs.map(l=><tr key={l.id}><td>{l.resource_type}</td><td>{l.method}</td><td>{l.status}</td></tr>)}</tbody></table></section></div>
    <section className="card"><h3>Webhooks</h3><table><tbody>{hooks.map(h=><tr key={h.id}><td>{h.name}</td><td>{h.target_url}</td><td>{(h.events||[]).join(', ')}</td><td>{h.status}</td></tr>)}</tbody></table></section>
  </div>;
}
