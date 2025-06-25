function initSupabase() {
    // Initialize Supabase client with hardcoded URL and anon key
    const supabaseUrl = "https://vdszykgrgbszuzybmzle.supabase.co"; // Ganti dengan URL Supabase Anda
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc3p5a2dyZ2JzenV6eWJtemxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODE2NTAsImV4cCI6MjA2NTU1NzY1MH0.XzLkCYEcFOOjFeoFlh6PjZmTxTrg-tblQXST37aIzDk"; // Ganti dengan anon key Supabase Anda
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
}