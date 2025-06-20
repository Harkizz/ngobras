function initSupabase() {
    // Initialize Supabase client
    const supabase = supabase.createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
    );
    return supabase;
}