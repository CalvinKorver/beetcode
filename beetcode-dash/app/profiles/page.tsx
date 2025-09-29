import { createClient } from '@/utils/supabase/server';

export default async function Profiles() {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select();

  return <pre>{JSON.stringify(profiles, null, 2)}</pre>
}