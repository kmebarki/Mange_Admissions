import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwtPlugin from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient, Role } from '@prisma/client';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

const PORT = Number(process.env.PORT || 4000);
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

await app.register(cors, { origin: ORIGINS, credentials: true });
await app.register(jwtPlugin, { secret: process.env.JWT_SECRET || 'changeme' });
await app.register(swagger, {
  openapi: {
    openapi: '3.1.0',
    info: { title: 'Admissions Suite API', version: '0.1.0' }
  }
});
await app.register(swaggerUi, { routePrefix: '/docs' });

// Simple auth decorators
app.decorate('authOptional', async (req:any, rep:any) => {
  try { await req.jwtVerify(); } catch (_) {}
});

app.decorate('auth', async (req:any, rep:any) => {
  try { await req.jwtVerify(); } catch (e) { return rep.status(401).send({ error: 'Unauthorized' }); }
});

// Derive orgId (tenant) from header or user
app.addHook('preHandler', async (req:any, _rep:any) => {
  const orgId = req.headers['x-org-id'];
  (req as any).orgId = orgId || req.user?.orgId || null;
});

// Health
app.get('/api/health', async () => ({ ok: true }));

// --- Auth OTP (demo-grade) ---
app.post('/api/auth/otp/request', async (req:any) => {
  const { email } = req.body || {};
  if (!email) return { ok: true };
  const code = String(randomInt(100000, 999999));
  // Store as hashed or in cache; here simplistic:
  await prisma.auditLog.create({
    data: { orgId: 'public', action: 'OTP_SENT', actor: email, meta: { code } }
  });
  app.log.info({ msg: 'OTP code (dev only): ' + code });
  return { ok: true };
});

app.post('/api/auth/otp/verify', async (req:any, rep:any) => {
  const { email, orgSlug='ifh' } = req.body || {};
  if (!email) return rep.status(400).send({ error: 'email required' });
  // Ensure tenant & user exist
  const tenant = await prisma.tenant.upsert({
    where: { slug: String(orgSlug) },
    create: { slug: String(orgSlug), name: String(orgSlug).toUpperCase() },
    update: {}
  });
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, orgId: tenant.id, role: 'CANDIDATE' },
    update: { orgId: tenant.id }
  });
  const token = app.jwt.sign({ sub: user.id, role: user.role, orgId: tenant.id }, { expiresIn: '4h' });
  const refreshToken = app.jwt.sign({ sub: user.id, typ: 'refresh' }, { expiresIn: '7d' });
  return { accessToken: token, refreshToken };
});

// --- Tenants ---
app.get('/api/tenants', { preHandler: app.auth }, async (req:any, rep:any) => {
  if (req.user?.role !== 'SYS_ADMIN') return rep.status(403).send({ error: 'forbidden' });
  const tenants = await prisma.tenant.findMany();
  return tenants;
});

app.post('/api/tenants', { preHandler: app.auth }, async (req:any, rep:any) => {
  if (req.user?.role !== 'SYS_ADMIN') return rep.status(403).send({ error: 'forbidden' });
  const { slug, name, languages=['fr','en'], timezone='Europe/Paris' } = req.body || {};
  const t = await prisma.tenant.create({ data: { slug, name, languages, timezone } });
  return rep.status(201).send(t);
});

// --- Catalog: Programs ---
app.get('/api/catalog/programs', async (req:any) => {
  const orgId = (req as any).orgId;
  const q = String(req.query?.q || '');
  return prisma.program.findMany({
    where: { orgId, OR: [{ title: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] }
  });
});

app.post('/api/catalog/programs', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  if (!orgId) return rep.status(400).send({ error: 'org missing' });
  const { code, title, level, mode, campus, capacity, language } = req.body || {};
  const p = await prisma.program.create({
    data: { orgId, code, title, level, mode, campus, capacity, language }
  });
  return rep.status(201).send(p);
});

// --- Sessions ---
app.get('/api/catalog/sessions', async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  return prisma.session.findMany({ where: { orgId }, include: { program: true } });
});

app.post('/api/catalog/sessions', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { programId, applyOpenAt, applyCloseAt, startDate, capacity, waitlistPolicy } = req.body || {};
  const s = await prisma.session.create({
    data: { orgId, programId, applyOpenAt: applyOpenAt ? new Date(applyOpenAt) : null, applyCloseAt: applyCloseAt ? new Date(applyCloseAt) : null, startDate: startDate ? new Date(startDate) : null, capacity, waitlistPolicy }
  });
  return rep.status(201).send(s);
});

