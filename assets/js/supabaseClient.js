const SUPABASE_URL = "https://qahhlxumiquogxlvwuyn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhaGhseHVtaXF1b2d4bHZ3dXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTQyOTIsImV4cCI6MjA5Mjk3MDI5Mn0.sRj_MUKrSkw4DTGIEPFzXXmoMFkBteqizV6BPeH6jKc";

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ════════════════════════════════════════════
   AUTH — bảng users
   ════════════════════════════════════════════ */

async function hashPassword(password) {
    const buf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(password)
    );
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function dbRegister(email, password) {
    const hashed = await hashPassword(password);
    const { error } = await _sb
        .from('users')
        .insert({ email, password: hashed });
    if (error) throw error;
}

// FIX #1: select 'id, email' và lưu currentUserId sau login
async function dbLogin(email, password) {
    const hashed = await hashPassword(password);
    const { data, error } = await _sb
        .from('users')
        .select('id, email')
        .eq('email', email)
        .eq('password', hashed)
        .single();
    if (error || !data) throw new Error('Sai tài khoản hoặc mật khẩu!');
    localStorage.setItem('currentUser',   data.email);
    localStorage.setItem('currentUserId', data.id);
    return data;
}

// FIX #3: xóa cả currentUserId khi logout
function dbLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserId');
}

/* ════════════════════════════════════════════
   GRAPH CRUD — FIX #2: dùng user_id (uuid) khớp schema
   ════════════════════════════════════════════ */

async function saveGraphToSupabase(name, algorithm, nodes, edges, existingId = null) {
    const userId = _getCurrentUserId();
    if (!userId) throw new Error('Chưa đăng nhập. Vui lòng đăng nhập trước.');

    const payload = {
        user_id:    userId,
        name,
        algorithm,
        data:       { nodes, edges },
        updated_at: new Date().toISOString()
    };

    if (existingId) {
        const { data, error } = await _sb
            .from('graphs')
            .update(payload)
            .eq('id', existingId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await _sb
            .from('graphs')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

async function listGraphsFromSupabase(algorithm = null) {
    const userId = _getCurrentUserId();
    if (!userId) throw new Error('Chưa đăng nhập.');

    let query = _sb
        .from('graphs')
        .select('id, name, algorithm, created_at, updated_at, data')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (algorithm) query = query.eq('algorithm', algorithm);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

async function deleteGraphFromSupabase(graphId) {
    const userId = _getCurrentUserId();
    if (!userId) throw new Error('Chưa đăng nhập.');

    const { error } = await _sb
        .from('graphs')
        .delete()
        .eq('id', graphId)
        .eq('user_id', userId);

    if (error) throw error;
}

/* ── Helpers ── */
function _getCurrentEmail() {
    return localStorage.getItem('currentUser') || null;
}

function _getCurrentUserId() {
    return localStorage.getItem('currentUserId') || null;
}