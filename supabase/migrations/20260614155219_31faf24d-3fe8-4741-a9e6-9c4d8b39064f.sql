
-- Helper: membro do tenant (já existe is_tenant_member) — usado direto via path[1]
CREATE POLICY "tenant-docs read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tenant-docs' AND (
    public.is_host_admin(auth.uid())
    OR public.is_tenant_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "tenant-docs insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tenant-docs' AND (
    public.is_host_admin(auth.uid())
    OR public.is_tenant_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "tenant-docs update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tenant-docs' AND (
    public.is_host_admin(auth.uid())
    OR public.is_tenant_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "tenant-docs delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tenant-docs' AND (
    public.is_host_admin(auth.uid())
    OR public.is_tenant_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);
