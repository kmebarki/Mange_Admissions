-- Enable RLS and set tenant policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.current_org') THEN
    PERFORM set_config('app.current_org','public', true);
  END IF;
END $$;

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Program" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormField" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormResponse" ENABLE ROW LEVEL SECURITY;

-- Policies: only rows matching current tenant (orgId) are visible, except Tenant (match by id)
CREATE POLICY tenant_isolation_tenant ON "Tenant"
  USING (id = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_user ON "User"
  USING (orgId = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_program ON "Program"
  USING (orgId = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_session ON "Session"
  USING (orgId = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_application ON "Application"
  USING (orgId = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_document ON "Document"
  USING (orgId = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_invoice ON "Invoice"
  USING (orgId = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_invoiceline ON "InvoiceLine"
  USING ((SELECT "orgId" FROM "Invoice" i WHERE i.id = "invoiceId") = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_payment ON "Payment"
  USING ((SELECT "orgId" FROM "Invoice" i WHERE i.id = "invoiceId") = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_audit ON "AuditLog"
  USING (orgId = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_formtemplate ON "FormTemplate"
  USING (orgId = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_formversion ON "FormVersion"
  USING ((SELECT "orgId" FROM "FormTemplate" t WHERE t.id = "templateId") = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_formsection ON "FormSection"
  USING ((SELECT "orgId" FROM "FormTemplate" t JOIN "FormVersion" v ON v."templateId" = t.id WHERE v.id = "versionId") = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_formfield ON "FormField"
  USING ((SELECT "orgId" FROM "FormTemplate" t JOIN "FormVersion" v ON v."templateId" = t.id JOIN "FormSection" s ON s.id = "sectionId" WHERE s."versionId" = v.id) = current_setting('app.current_org', true));

CREATE POLICY tenant_isolation_formresponse ON "FormResponse"
  USING (orgId = current_setting('app.current_org', true));
