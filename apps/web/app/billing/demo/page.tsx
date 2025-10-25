'use client';
import { request } from '@adms/sdk';
const base = process.env.NEXT_PUBLIC_API_BASE as string;

export default function BillingDemo(){
  async function createPlan(){
    // Remplacer invoiceId par une facture existante
    const invoiceId = prompt('Invoice ID ?') || '';
    const now = new Date();
    const s1 = new Date(now.getTime()+7*86400000);
    const s2 = new Date(now.getTime()+37*86400000);
    const res = await request({ method:'post', path:'/billing/payment-plans', baseUrl: base, body: { invoiceId, schedule:[{ dueAt: s1.toISOString(), amount: 500 }, { dueAt: s2.toISOString(), amount: 500 }] } });
    alert('Plan créé: '+res.id);
  }
  return <main style={{maxWidth:720,margin:'40px auto',fontFamily:'system-ui'}}>
    <h1>Billing Demo</h1>
    <button onClick={createPlan}>Créer un échéancier (2×500€)</button>
  </main>;
}
