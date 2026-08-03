create policy "auth upload boletas" on storage.objects for insert to authenticated with check (bucket_id = 'boletas');
create policy "auth read boletas" on storage.objects for select to authenticated using (bucket_id = 'boletas');
create policy "auth update boletas" on storage.objects for update to authenticated using (bucket_id = 'boletas') with check (bucket_id = 'boletas');