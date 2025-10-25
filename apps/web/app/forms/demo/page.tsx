'use client';
import { useEffect, useState } from 'react';
import { request, } from "@adms/sdk";

const base = process.env.NEXT_PUBLIC_API_BASE as string;

export default function FormDemo(){
  const [token, setToken] = useState<string|undefined>();
  const [templateCode, setTemplateCode] = useState('application-default');
  const [version, setVersion] = useState<any|null>(null);

  async function loginDev(){
    const email = 'dev@example.com';
    await request({ method:'post', path:'/auth/otp/request', baseUrl: base, body: { email, orgSlug:'ifh' } });
    const res = await request({ method:'post', path:'/auth/otp/verify', baseUrl: base, body: { email, orgSlug:'ifh' } });
    setToken(res.accessToken);
  }

  async function load(){
    if(!token) return;
    try {
      const v = await request({
        method:'get',
        path:`/forms/templates/${templateCode}/published`,
        baseUrl: base,
        headers: { Authorization: `Bearer ${token}` }
      });
      setVersion(v);
    } catch(e){
      setVersion(null);
    }
  }

  useEffect(()=>{ load(); }, [token, templateCode]);

  return (
    <main style={{ maxWidth: 800, margin:'40px auto', fontFamily:'system-ui' }}>
      <h1>Form Renderer (demo)</h1>
      {!token && <button onClick={loginDev}>Login Dev</button>}
      {token && (
        <>
          <div>
            <input value={templateCode} onChange={e=>setTemplateCode(e.target.value)} />
            <button onClick={load}>Load</button>
          </div>
          {!version && <p>No published version for code <b>{templateCode}</b>.</p>}
          {version && version.sections?.map((s:any)=>(
            <section key={s.id} style={{padding:12, border:'1px solid #eee', margin:'12px 0'}}>
              <h3>{s.title}</h3>
              {s.fields?.map((f:any)=>(
                <div key={f.id} style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:8, margin:'8px 0'}}>
                  <label>{f.label}{f.required?' *':''}</label>
                  <input placeholder={f.key} />
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </main>
  );
}
