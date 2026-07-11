import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { chat, getMenus, getPreferences, savePreferences } from './api';
import type { Menu, Preferences } from './types';

const categories = [
  { value: '', label: 'Semua', icon: '✦' },
  { value: 'main_course', label: 'Hidangan', icon: '🍲' },
  { value: 'soup', label: 'Berkuah', icon: '🥣' },
  { value: 'salad', label: 'Segar', icon: '🥗' },
  { value: 'appetizer', label: 'Camilan', icon: '🥟' },
  { value: 'dessert', label: 'Manis', icon: '🍮' },
];

const clusters = [
  { value: '', label: 'Semua dapur' },
  { value: 'western_indonesian', label: 'Western–Indonesia' },
  { value: 'chinese_food', label: 'Chinese Food' },
  { value: 'seafood', label: 'Seafood' },
];

const sensoryOptions = [
  'renyah',
  'hangat',
  'gurih',
  'pedas',
  'smoky',
  'creamy',
  'segar',
];
const allergyOptions = ['seafood', 'kacang', 'telur', 'susu'];
const dietOptions = [
  { value: 'none', label: 'Tidak ada' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'low_carb', label: 'Low carb' },
  { value: 'high_protein', label: 'High protein' },
  { value: 'low_fat', label: 'Low fat' },
];

