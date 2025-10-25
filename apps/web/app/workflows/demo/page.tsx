'use client';
import { request } from '@adms/sdk';
const base = process.env.NEXT_PUBLIC_API_BASE as string;

export default function WorkflowDemo(){
  async function seed(){
    // Dev-only seed (assumes logged-in via / page OTP)
    const wf = await request({ method:'post', path:'/workflows', baseUrl: base, body: { code:'admission', name:'Admission Workflow' } });
    const s1 = await request({ method:'post', path:`/workflows/${wf.id}/states`, baseUrl: base, body: { key:'SUBMITTED', label:'Soumis', isInitial:true, order:1 } });
    const s2 = await request({ method:'post', path:`/workflows/${wf.id}/states`, baseUrl: base, body: { key:'COMPLETE', label:'Complet', order:2 } });
    const t1 = await request({ method:'post', path:`/workflows/${wf.id}/transitions`, baseUrl: base, body: { fromStateId:s1.id, toStateId:s2.id, name:'Auto-complete', guards:[{type:'docsComplete'}] } });
    alert('Seed OK');
  }
  return <main style={{maxWidth:720,margin:'40px auto',fontFamily:'system-ui'}}>
    <h1>Workflow Demo</h1>
    <p>Crée un workflow "admission" simple avec 2 états et 1 transition.</p>
    <button onClick={seed}>Seed</button>
  </main>;
}