// --- Applications ---
app.get('/api/applications', { preHandler: app.auth }, async (req:any) => {
  const orgId = (req as any).orgId;
  if (req.user.role === 'CANDIDATE') {
    return prisma.application.findMany({ where: { orgId, userId: req.user.sub } });
  }
  // staff can filter later
  return prisma.application.findMany({ where: { orgId } });
});

app.post('/api/applications', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { programId, sessionId, locale='fr' } = req.body || {};
  const a = await prisma.application.create({
    data: { orgId, userId: req.user.sub, programId, sessionId, locale }
  });
  return rep.status(201).send(a);
});

app.post('/api/applications/:id/submit', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { id } = req.params;
  const a = await prisma.application.update({ where: { id }, data: { state: 'SUBMITTED' } });
  return a;
});

// --- Documents ---
app.post('/api/applications/:id/documents', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { id } = req.params;
  const { type, fileName, size, mimeType } = req.body || {};
  const d = await prisma.document.create({ data: { orgId, applicationId: id, type, fileName, status: 'RECEIVED' } });
  return rep.status(201).send(d);
});

// --- Workflows (very light sample) ---
app.post('/api/workflows/:id/transition', { preHandler: app.auth }, async (req:any, rep:any) => {
  const { id } = req.params;
  const { action, note } = req.body || {};
  // naive sample: SUBMITTED -> COMPLETE
  const a = await prisma.application.findUnique({ where: { id } });
  if (!a) return rep.status(404).send({ error: 'not found' });
  const next = a.state === 'SUBMITTED' ? 'COMPLETE' : a.state;
  const updated = await prisma.application.update({ where: { id }, data: { state: next } });
  await prisma.auditLog.create({ data: { orgId: a.orgId, userId: req.user.sub, action: 'TRANSITION', target: id, meta: { from: a.state, to: next, action, note } } });
  return updated;
});

// --- Billing ---
app.get('/api/billing/invoices', { preHandler: app.auth }, async (req:any) => {
  const orgId = (req as any).orgId;
  if (req.user.role === 'CANDIDATE') {
    return prisma.invoice.findMany({
      where: { orgId, application: { userId: req.user.sub } },
      include: { lines: true, payments: true }
    });
  }
  return prisma.invoice.findMany({ where: { orgId }, include: { lines: true, payments: true } });
});

app.post('/api/billing/invoices', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { applicationId, currency='EUR', lines=[] } = req.body || {};
  const total = lines.reduce((s:any,l:any)=> s + Number(l.amount||0), 0);
  const inv = await prisma.invoice.create({
    data: {
      orgId, applicationId, currency, total, status: 'ISSUED',
      lines: { create: lines.map((l:any)=> ({ label: l.label, amount: l.amount, account: l.account })) }
    },
    include: { lines: true }
  });
  return rep.status(201).send(inv);
});



// === Utility: set app.current_org for each request (RLS) ===
app.addHook('onRequest', async (req:any, _rep:any) => {
  const orgId = (req as any).orgId || 'public';
  try {
    await prisma.$executeRawUnsafe(`SELECT set_config('app.current_org', '${orgId}', false)`);
  } catch {}
});

// --- Forms: Templates & Responses ---
app.post('/api/forms/templates', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { code, title, locale='fr' } = req.body || {};
  const t = await prisma.formTemplate.create({ data: { orgId, code, title, locale } });
  return rep.status(201).send(t);
});

app.post('/api/forms/templates/:templateId/versions', { preHandler: app.auth }, async (req:any, rep:any) => {
  const { templateId } = req.params;
  const { version, isPublished=false, sections=[] } = req.body || {};
  const v = await prisma.formVersion.create({ data: { templateId, version, isPublished } });
  for (let i=0;i<sections.length;i++){
    const s = sections[i];
    const sec = await prisma.formSection.create({ data: { versionId: v.id, title: s.title, order: i } });
    for (let j=0;j<(s.fields||[]).length;j++){
      const f = s.fields[j];
      await prisma.formField.create({ data: { sectionId: sec.id, key: f.key, label: f.label, type: f.type, required: !!f.required, options: f.options || null, visibleIf: f.visibleIf || null, order: j } });
    }
  }
  return rep.status(201).send(await prisma.formVersion.findUnique({ where: { id: v.id }, include: { sections: { include: { fields: true } } } }));
});

