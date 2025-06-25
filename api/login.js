import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  // Lakukan query ke Supabase sesuai kebutuhan
  // Contoh: cek user di table profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Cek password (hash/compare sesuai implementasi Anda)
  // Jika cocok:
  res.status(200).json({ user: data });
}
