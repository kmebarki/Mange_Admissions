import * as sdk from "@adms/sdk";
const base = process.env.NEXT_PUBLIC_API_BASE as string;
const defaultOrg = process.env.NEXT_PUBLIC_DEFAULT_ORG as string;

export async function requestOtp(email: string){
  await sdk.request({
    method: 'post',
    path: '/auth/otp/request',
    baseUrl: base,
    body: { email, orgSlug: defaultOrg }
  });
}

export async function verifyOtp(email: string){
  const res = await sdk.request({
    method: 'post',
    path: '/auth/otp/verify',
    baseUrl: base,
    body: { email, orgSlug: defaultOrg }
  });
  return res;
}

export async function listPrograms(token: string){
  const res = await sdk.request({
    method: 'get',
    path: '/catalog/programs',
    baseUrl: base,
    headers: { Authorization: `Bearer ${token}`, 'x-org-id': '' }
  });
  return res;
}