app.get('/api/forms/templates/:code/published', { preHandler: app.authOptional }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { code } = req.params;
  const t = await prisma.formTemplate.findFirst({ where: { orgId, code }, include: { versions: { where: { isPublished: true }, include: { sections: { include: { fields: true } } }, orderBy: { version: 'desc' }, take: 1 } } });
  if (!t || t.versions.length === 0) return rep.status(404).send({ error: 'no published version' });
  return t.versions[0];
});

app.post('/api/applications/:id/form-responses', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { id } = req.params;
  const { data } = req.body || {};
  const r = await prisma.formResponse.upsert({
    where: { applicationId: id },
    update: { data },
    create: { orgId, applicationId: id, data }
  });
  return rep.status(201).send(r);
});

// --- Integrations: YPAREO (stubs) ---
import fetch from 'node-fetch';

async function ypareoFetch(path: string, method='GET', body?: any){
  const base = process.env.YPAREO_BASE_URL || '';
  const token = process.env.YPAREO_TOKEN || '';
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`YPAREO HTTP ${res.status}`);
  return res.json();
}

app.post('/api/integrations/ypareo/apprenants', { preHandler: app.auth }, async (req:any, rep:any) => {
  // Expected: { nom, prenom, email, externalId? }
  const payload = req.body || {};
  const created = await ypareoFetch('/apprenants', 'POST', payload);
  return rep.status(201).send(created);
});

app.put('/api/integrations/ypareo/apprenants/:code/external-id', { preHandler: app.auth }, async (req:any, rep:any) => {
  // Example to set HubSpot external id
  const { code } = req.params; // YPAREO apprenant code (e.g., 19212)
  const { system='hubspot', value } = req.body || {};
  const updated = await ypareoFetch(`/apprenants/${code}/external-ids/${system}`, 'PUT', { value });
  return updated;
});


// --- Storage: Pré-signé (mock) ---
app.post('/api/storage/presign', { preHandler: app.auth }, async (req:any) => {
  const { fileName, mimeType } = req.body || {};
  // En prod: générer une URL S3/GCS avec presigner. Ici, mock.
  return {
    uploadUrl: `https://example-upload.local/${encodeURIComponent(fileName)}`,
    method: 'PUT',
    headers: { 'Content-Type': mimeType || 'application/octet-stream' },
    cdnUrl: `https://cdn.example.local/${encodeURIComponent(fileName)}`
  };
});


// --- Entretiens (slots & booking) ---
app.post('/api/interviews/slots', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { juryId, mode='video', location, startsAt, endsAt, capacity=1 } = req.body || {};
  const slot = await prisma.interviewSlot.create({
    data: { orgId, juryId, mode, location, startsAt: new Date(startsAt), endsAt: new Date(endsAt), capacity }
  });
  return rep.status(201).send(slot);
});

app.get('/api/interviews/slots', { preHandler: app.auth }, async (req:any) => {
  const orgId = (req as any).orgId;
  return prisma.interviewSlot.findMany({ where: { orgId }, include: { bookings: true } });
});

app.post('/api/interviews/slots/:slotId/book', { preHandler: app.auth }, async (req:any, rep:any) => {
  const { slotId } = req.params;
  const { applicationId } = req.body || {};
  const slot = await prisma.interviewSlot.findUnique({ where: { id: slotId }, include: { bookings: true } });
  if (!slot) return rep.status(404).send({ error: 'slot not found' });
  if (slot.bookings.length >= (slot.capacity || 1)) return rep.status(400).send({ error: 'slot full' });
  const b = await prisma.interviewBooking.create({ data: { slotId, applicationId } });
  return rep.status(201).send(b);
});


// --- Billing: Payment Plans & Webhooks ---
app.post('/api/billing/payment-plans', { preHandler: app.auth }, async (req:any, rep:any) => {
  const orgId = (req as any).orgId;
  const { invoiceId, name='Plan', schedule=[] } = req.body || {};
  const plan = await prisma.paymentPlan.create({ data: { orgId, invoiceId, name } });
  for (const s of schedule) {
    await prisma.paymentSchedule.create({ data: { planId: plan.id, dueAt: new Date(s.dueAt), amount: s.amount } });
  }
  const full = await prisma.paymentPlan.findUnique({ where: { id: plan.id }, include: { schedules: true } });
  return rep.status(201).send(full);
});

app.post('/api/psp/stripe/webhook', async (req:any, rep:any) => {
  await prisma.pspWebhook.create({ data: { provider:'stripe', payload: req.body || {} } });
  return { ok: true };
});
app.listen({ port: PORT, host: '0.0.0.0' }).then(()=>{
  app.log.info(`API ready on http://localhost:${PORT}/docs`);
});
