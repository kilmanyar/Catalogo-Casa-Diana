import { useEffect, useMemo, useRef, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { BadgeCheck, ChevronDown, Heart, User, MapPin, MessageCircle, Search, ShieldCheck, ShoppingBag } from "lucide-react";
import {
  BROWSE_PRODUCTS,
  CATEGORIES,
  GENDERS,
  PERFUME_TYPES,
  PRODUCTS,
  STORE,
  EMPTY_PROFILE,
  brandsIn,
  cashUnit,
  categoryLabel,
  aplicarCambiosPanel,
  conOferta,
  consultText,
  filterProducts,
  lastUnits,
  matchesQuery,
  maxQty,
  money,
  productById,
  PICKUP,
  whatsappHref,
  type OfertaPublica,
  type Product,
  type SortKey,
} from "@/lib/catalog";
import { listOfertasPublicas } from "@/lib/admin/ofertas";
import { listDisponibilidad } from "@/lib/admin/stock";
import { listProductosPanel } from "@/lib/admin/productos";
import { useCart } from "@/lib/cart-store";
import { ProductCard } from "@/components/store/product-card";
import { ProductDetail } from "@/components/store/product-detail";
import { CartDrawer } from "@/components/store/cart-drawer";
import { FavoritesDrawer } from "@/components/store/favorites-drawer";
import { InstalarApp } from "@/components/store/instalar-app";
import { CuentaDialog } from "@/components/store/cuenta-dialog";
import { ContactDialog } from "@/components/store/contact-dialog";
import { SocialLinks } from "@/components/store/social-links";
import classicCss from "@/components/store/classic.css?inline";

const ACCENT: Record<string, string> = {
  perfumes: "#E63B57",
  decants: "#2F7FBF",
  cosmeticos: "#EE6B3D",
  maquillaje: "#D9534F",
  relojes_masculino: "#2B3A4A",
  relojes_femenino: "#7A6A8C",
  accesorios: "#C77B3E",
  suplementos: "#2F7D4A",
};

const routeApi = getRouteApi("/");

export function StorePage() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const linesMap = useCart((s) => s.lines);
  const favorites = useCart((s) => s.favorites);
  const profile = useCart((s) => s.profile);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const toggleFavorite = useCart((s) => s.toggleFavorite);
  const setProfile = useCart((s) => s.setProfile);
  const forgetProfile = useCart((s) => s.forgetProfile);
  const takeOrderCode = useCart((s) => s.takeOrderCode);

  const [query, setQuery] = useState(search.q ?? "");
  const [brand, setBrand] = useState("all");
  const [perfumeType, setPerfumeType] = useState("all");
  const [gender, setGender] = useState("all");
  const [sort, setSort] = useState<SortKey>("suggested");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [soloOfertas, setSoloOfertas] = useState(false);
  const [ofertas, setOfertas] = useState<Record<string, OfertaPublica>>({});
  const [visible, setVisible] = useState(24);
  const [cartOpen, setCartOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactText, setContactText] = useState<string | undefined>();
  const [faqPanel, setFaqPanel] = useState(false);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLElement>(null);

  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);

  useEffect(() => {
    // Ofertas y etiquetas cargadas desde el panel. Si falla, la tienda sigue con los precios normales.
    listOfertasPublicas()
      .then((rows) => setOfertas(Object.fromEntries(rows.map((r) => [r.productId, r]))))
      .catch(() => {});
  }, []);
  const [panelVer, setPanelVer] = useState(0);
  useEffect(() => {
    // Cambios del panel sobre el catálogo base. Si falla o está vacío, la tienda usa el catálogo original.
    listProductosPanel()
      .then((rows) => {
        if (rows.length > 0) {
          aplicarCambiosPanel(rows);
          setPanelVer((v) => v + 1);
        }
      })
      .catch(() => {});
  }, []);
  const [disp, setDisp] = useState<Record<string, number>>({});
  useEffect(() => {
    // Stock real (stock − reservas de pedidos abiertos) de los productos con stock controlado en el panel.
    listDisponibilidad()
      .then((rows) => setDisp(Object.fromEntries(rows.map((r) => [r.productId, r.disponible]))))
      .catch(() => {});
  }, []);
  const adj = useMemo(
    () => (p: Product) => {
      const o = conOferta(p, ofertas);
      return p.id in disp ? { ...o, stock: disp[p.id] } : o;
    },
    // panelVer: se recalcula cuando llegan los cambios del panel (precios, productos nuevos, fotos).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ofertas, disp, panelVer],
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const category = CATEGORIES.some((c) => c.id === search.cat) ? (search.cat as string) : "all";

  const brandPool = useMemo(
    () =>
      filterProducts(BROWSE_PRODUCTS, {
        category,
        query,
        brand: "all",
        perfumeType,
        gender,
        onlyIds: null,
        sort: "suggested",
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, query, perfumeType, gender, panelVer],
  );
  const brands = useMemo(() => brandsIn(brandPool), [brandPool]);
  const safeBrand = brands.includes(brand) ? brand : "all";

  const filtered = useMemo(() => {
    const min = Number(minPrice.replace(/\D/g, "")) || 0;
    const max = Number(maxPrice.replace(/\D/g, "")) || 0;
    const base = filterProducts(BROWSE_PRODUCTS, {
      category,
      query,
      brand: safeBrand,
      perfumeType,
      gender,
      onlyIds: null,
      sort,
    }).map(adj);
    return base.filter((p) => {
      if (soloOfertas && !p.etiqueta) return false;
      if (min && cashUnit(p) < min) return false;
      if (max && cashUnit(p) > max) return false;
      return true;
    });
  }, [category, query, safeBrand, perfumeType, gender, sort, adj, minPrice, maxPrice, soloOfertas]);

  useEffect(() => {
    setVisible(24);
  }, [category, query, safeBrand, perfumeType, gender, sort, minPrice, maxPrice, soloOfertas, adj]);

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return BROWSE_PRODUCTS.filter((p) => matchesQuery(p, q)).slice(0, 6);
  }, [query, panelVer]);

  const detailBase = search.p ? productById(search.p) : undefined;
  const detail = detailBase ? adj(detailBase) : undefined;
  const cartLines = useMemo(
    () =>
      Object.entries(linesMap).flatMap(([id, qty]) => {
        const base = productById(id);
        if (!base || qty <= 0) return [];
        return [{ product: adj(base), qty }];
      }),
    [linesMap, adj],
  );
  const cartCount = cartLines.reduce((s, i) => s + i.qty, 0);
  const cartCash = cartLines.reduce((s, i) => s + cashUnit(i.product) * i.qty, 0);
  const favProducts = useMemo(
    () => PRODUCTS.filter((p) => favorites[p.id]).map(adj),
    [favorites, adj],
  );
  const showHome = category === "all" && !query.trim();
  const spotlight = showHome ? lastUnits().map(adj) : [];
  const shown = filtered.slice(0, visible);

  const openProduct = (id: string) => {
    setSuggestOpen(false);
    setCartOpen(false);
    setFavOpen(false);
    void navigate({ search: (prev) => ({ ...prev, p: id }), resetScroll: false });
  };

  const setCategory = (id: string) => {
    setBrand("all");
    setPerfumeType("all");
    setGender("all");
    void navigate({
      search: (prev) => ({ ...prev, cat: id === "all" ? undefined : id, p: undefined }),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addedTimer = useRef<number | null>(null);
  const handleAdd = (id: string, qty = 1) => {
    add(id, qty);
    setJustAdded(id);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setJustAdded((cur) => (cur === id ? null : cur)), 8000);
  };

  const helpText = `Hola, estoy mirando el catálogo de ${STORE.name} y quisiera que me asesoren para elegir.`;
  const openContact = (text?: string) => {
    setContactText(text);
    setContactOpen(true);
  };
  const openFaq = () => {
    setFaqPanel(true);
    requestAnimationFrame(() => faqRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: classicCss }} />
      <div className="announce-bar">Compras online 24/7</div>
      <header className="hero">
        <nav className="navbar">
          <div className="navbar-brand">
            <img src={STORE.logo} alt="" width={34} height={34} className="navbar-logo" />
            <span>Casa Diana</span>
          </div>
          <div className="navbar-links">
            <button type="button" className="navbar-link" onClick={openFaq}>Preguntas frecuentes</button>
            <button type="button" className="navbar-link" onClick={() => openContact()}>Contacto</button>
          </div>
          <div className="header-actions">
            <SocialLinks compact />
            <button type="button" aria-label="Mi cuenta" className="cart-toggle" onClick={() => setCuentaOpen(true)}>
              <User size={18} />
            </button>
            <button type="button" aria-label="Favoritos" className={"cart-toggle" + (favProducts.length > 0 ? " fav-active" : "")} onClick={() => setFavOpen(true)}>
              <Heart size={18} fill={favProducts.length > 0 ? "currentColor" : "none"} />
              {favProducts.length > 0 ? <span className="cart-badge">{favProducts.length}</span> : null}
            </button>
            <button type="button" aria-label="Abrir pedido" className="cart-toggle" onClick={() => setCartOpen(true)}>
              <ShoppingBag size={18} />
              {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
            </button>
          </div>
        </nav>
        <div className="hero-inner">
          <h1>Casa Diana</h1>
          <p className="tagline">{STORE.tagline}</p>
          <span className="open-indicator"><span className="open-dot" /> Compras online 24/7</span>
        </div>
        <div className="hero-rule" aria-hidden><span className="diamond" /></div>
      </header>

      <div className="trust-row">
        <span><BadgeCheck size={15} /> Autenticidad garantizada</span>
        <span><ShieldCheck size={15} /> Garantía por defecto de fábrica</span>
        <span><MapPin size={15} /> Retiro en Lambaré</span>
      </div>

      <section className="info-tiles">
        <button type="button" className={"info-tile" + (faqPanel ? " open" : "")} aria-expanded={faqPanel} onClick={() => setFaqPanel((open) => !open)}>
          <span className="info-tile-title">Preguntas frecuentes</span>
          <span className="info-tile-sub">Horarios, cambios y garantía</span>
        </button>
        <button type="button" className="info-tile" onClick={() => openContact()}>
          <span className="info-tile-title">Contacto</span>
          <span className="info-tile-sub">WhatsApp y el local</span>
        </button>
      </section>
      {faqPanel ? (
        <section className="faq-panel" ref={faqRef} id="preguntas">
          <div className="faq-list">
            {STORE.faq.map((item) => {
              const isOpen = openQ === item.q;
              return (
                <div key={item.q} className="faq-item">
                  <button type="button" className="faq-question" aria-expanded={isOpen} onClick={() => setOpenQ(isOpen ? null : item.q)}>
                    {item.q}
                    <ChevronDown size={16} aria-hidden className={isOpen ? "faq-chevron open" : "faq-chevron"} />
                  </button>
                  {isOpen ? <p className="faq-answer">{item.a}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="controls">
        <div ref={searchRef} className="search-wrap">
          <Search size={15} className="search-icon" aria-hidden />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            placeholder="Buscar productos…"
            aria-label="Buscar productos"
          />
          {suggestOpen && suggestions.length > 0 ? (
            <div className="search-suggestions">
              {suggestions.map((p) => (
                <button key={p.id} type="button" onClick={() => openProduct(p.id)} className="search-suggestion-row">
                  <span className="search-suggestion-img">{p.image ? <img src={p.image} alt="" /> : null}</span>
                  <span className="search-suggestion-info">
                    <span className="search-suggestion-name">{p.name}</span>
                    <span className="search-suggestion-cat">{categoryLabel(p.category)}</span>
                  </span>
                  <span className="search-suggestion-price">{p.price > 0 ? `₲ ${money(p.price)}` : "Consultar"}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="chips">
          <button type="button" onClick={() => setCategory("all")} className={"chip" + (category === "all" ? " active" : "")}>Todo</button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={"chip" + (category === c.id ? " active" : "")}
              style={category === c.id ? { background: ACCENT[c.id], borderColor: ACCENT[c.id] } : undefined}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="filter-row">
          {category === "perfumes" || category === "decants" ? (
            <select className="filter-select" aria-label="Tipo de perfume" value={perfumeType} onChange={(e) => setPerfumeType(e.target.value)}>
              <option value="all">Todos los tipos</option>
              {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : null}
          {category === "perfumes" || category === "decants" ? (
            <select className="filter-select" aria-label="Género" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="all">Todos los géneros</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          ) : null}
          <select className="filter-select" aria-label="Marca" value={safeBrand} onChange={(e) => setBrand(e.target.value)}>
            <option value="all">Todas las marcas</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="filter-select" aria-label="Orden" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="suggested">Orden sugerido</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
            <option value="name">Nombre</option>
          </select>
          <input className="filter-select" style={{ width: 120 }} inputMode="numeric" aria-label="Precio mínimo" placeholder="Desde ₲" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          <input className="filter-select" style={{ width: 120 }} inputMode="numeric" aria-label="Precio máximo" placeholder="Hasta ₲" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          {Object.keys(ofertas).length > 0 ? (
            <button type="button" className={"chip" + (soloOfertas ? " active" : "")} aria-pressed={soloOfertas} onClick={() => setSoloOfertas((v) => !v)}>Ofertas y novedades</button>
          ) : null}
        </div>
      </section>

      <main className="grid-wrap">
        {spotlight.length > 0 ? (
          <div className="featured-strip">
            <div className="featured-strip-label">Últimas unidades</div>
            <div className="featured-strip-row">
              {spotlight.map((p) => (
                <button key={p.id} type="button" onClick={() => openProduct(p.id)} className="featured-mini">
                  <span className="featured-mini-img">{p.image ? <img src={p.image} alt="" /> : null}</span>
                  <span className="featured-mini-name">{p.name}</span>
                  <span className="featured-mini-price">₲ {money(p.price)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="count-line">
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
          {category !== "all" ? ` en ${categoryLabel(category)}` : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="empty">
            <p>No hay productos con esos filtros.</p>
            <button type="button" className="faq-link" onClick={() => { setQuery(""); setBrand("all"); setPerfumeType("all"); setGender("all"); setCategory("all"); }}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="catalog-grid">
              {shown.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  favorite={Boolean(favorites[p.id])}
                  inCart={linesMap[p.id] ?? 0}
                  justAdded={justAdded === p.id}
                  onOpen={() => openProduct(p.id)}
                  onAdd={() => handleAdd(p.id, 1)}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                  onConsult={() => openContact(consultText(p))}
                />
              ))}
            </div>
            {visible < filtered.length ? (
              <div className="load-more-row">
                <button type="button" className="btn-load-more" onClick={() => setVisible((v) => v + 24)}>
                  Ver más productos ({filtered.length - visible} restantes)
                </button>
              </div>
            ) : null}
          </>
        )}

        <section className="engage-banner">
          <p>Si preferís una recomendación, te asesoramos para elegir.</p>
          <button type="button" onClick={() => openContact(helpText)}>
            <MessageCircle size={15} aria-hidden />
            Escribir por WhatsApp
          </button>
        </section>
      </main>

      <footer className="foot">
        <p>{STORE.name} · {BROWSE_PRODUCTS.length} productos</p>
        <p>{PICKUP.street}<br />Lambaré - Paraguay</p>
        <a className="foot-wa" href={whatsappHref("Hola, escribo desde el catálogo de Casa Diana.")} target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#25D366" d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10.1 10.1 0 0 0 4.65 1.14h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.85c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.12.1-1.81-.11-.42-.13-.95-.3-1.64-.59-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.27.64-.39 1.02-.39.12 0 .23 0 .33.01.3.01.45.03.65.5.24.58.82 2 .89 2.15.07.14.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.56.16.27.7 1.16 1.51 1.88 1.04.92 1.91 1.21 2.18 1.35.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.54.73 1.8.86.27.13.44.2.51.31.07.11.07.64-.17 1.32z" />
          </svg>
          +{STORE.whatsapp}
        </a>
        <SocialLinks />
        <button type="button" className="faq-link" onClick={() => openContact()}>Contacto</button>
        <button type="button" className="faq-link" onClick={openFaq}>Preguntas frecuentes</button>
        <a className="faq-link" href="/seguimiento">Seguir mi pedido</a>
        <InstalarApp />
      </footer>

      {cartCount > 0 && !cartOpen ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="safe-bottom fixed bottom-4 left-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-navy px-4 text-sm font-semibold text-paper shadow-lg"
        >
          <ShoppingBag className="size-4" aria-hidden />
          {cartCount}
          <span>₲ {money(cartCash)}</span>
        </button>
      ) : null}

      {detail ? (
        <ProductDetail
          key={detail.id}
          product={detail}
          favorite={Boolean(favorites[detail.id])}
          inCart={linesMap[detail.id] ?? 0}
          justAdded={justAdded === detail.id}
          onClose={() => {
            void navigate({ search: (prev) => ({ ...prev, p: undefined }), resetScroll: false });
          }}
          onAdd={(qty) => handleAdd(detail.id, qty)}
          onOpenAccount={() => setCuentaOpen(true)}
          onToggleFavorite={() => toggleFavorite(detail.id)}
          onOpen={openProduct}
          onContact={() => openContact(consultText(detail))}
        />
      ) : null}

      <CartDrawer
        open={cartOpen}
        lines={cartLines}
        profile={{ ...EMPTY_PROFILE, ...profile }}
        onClose={() => setCartOpen(false)}
        onSetQty={setQty}
        onRemove={remove}
        onProfile={setProfile}
        onForgetProfile={forgetProfile}
        onTakeCode={takeOrderCode}
        onClear={clear}
        onOpenProduct={openProduct}
      />
      <FavoritesDrawer
        open={favOpen}
        products={favProducts}
        onClose={() => setFavOpen(false)}
        onOpenProduct={openProduct}
        onAdd={(id) => handleAdd(id, 1)}
        onRemove={toggleFavorite}
      />
      <CuentaDialog
        open={cuentaOpen}
        onClose={() => setCuentaOpen(false)}
        onRepeat={(items) => {
          let n = 0;
          for (const it of items) {
            const base = productById(it.productId);
            if (!base) continue;
            const cap = maxQty(adj(base));
            const have = linesMap[it.productId] ?? 0;
            const qty = Math.min(it.qty, cap - have);
            if (qty > 0) {
              add(it.productId, qty);
              n += 1;
            }
          }
          if (n > 0) {
            setCuentaOpen(false);
            setCartOpen(true);
          }
          return n;
        }}
      />
      <ContactDialog open={contactOpen} text={contactText} onClose={() => setContactOpen(false)} />
    </div>
  );
}
