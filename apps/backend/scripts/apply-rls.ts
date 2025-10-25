import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main(){
  const sql = fs.readFileSync('./prisma/rls.sql', 'utf-8');
  // set dummy tenant for the session (required for policy creation referencing current_setting)
  await prisma.$executeRawUnsafe(`SELECT set_config('app.current_org','public', true)`);
  await prisma.$executeRawUnsafe(sql);
  console.log('RLS applied');
}
main().then(()=>process.exit(0)).catch((e)=>{ console.error(e); process.exit(1); });
