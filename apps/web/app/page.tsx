'use client';
import { useEffect, useState } from 'react';
import { requestOtp, verifyOtp, listPrograms } from '../lib/api';

export default function Home() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(()=>{
    if (token) {
      listPrograms(token).then(setPrograms).catch(console.error);
    }
  }, [token]);

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Admissions Suite</h1>
      {!token && (
        <section>
          <h2>Login (Email OTP)</h2>
          <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <button onClick={()=>requestOtp(email)}>Send OTP</button>
          <br/>
          <input placeholder="OTP code (dev)" value={code} onChange={e=>setCode(e.target.value)} />
          <button onClick={async ()=>{
            const t = await verifyOtp(email);
            setToken(t?.accessToken || null);
          }}>Verify</button>
        </section>
      )}
      {token && (
        <section>
          <h2>Programs</h2>
          <ul>
            {programs.map(p => <li key={p.id}>{p.title} ({p.code})</li>)}
          </ul>
        </section>
      )}
    </main>
  );
}