const fallbackMenus: Menu[] = [
  {
    id: 'demo-1',
    name: 'Rendang Sapi Minang',
    description:
      'Daging sapi empuk dengan santan dan rempah Minang yang pekat.',
    price: 42000,
    imageUrl:
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
    category: 'main_course',
    cluster: 'western_indonesian',
    restaurant: 'Cinnamon - Mandarin Oriental Jakarta',
    sourceUrl:
      'https://photos.mandarinoriental.com/is/content/MandarinOriental/jakarta-restaurant-cinnamon-menu',
    tags: ['halal', 'high_protein'],
    allergens: [],
    ingredients: ['daging sapi', 'santan', 'cabai'],
    hiddenIngredients: [],
    sensoryProfile: ['empuk', 'gurih', 'pedas'],
    calories: 468,
    rating: 0,
    reviewCount: 0,
    priceStatus: 'simulated',
    prepMinutes: 35,
    safetyStatus: 'safe',
    matchScore: 92,
    matchedSensory: ['gurih'],
    recommendationReason:
      'Aman dari alergi yang tersimpan dan cocok untuk rasa gurih',
  },
  {
    id: 'demo-2',
    name: 'Pollo e Porcini',
    description:
      'Pizza dengan ayam, jamur portobello, saus jamur, mozzarella, dan pesto.',
    price: 46000,
    imageUrl:
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80',
    category: 'main_course',
    cluster: 'western_indonesian',
    restaurant: 'Pizza Marzano Indonesia',
    sourceUrl: 'https://www.pizzamarzano.co.id/menu/main-menu/',
    tags: ['high_protein'],
    allergens: ['susu', 'gluten', 'kacang'],
    ingredients: ['ayam', 'jamur portobello', 'mozzarella', 'pesto'],
    hiddenIngredients: ['susu pada mozzarella', 'kacang pada pesto'],
    sensoryProfile: ['creamy', 'gurih', 'aromatik'],
    calories: 360,
    rating: 0,
    reviewCount: 0,
    priceStatus: 'simulated',
    prepMinutes: 17,
    safetyStatus: 'unsafe',
    matchScore: 0,
    matchedSensory: [],
    reason:
      'Terdeteksi susu, gluten, atau kacang dari mozzarella, adonan, dan pesto',
  },
  {
    id: 'demo-3',
    name: 'Ayam Taliwang',
    description: 'Ayam bakar juicy dengan sambal Taliwang yang pedas berasap.',
    price: 75000,
    imageUrl:
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80',
    category: 'main_course',
    cluster: 'western_indonesian',
    restaurant: 'Sate Khas Senayan',
    sourceUrl: 'https://satekhas.sarirasa.co.id/menu',
    tags: ['high_protein', 'low_carb'],
    allergens: [],
    ingredients: ['ayam', 'cabai', 'tomat', 'terasi'],
    hiddenIngredients: ['terasi fermentasi'],
    sensoryProfile: ['juicy', 'smoky', 'pedas'],
    calories: 380,
    rating: 0,
    reviewCount: 0,
    priceStatus: 'official_snapshot_2026_07_11',
    prepMinutes: 28,
    safetyStatus: 'safe',
    matchScore: 90,
    matchedSensory: ['pedas'],
    recommendationReason:
      'Aman dari alergi yang tersimpan dan cocok untuk rasa pedas',
  },
  {
    id: 'demo-4',
    name: 'Bakmi Spesial GM',
    description: 'Mi kenyal dengan ayam jamur kecap dan pangsit renyah.',
    price: 35000,
    imageUrl:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
    category: 'main_course',
    cluster: 'chinese_food',
    restaurant: 'Bakmi GM',
    sourceUrl: 'https://www.bakmigm.com/bakmi-spesial-gm',
    tags: ['halal'],
    allergens: ['gluten', 'telur', 'kedelai'],
    ingredients: ['mi telur', 'ayam', 'jamur'],
    hiddenIngredients: ['telur dan gluten pada mi'],
    sensoryProfile: ['kenyal', 'gurih'],
    calories: 520,
    rating: 0,
    reviewCount: 0,
    priceStatus: 'simulated',
    prepMinutes: 15,
    safetyStatus: 'safe',
    matchScore: 88,
    matchedSensory: ['gurih'],
    recommendationReason: 'Sesuai selera gurihmu',
  },
  {
    id: 'demo-5',
    name: 'Udang Saus Padang',
    description: 'Udang segar dengan saus Padang pedas, kental, dan harum.',
    price: 68000,
    imageUrl:
      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=900&q=80',
    category: 'main_course',
    cluster: 'seafood',
    restaurant: 'Bandar Djakarta',
    sourceUrl: 'https://www.bandar-djakarta.com/menu-udang/',
    tags: ['high_protein', 'spicy'],
    allergens: ['seafood', 'telur', 'kedelai'],
    ingredients: ['udang', 'saus tomat', 'telur'],
    hiddenIngredients: ['telur sebagai pengental'],
    sensoryProfile: ['juicy', 'pedas', 'gurih'],
    crossContaminationRisk:
      'Dimasak di wok yang juga menangani kepiting dan cumi.',
    calories: 430,
    rating: 0,
    reviewCount: 0,
    priceStatus: 'simulated',
    prepMinutes: 25,
    safetyStatus: 'unsafe',
    matchScore: 0,
    matchedSensory: [],
    reason: 'Terdeteksi seafood dan telur',
  },
  {
    id: 'demo-6',
    name: 'Spaghetti Aglio Olio',
    description:
      'Pasta al dente dengan bawang putih, cabai, dan minyak zaitun.',
    price: 44000,
    imageUrl:
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
    category: 'main_course',
    cluster: 'western_indonesian',
    restaurant: 'Pizza Marzano Indonesia',
    sourceUrl: 'https://www.pizzamarzano.co.id/menu/main-menu/',
    tags: ['vegetarian'],
    allergens: ['gluten'],
    ingredients: ['pasta gandum', 'bawang putih', 'cabai'],
    hiddenIngredients: ['gluten pada pasta'],
    sensoryProfile: ['al_dente', 'aromatik', 'pedas'],
    calories: 480,
    rating: 0,
    reviewCount: 0,
    priceStatus: 'simulated',
    prepMinutes: 20,
    safetyStatus: 'safe',
    matchScore: 86,
    matchedSensory: ['pedas'],
    recommendationReason:
      'Aman dari alergi yang tersimpan dan cocok untuk rasa pedas',
  },
];

const defaultPreferences: Preferences = {
  allergies: [],
  diet: 'none',
  dislikedTags: [],
  hasPreferences: false,
};

function getUserId() {
  const stored = localStorage.getItem('begofood-user-id');
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem('begofood-user-id', id);
  return id;
}

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function clusterLabel(value: string) {
  return clusters.find((item) => item.value === value)?.label ?? value;
}

