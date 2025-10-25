'use client';
import { request } from '@adms/sdk';
const base = process.env.NEXT_PUBLIC_API_BASE as string;

export default function InterviewsDemo(){
  async function createSlot(){
    const now = new Date();
    const later = new Date(now.getTime()+60*60*1000);
    await request({ method:'post', path:'/interviews/slots', baseUrl: base, body: { mode:'video', startsAt: now.toISOString(), endsAt: later.toISOString(), capacity: 3 } });
    alert('Slot created');
  }
  async function listSlots(){
    const res = await request({ method:'get', path:'/interviews/slots', baseUrl: base });
    alert(`Slots: ${res.length}`);
  }
  return <main style={{maxWidth:720,margin:'40px auto',fontFamily:'system-ui'}}>
    <h1>Interviews Demo</h1>
    <button onClick={createSlot}>Créer un créneau</button>
    <button onClick={listSlots}>Lister les créneaux</button>
  </main>;
}
