import { useEffect, useState } from 'react';
import { getMenus, getPersonas, getPreferences, savePreferences } from './api';
import type { Menu, Persona, Preferences } from './types';

const categories = [
  { value: '', label: 'Semua', icon: '🍽' },
  { value: 'main_course', label: 'Makanan utama', icon: '🥘' },
  { value: 'appetizer', label: 'Pembuka', icon: '🥗' },
  { value: 'dessert', label: 'Pencuci mulut', icon: '🍰' },
  { value: 'beverage', label: 'Minuman', icon: '🥤' },
  { value: 'snack', label: 'Camilan', icon: '🍿' },
];

const clusters = [
  { value: '', label: 'Semua klaster' },
  { value: 'western_indonesian', label: 'Western & Indonesia' },
  { value: 'chinese_food', label: 'Chinese food' },
  { value: 'seafood', label: 'Seafood' },
];

const sensoryOptions = ['renyah', 'hangat', 'pedas', 'segar', 'gurih'];

const allergyOptions = ['kacang', 'susu', 'telur', 'seafood'];

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
    priceStatus: 'simulated',
    prepMinutes: 35,
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
    priceStatus: 'simulated',
    prepMinutes: 17,
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
    priceStatus: 'official_snapshot_2026_07_11',
    prepMinutes: 28,
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
    priceStatus: 'simulated',
    prepMinutes: 15,
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
    priceStatus: 'simulated',
    prepMinutes: 25,
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
    priceStatus: 'simulated',
    prepMinutes: 20,
  },
];

const defaultPreferences: Preferences = {
  allergies: [],
  diet: 'none',
  dislikedTags: [],
  hasPreferences: false,
};

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function clusterLabel(value: string) {
  return clusters.find((item) => item.value === value)?.label || value;
}

