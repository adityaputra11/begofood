import { useEffect, useState } from 'react';
import type { Menu } from './api';
import { API_URL, getMenus, createMenu, updateMenu, deleteMenu } from './api';
import './styles.css';

const categories = ['main_course', 'appetizer', 'dessert', 'beverage', 'snack'];
const clusters = ['western_indonesian', 'chinese_food', 'seafood'];
const tasteTags = ['spicy', 'savory', 'sweet', 'sour'];
const allergenList = ['kacang', 'susu', 'telur', 'seafood'];
const sensoryOptions = ['renyah', 'lembut', 'hangat', 'aromatik'];

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'Password123!') {
      localStorage.setItem('begofood-admin-auth', 'true');
      onLogin();
    } else {
      setError('Username atau password salah');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🍽</span>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Begofood Admin</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Masuk untuk mengelola menu</p>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus />
          </div>
          <div className="field" style={{ marginBottom: 24 }}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password123!" />
          </div>
          <button type="submit" className="btn primary coral" style={{ width: '100%', justifyContent: 'center' }}>
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}

function SimpleCreateForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [restaurant, setRestaurant] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createMenu({ name, description: description || undefined, sourceUrl: sourceUrl || undefined, restaurant: restaurant || undefined, price: price ? Number(price) : undefined, imageUrl: imageUrl || undefined });
      onSave();
    } catch (err) { setError((err as Error).message); }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🍽 New Menu</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>Masukkan informasi dasar. AI akan menganalisis sisanya.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Nama Menu *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rendang Sapi Minang" required autoFocus />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Deskripsi Singkat</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Daging sapi empuk dengan santan dan rempah Minang yang pekat." rows={3} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Restaurant</label>
            <input value={restaurant} onChange={(e) => setRestaurant(e.target.value)} placeholder="e.g. Sate Khas Senayan" />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Harga</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 42000" />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Gambar (URL)</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..." />
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Sumber / URL</label>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="e.g. https://menu-restoran.com/rendang" />
          </div>
          <div className="form-actions" style={{ borderTop: 0, padding: 0 }}>
            <button type="button" className="btn outline" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn primary coral" disabled={saving || !name}>
              {saving ? 'Saving & Analyzing...' : 'Simpan & Analisis AI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FullEditForm({ initial, onSave, onCancel }: { initial: Menu; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: initial.name, description: initial.description || '', aiDescription: initial.aiDescription || '',
    price: initial.price, category: initial.category, cluster: initial.cluster,
    restaurant: initial.restaurant, imageUrl: initial.imageUrl || '', sourceUrl: initial.sourceUrl || '',
    tags: initial.tags, allergens: initial.allergens, ingredients: initial.ingredients,
    hiddenIngredients: initial.hiddenIngredients, sensoryProfile: initial.sensoryProfile,
    crossContaminationRisk: initial.crossContaminationRisk || '',
    calories: initial.calories, prepMinutes: initial.prepMinutes,
    isAvailable: initial.isAvailable,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (field: 'tags' | 'allergens' | 'ingredients' | 'hiddenIngredients' | 'sensoryProfile', value: string) =>
    setForm((f) => ({ ...f, [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value] }));

  const addCustom = (field: 'tags' | 'allergens' | 'ingredients' | 'hiddenIngredients' | 'sensoryProfile') => {
    const v = prompt(`Tambah ${field}:`);
    if (v && v.trim()) toggle(field, v.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { aiDescription, ...updateData } = form;
      await updateMenu(initial.id, {
        ...updateData,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        sourceUrl: form.sourceUrl || null,
        crossContaminationRisk: form.crossContaminationRisk || null,
      });
      onSave();
    } catch (err) { setError((err as Error).message); }
    setSaving(false);
  };

  const ChipBtn = ({ field, value, variant }: { field: string[]; value: string; variant?: string }) => {
    const isOn = field.includes(value);
    let cls = 'chip';
    if (isOn) { cls += ' on'; if (variant === 'danger') cls += ' danger'; if (variant === 'green') cls += ' green'; }
    return <button type="button" className={cls} onClick={() => toggle(field as any, value)}>{value}</button>;
  };

  return (
    <div className="form-page">
      <button className="back" onClick={onCancel}>← Back</button>
      <form className="menu-form" onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: 24, fontSize: 20 }}>Edit: {initial.name}</h2>
        {error && <div className="error">{error}</div>}

        <div className="form-grid">
          <div className="field full"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="field"><label>Price</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
          <div className="field"><label>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select></div>
          <div className="field"><label>Cluster</label>
            <select value={form.cluster} onChange={(e) => setForm({ ...form, cluster: e.target.value })}>
              {clusters.map((c) => <option key={c} value={c}>{c.replace('_', ' & ')}</option>)}</select></div>
          <div className="field"><label>Restaurant</label><input value={form.restaurant} onChange={(e) => setForm({ ...form, restaurant: e.target.value })} /></div>
          <div className="field"><label>Image URL</label><input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
          <div className="field"><label>Source URL</label><input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></div>
          <div className="field"><label>Calories</label><input type="number" value={form.calories ?? ''} onChange={(e) => setForm({ ...form, calories: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="field"><label>Prep (min)</label><input type="number" value={form.prepMinutes} onChange={(e) => setForm({ ...form, prepMinutes: Number(e.target.value) })} /></div>
          <div className="field full" style={{ marginBottom: 8 }}><label>Deskripsi Admin</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="field full" style={{ marginBottom: 8 }}><label>Deskripsi AI <span style={{fontWeight:400,color:'var(--muted)',textTransform:'none'}}>(hasil)</span></label><textarea value={form.aiDescription} rows={2} style={{ background: '#f8f7f4', color: 'var(--muted)' }} readOnly /></div>
        </div>

        <div className="form-section"><h3>Tags Cita Rasa</h3>
          <div className="chip-group">
            {tasteTags.map((t) => <ChipBtn key={t} field={form.tags} value={t} variant="green" />)}
            <button type="button" className="chip add" onClick={() => addCustom('tags')}>+ Custom</button>
          </div>
        </div>
        <div className="form-section"><h3>Allergens</h3>
          <div className="chip-group">
            {allergenList.map((a) => <ChipBtn key={a} field={form.allergens} value={a} variant="danger" />)}
            <button type="button" className="chip add" onClick={() => addCustom('allergens')}>+ Custom</button>
          </div>
        </div>
        <div className="form-section"><h3>Sensory Profile</h3>
          <div className="chip-group">
            {sensoryOptions.map((s) => <ChipBtn key={s} field={form.sensoryProfile} value={s} />)}
          </div>
        </div>
        <div className="form-section"><h3>Ingredients</h3>
          <div className="chip-group">
            {form.ingredients.map((i) => (<button key={i} type="button" className="chip on" onClick={() => toggle('ingredients', i)}>{i} <span className="remove">×</span></button>))}
            <button type="button" className="chip add" onClick={() => addCustom('ingredients')}>+ Add</button>
          </div>
        </div>
        <div className="form-section"><h3>Hidden Ingredients</h3>
          <div className="chip-group">
            {form.hiddenIngredients.map((h) => (<button key={h} type="button" className="chip on" onClick={() => toggle('hiddenIngredients', h)}>{h} <span className="remove">×</span></button>))}
            <button type="button" className="chip add" onClick={() => addCustom('hiddenIngredients')}>+ Add</button>
          </div>
        </div>

        <div className="form-section">
          <h3>Lainnya</h3>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Cross Contamination Risk</label>
            <input value={form.crossContaminationRisk} onChange={(e) => setForm({ ...form, crossContaminationRisk: e.target.value })} />
          </div>
          <div className="toggle-wrap">
            <button type="button" className={`toggle ${form.isAvailable ? 'on' : ''}`} onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{form.isAvailable ? 'Available' : 'Unavailable'}</span>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn outline" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn primary coral" disabled={saving || !form.name}>{saving ? 'Saving...' : 'Update Menu'}</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState(() => !!localStorage.getItem('begofood-admin-auth'));
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [processingMenus, setProcessingMenus] = useState<Set<string>>(new Set());

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const load = () => {
    if (!authenticated) return;
    setLoading(true);
    setError('');
    getMenus().then((data) => setMenus(data.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
  };

  // Hooks before early return — always same order
  useEffect(() => { load(); }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    const es = new EventSource(`${API_URL}/agent/analysis/stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'started') {
          setProcessingMenus((prev) => new Set(prev).add(data.menuId));
          addToast(`🔍 Analyzing: ${data.menuName}`, 'info');
        } else if (data.type === 'completed') {
          setProcessingMenus((prev) => { const next = new Set(prev); next.delete(data.menuId); return next; });
          addToast(`✅ ${data.menuName}: ${data.message}`, 'success');
          load();
        } else if (data.type === 'failed') {
          setProcessingMenus((prev) => { const next = new Set(prev); next.delete(data.menuId); return next; });
          addToast(`❌ ${data.menuName}: ${data.message}`, 'error');
        }
      } catch {}
    };
    es.onerror = () => {};
    return () => es.close();
  }, [authenticated]);

  if (!authenticated) return <LoginPage onLogin={() => setAuthenticated(true)} />;

  const handleDelete = async (menu: Menu) => {
    if (!confirm(`Hapus "${menu.name}"?`)) return;
    try { await deleteMenu(menu.id); load(); } catch (err) { alert((err as Error).message); }
  };

  const handleReanalyze = async (menu: Menu) => {
    setProcessingMenus((prev) => new Set(prev).add(menu.id));
    addToast(`🔍 Re-analyzing: ${menu.name}`, 'info');
    try {
      const res = await fetch(`${API_URL}/agent/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: menu.name, description: menu.description, sourceUrl: menu.sourceUrl || undefined, menuId: menu.id }),
      });
      const data = await res.json();
      if (!data.saved) addToast(`⚠️ ${menu.name}: ${data.message}`, 'error');
    } catch (err) { addToast(`❌ ${menu.name}: ${(err as Error).message}`, 'error'); }
  };

  const filtered = menus.filter(
    (m) => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.restaurant.toLowerCase().includes(search.toLowerCase()),
  );

  if (editingMenu) return <div className="app"><FullEditForm initial={editingMenu} onSave={() => { setEditingMenu(null); load(); }} onCancel={() => setEditingMenu(null)} /></div>;

  const allergenCount = menus.filter((m) => m.allergens.length > 0).length;

  return (
    <div className="app">
      <div className="topbar">
        <h1><span>🍽</span> Begofood Admin</h1>
        <div className="topbar-actions">
          <div className="search-box">
            <input placeholder="Search menus..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn primary coral" onClick={() => setCreating(true)}>+ New Menu</button>
          <button className="btn outline" onClick={() => { localStorage.removeItem('begofood-admin-auth'); setAuthenticated(false); }}>Logout</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card"><strong className="num">{menus.length}</strong><small>Total Menus</small></div>
        <div className="stat-card"><strong className="num danger">{allergenCount}</strong><small>Have Allergens</small></div>
        <div className="stat-card"><strong className="num green">{menus.filter((m) => m.tags.length > 0).length}</strong><small>With Taste Tags</small></div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? <div className="loading">Loading menus...</div>
        : filtered.length === 0 ? (
          <div className="empty"><span>⌕</span><p>{search ? 'No menus match your search' : 'No menus yet. Create one!'}</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Menu</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Allergens</th>
                  <th>Tags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((menu) => (
                  <tr key={menu.id}>
                    <td>
                      <div className="name-cell">
                        <strong>{menu.name}</strong>
                        <small>{menu.restaurant} · {menu.cluster.replace('_', ' & ')}</small>
                        {processingMenus.has(menu.id) && <span className="analyzing-badge">Analyzing...</span>}
                        {menu.aiDescription && !processingMenus.has(menu.id) && <span className="ai-badge">AI</span>}
                      </div>
                    </td>
                    <td><span className="badge">{menu.category.replace('_', ' ')}</span></td>
                    <td>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(menu.price)}</td>
                    <td>
                      {menu.allergens.length > 0
                        ? menu.allergens.map((a) => <span key={a} className="badge danger">{a}</span>)
                        : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      {menu.tags.length > 0
                        ? menu.tags.map((t) => <span key={t} className="badge tag">{t}</span>)
                        : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn sm outline" onClick={() => setEditingMenu(menu)}>Detail</button>
                        <button className="btn sm outline" onClick={() => handleReanalyze(menu)}>Analyze</button>
                        <button className="btn sm danger" onClick={() => handleDelete(menu)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">{filtered.length} of {menus.length} menus</div>
          </div>
        )}
        <div className="toast-container">
          {toasts.map((t) => (<div key={t.id} className={`toast ${t.type}`}>{t.message}</div>))}
        </div>
        {creating && <SimpleCreateForm onSave={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}
    </div>
  );
}

export default App;