function App() {
  const [userId] = useState(getUserId);
  const [menus, setMenus] = useState<Menu[]>(
    fallbackMenus.filter((menu) => menu.safetyStatus === 'safe'),
  );
  const [unsafeMenus, setUnsafeMenus] = useState<Menu[]>(
    fallbackMenus.filter((menu) => menu.safetyStatus === 'unsafe'),
  );
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cluster, setCluster] = useState('');
  const [sensory, setSensory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [showUnsafe, setShowUnsafe] = useState(false);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 280);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    getPreferences(userId)
      .then((data) => {
        setPreferences(data);
        if (
          !data.hasPreferences &&
          !localStorage.getItem('begofood-onboarding-seen')
        )
          setPreferenceOpen(true);
      })
      .catch(() => setOffline(true));
  }, [userId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMenus({ userId, search: debouncedSearch, category, cluster, sensory })
      .then((data) => {
        if (!active) return;
        setMenus(data.safe);
        setUnsafeMenus(data.unsafe);
        setOffline(false);
      })
      .catch(() => {
        if (!active) return;
        const filtered = fallbackMenus.filter(
          (menu) =>
            (!category || menu.category === category) &&
            (!cluster || menu.cluster === cluster) &&
            (!debouncedSearch ||
              `${menu.name} ${menu.description}`
                .toLowerCase()
                .includes(debouncedSearch.toLowerCase())),
        );
        setMenus(filtered.filter((menu) => menu.safetyStatus === 'safe'));
        setUnsafeMenus(
          filtered.filter((menu) => menu.safetyStatus === 'unsafe'),
        );
        setOffline(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId, debouncedSearch, category, cluster, sensory]);

  const topMenus = useMemo(() => menus.slice(0, 4), [menus]);

  const toggleSensory = (value: string) => {
    setSensory((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const updatePreferences = async (next: Preferences) => {
    setPreferences(next);
    try {
      const result = await savePreferences(userId, {
        allergies: next.allergies,
        diet: next.diet,
        dislikedTags: next.dislikedTags,
      });
      setPreferences(result.preferences);
      setOffline(false);
    } catch {
      setOffline(true);
    }
    localStorage.setItem('begofood-onboarding-seen', 'true');
    setPreferenceOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Begofood home">
          <span className="brand-mark">b</span>
          <span>begofood</span>
        </a>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <a className="active" href="#recommendations">
            Rekomendasi
          </a>
          <a href="#catalog">Jelajah menu</a>
          <button type="button" onClick={() => setPreferenceOpen(true)}>
            Profil rasa
          </button>
        </nav>
        <div className="header-actions">
          <div className="location">
            <span>⌖</span>
            <div>
              <small>Lokasi kamu</small>
              <strong>Jakarta Selatan</strong>
            </div>
          </div>
          <button
            className="avatar"
            type="button"
            onClick={() => setPreferenceOpen(true)}
            aria-label="Buka profil"
          >
            AP
          </button>
        </div>
      </header>

      <main id="top">
        {offline && (
          <div className="offline-banner">
            Mode demo aktif — nyalakan backend untuk memuat seluruh 36 menu dan
            AI.
          </div>
        )}

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">✦ REKOMENDASI YANG PAHAM KAMU</span>
            <h1 id="hero-title">
              Makan enak,
              <br />
              <em>tanpa rasa cemas.</em>
            </h1>
            <p>
              Ceritakan yang kamu mau. Bego AI mencocokkan rasa, diet, dan
              alergimu sampai ke bahan yang sering tersembunyi.
            </p>
            <div className="hero-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Lagi ingin yang renyah dan gurih..."
                aria-label="Cari menu berdasarkan rasa"
              />
              <button type="button" onClick={() => setChatOpen(true)}>
                Tanya Bego AI <span>↗</span>
              </button>
            </div>
            <div className="preference-summary">
              <button
                type="button"
                onClick={() => setPreferenceOpen(true)}
                className="profile-pill"
              >
                ☘ Profilmu
              </button>
              {preferences.allergies.length ? (
                preferences.allergies.map((item) => (
                  <span className="warning-pill" key={item}>
                    Tanpa {item}
                  </span>
                ))
              ) : (
                <span>Belum ada alergi tersimpan</span>
              )}
              {preferences.diet && preferences.diet !== 'none' && (
                <span className="safe-pill">
                  {preferences.diet.replace('_', ' ')}
                </span>
              )}
              <button
                className="text-button"
                type="button"
                onClick={() => setPreferenceOpen(true)}
              >
                Ubah
              </button>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orbit orbit-one">✓ Aman untukmu</div>
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=85"
              alt=""
            />
            <div className="hero-orbit orbit-two">
              <b>94%</b>
              <span>Cocok dengan seleramu</span>
            </div>
          </div>
        </section>

        <section className="taste-section" aria-labelledby="taste-title">
          <div>
            <span className="section-kicker">MOOD MAKAN</span>
            <h2 id="taste-title">Hari ini lagi ingin yang...</h2>
          </div>
          <div className="taste-chips">
            {sensoryOptions.map((item) => (
              <button
                className={sensory.includes(item) ? 'selected' : ''}
                key={item}
                type="button"
                onClick={() => toggleSensory(item)}
              >
                {item === 'renyah'
                  ? '🥨'
                  : item === 'hangat'
                    ? '♨'
                    : item === 'pedas'
                      ? '🌶'
                      : item === 'segar'
                        ? '🍋'
                        : '✦'}{' '}
                {item}
              </button>
            ))}
          </div>
        </section>

        <section id="recommendations" className="recommendation-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">DIPILIH KHUSUS UNTUKMU</span>
              <h2>Rekomendasi Bego AI</h2>
            </div>
            <p>{menus.length} menu lolos pemeriksaan profilmu</p>
          </div>
          <div className="featured-grid">
            {topMenus.map((menu, index) => (
              <MenuCard
                menu={menu}
                featured={index === 0}
                key={menu.id}
                onClick={() => setSelectedMenu(menu)}
              />
            ))}
          </div>
        </section>

        <section id="catalog" className="catalog-section">
          <div className="section-heading catalog-heading">
            <div>
              <span className="section-kicker">JELAJAH MENU</span>
              <h2>Cari favorit barumu</h2>
            </div>
            <select
              value={cluster}
              onChange={(event) => setCluster(event.target.value)}
              aria-label="Filter klaster restoran"
            >
              {clusters.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="category-tabs">
            {categories.map((item) => (
              <button
                type="button"
                key={item.value}
                className={category === item.value ? 'active' : ''}
                onClick={() => setCategory(item.value)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="loading-grid">
              {[1, 2, 3, 4].map((item) => (
                <div className="skeleton" key={item} />
              ))}
            </div>
          ) : menus.length ? (
            <div className="menu-grid">
              {menus.map((menu) => (
                <MenuCard
                  menu={menu}
                  key={menu.id}
                  onClick={() => setSelectedMenu(menu)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>⌕</span>
              <h3>Belum ada menu yang pas</h3>
              <p>Coba longgarkan filter rasa atau kategori.</p>
            </div>
          )}

          {unsafeMenus.length > 0 && (
            <div className="unsafe-section">
              <button
                className="unsafe-toggle"
                type="button"
                onClick={() => setShowUnsafe((value) => !value)}
              >
                <span>
                  ⚠ {unsafeMenus.length} menu disaring demi keamananmu
                </span>
                <b>
                  {showUnsafe ? 'Sembunyikan' : 'Lihat alasannya'}{' '}
                  {showUnsafe ? '↑' : '↓'}
                </b>
              </button>
              {showUnsafe && (
                <div className="menu-grid unsafe-grid">
                  {unsafeMenus.map((menu) => (
                    <MenuCard
                      menu={menu}
                      key={menu.id}
                      onClick={() => setSelectedMenu(menu)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark">b</span>
          <span>begofood</span>
        </div>
        <p>Purwarupa sistem rekomendasi menu berbasis Agentic AI.</p>
        <span>Data katalog untuk simulasi penelitian • 2026</span>
      </footer>

      <button
        className="ai-fab"
        type="button"
        onClick={() => setChatOpen(true)}
      >
        <span>✦</span>
        <div>
          <b>Tanya Bego AI</b>
          <small>Online • Siap bantu</small>
        </div>
      </button>
      <nav className="mobile-nav">
        <a className="active" href="#top">
          <span>⌂</span>Home
        </a>
        <a href="#catalog">
          <span>⌕</span>Jelajah
        </a>
        <button type="button" onClick={() => setChatOpen(true)}>
          <span className="mobile-ai">✦</span>AI
        </button>
        <button type="button" onClick={() => setPreferenceOpen(true)}>
          <span>♙</span>Profil
        </button>
      </nav>

      {preferenceOpen && (
        <PreferenceModal
          preferences={preferences}
          onClose={() => setPreferenceOpen(false)}
          onSave={updatePreferences}
        />
      )}
      {selectedMenu && (
        <MenuDetail menu={selectedMenu} onClose={() => setSelectedMenu(null)} />
      )}
      {chatOpen && (
        <ChatPanel userId={userId} onClose={() => setChatOpen(false)} />
      )}
    </div>
  );
}

function MenuCard({
  menu,
  featured = false,
  onClick,
}: {
  menu: Menu;
  featured?: boolean;
  onClick: () => void;
}) {
  const unsafe = menu.safetyStatus === 'unsafe';
  return (
    <article
      className={`menu-card ${featured ? 'featured' : ''} ${unsafe ? 'unsafe' : ''}`}
      onClick={onClick}
    >
      <div className="menu-image-wrap">
        <img src={menu.imageUrl} alt={menu.name} loading="lazy" />
        <span className={unsafe ? 'unsafe-badge' : 'safe-badge'}>
          {unsafe ? '⚠ Tidak aman' : '✓ Aman untukmu'}
        </span>
        {!unsafe && (
          <span className="match-badge">{menu.matchScore}% match</span>
        )}
      </div>
      <div className="menu-content">
        <div className="restaurant-row">
          <span>{menu.restaurant}</span>
          <span>✓ Menu resmi</span>
        </div>
        <h3>{menu.name}</h3>
        <p>{unsafe ? menu.reason : menu.description}</p>
        {!unsafe && menu.recommendationReason && (
          <div className="reason-box">
            <span>✦</span>
            {menu.recommendationReason}
          </div>
        )}
        <div className="sensory-row">
          {menu.sensoryProfile.slice(0, 3).map((item) => (
            <span key={item}>{item.replace('_', ' ')}</span>
          ))}
        </div>
        <div className="menu-meta">
          <div>
            <strong>{money(menu.price)}</strong>
            <span>
              {menu.priceStatus?.startsWith('official')
                ? 'Harga resmi snapshot'
                : 'Harga estimasi'}{' '}
              • {menu.calories} kkal
            </span>
          </div>
          <button type="button" disabled={unsafe}>
            {unsafe ? 'Terkunci' : 'Lihat detail'}
          </button>
        </div>
      </div>
    </article>
  );
}

function PreferenceModal({
  preferences,
  onClose,
  onSave,
}: {
  preferences: Preferences;
  onClose: () => void;
  onSave: (next: Preferences) => void;
}) {
  const [draft, setDraft] = useState(preferences);
  const toggleAllergy = (item: string) =>
    setDraft((current) => ({
      ...current,
      allergies: current.allergies.includes(item)
        ? current.allergies.filter((value) => value !== item)
        : [...current.allergies, item],
    }));
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal preference-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preference-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="close-button" type="button" onClick={onClose}>
          ×
        </button>
        <span className="modal-icon">☘</span>
        <span className="section-kicker">PROFIL PERSONAL</span>
        <h2 id="preference-title">Biar kami jaga pilihanmu.</h2>
        <p>
          Informasi ini dipakai untuk menyaring menu sebelum direkomendasikan.
          Pilih yang sesuai dengan kondisimu.
        </p>
        <fieldset>
          <legend>Alergi makanan</legend>
          <div className="choice-grid">
            {allergyOptions.map((item) => (
              <button
                type="button"
                className={
                  draft.allergies.includes(item) ? 'selected danger' : ''
                }
                key={item}
                onClick={() => toggleAllergy(item)}
              >
                <span>
                  {item === 'seafood'
                    ? '🦐'
                    : item === 'kacang'
                      ? '🥜'
                      : item === 'telur'
                        ? '🥚'
                        : '🥛'}
                </span>
                <b>{item}</b>
                <small>
                  {draft.allergies.includes(item)
                    ? 'Akan dihindari'
                    : 'Tidak dipilih'}
                </small>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Pola makan</legend>
          <div className="diet-options">
            {dietOptions.map((item) => (
              <label key={item.value}>
                <input
                  type="radio"
                  name="diet"
                  value={item.value}
                  checked={(draft.diet || 'none') === item.value}
                  onChange={() =>
                    setDraft((current) => ({ ...current, diet: item.value }))
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="medical-note">
          <span>ⓘ</span>
          <p>
            <b>Penting:</b> hasil sistem adalah bantuan keputusan, bukan
            pengganti saran medis. Konfirmasi langsung ke restoran untuk alergi
            berat.
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => onSave({ ...draft, hasPreferences: true })}
        >
          Simpan profil & lihat menu aman
        </button>
      </section>
    </div>
  );
}

function MenuDetail({ menu, onClose }: { menu: Menu; onClose: () => void }) {
  const unsafe = menu.safetyStatus === 'unsafe';
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal detail-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="close-button floating"
          type="button"
          onClick={onClose}
        >
          ×
        </button>
        <img className="detail-image" src={menu.imageUrl} alt={menu.name} />
        <div className="detail-body">
          <span
            className={unsafe ? 'unsafe-badge inline' : 'safe-badge inline'}
          >
            {unsafe ? '⚠ Pilihan dikunci' : '✓ Lolos pemeriksaan alergi'}
          </span>
          <small>
            {clusterLabel(menu.cluster)} • {menu.restaurant}
          </small>
          <h2>{menu.name}</h2>
          <p>{menu.description}</p>
          <div
            className={
              unsafe ? 'safety-explanation danger' : 'safety-explanation'
            }
          >
            <span>{unsafe ? '!' : '✦'}</span>
            <div>
              <b>
                {unsafe
                  ? 'Mengapa menu ini tidak aman?'
                  : `Mengapa cocok ${menu.matchScore}%?`}
              </b>
              <p>{unsafe ? menu.reason : menu.recommendationReason}</p>
            </div>
          </div>
          <div className="detail-columns">
            <div>
              <h4>Komposisi utama</h4>
              <p>{menu.ingredients.join(', ')}</p>
            </div>
            <div>
              <h4>Bahan tersembunyi</h4>
              <p>
                {menu.hiddenIngredients.length
                  ? menu.hiddenIngredients.join(', ')
                  : 'Tidak terdeteksi'}
              </p>
            </div>
          </div>
          {menu.crossContaminationRisk && (
            <div className="contamination-note">
              <b>Risiko kontaminasi silang</b>
              <p>{menu.crossContaminationRisk}</p>
            </div>
          )}
          <div className="detail-footer">
            <div>
              <small>
                {menu.priceStatus?.startsWith('official')
                  ? 'Harga resmi saat sumber diakses'
                  : 'Harga estimasi penelitian'}
              </small>
              <strong>{money(menu.price)}</strong>
            </div>
            <button type="button" disabled={unsafe}>
              {unsafe ? 'Tidak dapat dipilih' : 'Masukkan ke pilihan'}
            </button>
          </div>
          {menu.sourceUrl && (
            <a
              className="source-link"
              href={menu.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Lihat sumber menu resmi ↗
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

type ChatMessage = { role: 'assistant' | 'user'; text: string };
function ChatPanel({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hai, gue Bego AI ✦ Lagi ingin rasa atau tekstur seperti apa? Gue juga akan cek profil alergimu sebelum merekomendasikan.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(
    () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
    [messages],
  );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;
    setInput('');
    setMessages((items) => [...items, { role: 'user', text: message }]);
    setSending(true);
    try {
      const result = await chat(message, userId, sessionId);
      setSessionId(result.sessionId);
      setMessages((items) => [
        ...items,
        { role: 'assistant', text: result.response },
      ]);
    } catch {
      setMessages((items) => [
        ...items,
        {
          role: 'assistant',
          text: 'Backend AI belum tersambung. Kamu tetap bisa memakai filter katalog dan profil alergi di halaman utama.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };
  return (
    <aside className="chat-panel" aria-label="Percakapan dengan Bego AI">
      <header>
        <div>
          <span>✦</span>
          <div>
            <b>Bego AI</b>
            <small>Asisten rasa & keamanan menu</small>
          </div>
        </div>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="chat-body">
        <div className="chat-context">
          Profil alergi selalu diperiksa sebelum rekomendasi.
        </div>
        {messages.map((message, index) => (
          <div
            className={`message ${message.role}`}
            key={`${message.role}-${index}`}
          >
            {message.text}
          </div>
        ))}
        {sending && <div className="message assistant typing">● ● ●</div>}
        <div ref={bottomRef} />
      </div>
      <div className="quick-prompts">
        <button
          type="button"
          onClick={() => setInput('Aku ingin makanan hangat dan gurih')}
        >
          Hangat & gurih
        </button>
        <button
          type="button"
          onClick={() => setInput('Rekomendasikan menu high protein')}
        >
          High protein
        </button>
      </div>
      <form onSubmit={submit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ceritakan makanan yang kamu mau..."
        />
        <button type="submit" aria-label="Kirim pesan">
          ↑
        </button>
      </form>
    </aside>
  );
}

export default App;