function App() {
  // Pre-populate with fallback so UI is never blank
  const fallbackPersonas: Persona[] = [
    { id: 'persona-andi', name: 'Andi', emoji: '👨‍🍳', bio: 'Penyuka pedas sejati — bebas alergi, pantang hambar', preferences: { allergies: [], diet: null, dislikedTags: [] } },
    { id: 'persona-budi', name: 'Budi', emoji: '🥜', bio: 'Alergi kacang & seafood — harus ekstra hati-hati', preferences: { allergies: ['kacang', 'seafood'], diet: null, dislikedTags: [] } },
    { id: 'persona-dedi', name: 'Dedi', emoji: '💪', bio: 'Alergi telur — hindari telur & olahannya', preferences: { allergies: ['telur'], diet: null, dislikedTags: [] } },
  ];
  const [personas, setPersonas] = useState<Persona[]>(fallbackPersonas);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [menus, setMenus] = useState<Menu[]>(fallbackMenus);
  const [unsafeMenus, setUnsafeMenus] = useState<Menu[]>([]);
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

  const hasFiltering = preferences.hasPreferences;
  const personaSelected = !!selectedPersona;

  // Load personas on mount
  useEffect(() => {
    const stored = localStorage.getItem('begofood-persona');

    const initFromPersona = (persona: Persona) => {
      // Set local preferences from persona data first (instant UI)
      setSelectedPersona(persona);
      setUserId(persona.id);
      setPreferences({ ...persona.preferences, hasPreferences: true });

      // Then fetch real preferences from backend (overwrites jika ada customization)
      getPreferences(persona.id)
        .then((data) => {
          setPreferences(data);
          setOffline(false);
        })
        .catch(() => setOffline(true));
    };

    getPersonas()
      .then((data) => {
        setPersonas(data);
        if (stored) {
          const match = data.find((p) => p.id === stored);
          if (match) initFromPersona(match);
        }
      })
      .catch(() => {
        // API offline — fallbackPersonas already set as initial state
        if (stored) {
          const match = fallbackPersonas.find((p) => p.id === stored);
          if (match) initFromPersona(match);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPersona = async (persona: Persona) => {
    localStorage.setItem('begofood-persona', persona.id);
    setSelectedPersona(persona);
    setUserId(persona.id);

    // Set preferences from persona data instantly (UI feedback)
    setPreferences({ ...persona.preferences, hasPreferences: true });

    // Save ke backend, lalu fetch ulang biar konsisten
    try {
      const result = await savePreferences(persona.id, {
        allergies: persona.preferences.allergies,
        diet: null,
        dislikedTags: persona.preferences.dislikedTags,
      });
      setPreferences(result.preferences);
      setOffline(false);
    } catch {
      // Backend offline — local preferences tetap kepake
      setOffline(true);
    }
  };



  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 280);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!personaSelected) return;
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
        const safe = filtered.filter(
          (menu) =>
            !preferences.allergies.some((a) => menu.allergens.includes(a)),
        );
        const unsafe = filtered.filter((menu) =>
          preferences.allergies.some((a) => menu.allergens.includes(a)),
        );
        setMenus(
          safe.map((menu) => ({
            ...menu,
            safetyStatus: 'safe' as const,
            matchScore: 80,
            matchedSensory: [],
            recommendationReason: 'Aman dari alergi yang tersimpan',
          })),
        );
        setUnsafeMenus(
          unsafe.map((menu) => ({
            ...menu,
            safetyStatus: 'unsafe' as const,
            matchScore: 0,
            matchedSensory: [],
            reason: `Terdeteksi ${preferences.allergies.filter((a) => menu.allergens.includes(a)).join(', ')}`,
          })),
        );
        setOffline(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, debouncedSearch, category, cluster, sensory, personaSelected, preferences.allergies]);

  const toggleSensory = (value: string) => {
    setSensory((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const updatePreferences = async (next: Preferences) => {
    try {
      const result = await savePreferences(userId, {
        allergies: next.allergies,
        diet: null,
        dislikedTags: next.dislikedTags,
      });
      setPreferences(result.preferences);
      setOffline(false);
    } catch {
      setOffline(true);
    }
    setPreferenceOpen(false);
  };

  // Show persona selector if none selected
  if (!personaSelected) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="Begofood home">
            <span className="brand-mark">b</span>
            <span>begofood</span>
          </a>
        </header>
        <main className="persona-picker">
          <div className="persona-picker-header">
            <span className="eyebrow">✦ SELAMAT DATANG</span>
            <h1>Siapa yang pakai?</h1>
            <p>Pilih profil yang paling cocok dengan kebutuhanmu. Preferensi bisa diubah kapan saja.</p>
          </div>
          <div className="persona-grid">
            {personas.map((persona) => (
              <button
                key={persona.id}
                className="persona-card"
                type="button"
                onClick={() => selectPersona(persona)}
              >
                <span className="persona-emoji">{persona.emoji}</span>
                <strong>{persona.name}</strong>
                <small>{persona.bio}</small>
                <div className="persona-pills">
                  {persona.preferences.allergies.map((a) => (
                    <span className="warning-pill" key={a}>Tanpa {a}</span>
                  ))}
                  {persona.preferences.dislikedTags.map((t) => (
                    <span className="safe-pill" key={t}>Suka {t}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

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
            className="avatar persona-avatar"
            type="button"
            onClick={() => setPreferenceOpen(true)}
            aria-label="Buka profil"
            title={selectedPersona?.name}
          >
            {selectedPersona?.emoji}
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
              Ceritakan yang kamu mau. Foodi AI mencocokkan rasa dan
              alergimu sampai ke bahan yang sering tersembunyi.
            </p>
            <div className="preference-summary">
              <button
                type="button"
                onClick={() => setPreferenceOpen(true)}
                className="profile-pill"
              >
                {selectedPersona?.emoji} {selectedPersona?.name}
              </button>
              {preferences.allergies.length ? (
                preferences.allergies.map((item) => (
                  <span className="warning-pill" key={item}>
                    Tanpa {item}
                  </span>
                ))
              ) : (
                <span>Tidak ada alergi</span>
              )}


              {preferences.dislikedTags.length > 0 && (
                <span className="safe-pill">
                  Pengen {preferences.dislikedTags.join(', ')}
                </span>
              )}
              <button
                className="text-button"
                type="button"
                onClick={() => setPreferenceOpen(true)}
              >
                Ubah
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  localStorage.removeItem('begofood-persona');
                  setSelectedPersona(null);
                  setUserId('');
                  setPreferences(defaultPreferences);
                  setMenus(fallbackMenus);
                  setUnsafeMenus([]);
                }}
              >
                Ganti profil
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
          <div className="catalog-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari menu..."
              aria-label="Cari menu"
            />
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
                  hasFiltering={true}
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
                      hasFiltering={true}
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


      <nav className="mobile-nav">
        <a className="active" href="#top">
          <span>⌂</span>Home
        </a>
        <a href="#catalog">
          <span>⌕</span>Jelajah
        </a>

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
        <MenuDetail menu={selectedMenu} onClose={() => setSelectedMenu(null)} hasFiltering={true} />
      )}

    </div>
  );
}

function MenuCard({
  menu,
  featured = false,
  hasFiltering,
  onClick,
}: {
  menu: Menu;
  featured?: boolean;
  hasFiltering: boolean;
  onClick: () => void;
}) {
  const unsafe = menu.safetyStatus === 'unsafe';
  return (
    <article
      className={`menu-card ${featured ? 'featured' : ''} ${unsafe ? 'unsafe' : ''}`}
      onClick={onClick}
    >
      <div className="menu-image-wrap">
        <img src={menu.imageUrl || `https://placehold.co/400x300/f5f3ee/252420?text=${encodeURIComponent(menu.name)}`} alt={menu.name} loading="lazy" />
        {hasFiltering && (
          <span className={unsafe ? 'unsafe-badge' : 'safe-badge'}>
            {unsafe ? '⚠ Tidak aman' : '✓ Aman untukmu'}
          </span>
        )}
        {hasFiltering && !unsafe && menu.matchScore && (
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
        {!unsafe && menu.recommendationReason && hasFiltering && (
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
          <legend>Lagi pengen rasa apa hari ini?</legend>
          <div className="taste-chips dislike-chips">
            {['pedas', 'manis', 'pahit', 'gurih'].map((item) => (
              <button
                type="button"
                className={draft.dislikedTags.includes(item) ? 'selected' : ''}
                key={item}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    dislikedTags: current.dislikedTags.includes(item)
                      ? current.dislikedTags.filter((value) => value !== item)
                      : [...current.dislikedTags, item],
                  }))
                }
              >
                {item === 'pedas' ? '🌶' : item === 'manis' ? '🍬' : item === 'pahit' ? '☕' : '🧂'} {item}
              </button>
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

function MenuDetail({ menu, onClose, hasFiltering }: { menu: Menu; onClose: () => void; hasFiltering: boolean }) {
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
        <img className="detail-image" src={menu.imageUrl || `https://placehold.co/600x400/f5f3ee/252420?text=${encodeURIComponent(menu.name)}`} alt={menu.name} />
        <div className="detail-body">
          {hasFiltering && (
            <span
              className={unsafe ? 'unsafe-badge inline' : 'safe-badge inline'}
            >
              {unsafe ? '⚠ Pilihan dikunci' : '✓ Lolos pemeriksaan alergi'}
            </span>
          )}
          <small>
            {clusterLabel(menu.cluster)} • {menu.restaurant}
          </small>
          <h2>{menu.name}</h2>
          <p>{menu.description}</p>
          {menu.aiDescription && (
            <div className="ai-description">
              <span>✦</span>
              <div>
                <b>Analisis Foodi AI</b>
                <p>{menu.aiDescription}</p>
              </div>
            </div>
          )}
          {hasFiltering && (
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
                    : `Mengapa cocok ${menu.matchScore ?? 0}%?`}
                </b>
                <p>{unsafe ? menu.reason : menu.recommendationReason}</p>
              </div>
            </div>
          )}
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

export default App;
