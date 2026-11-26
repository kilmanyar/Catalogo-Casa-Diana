import { Check, Heart, Ruler, ShoppingBag } from "lucide-react";
import { ETIQUETA_TEXTO, brandOf, isDecant, isSoldOut, maxQty, type Product } from "@/lib/catalog";
import { PriceBlock } from "@/components/store/price-block";

export function ProductCard({
  product,
  favorite,
  inCart,
  justAdded,
  onOpen,
  onAdd,
  onToggleFavorite,
  onConsult,
}: {
  product: Product;
  favorite: boolean;
  inCart: number;
  justAdded: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onToggleFavorite: () => void;
  onConsult: () => void;
}) {
  const sold = isSoldOut(product);
  const brand = brandOf(product);
  const capped = inCart >= maxQty(product) && maxQty(product) > 0;
  const decant = isDecant(product);

  return (
    <article className="card">
      <div className="card-img-wrap" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }} aria-label={`Ver ${product.name}`}>
        {product.image ? (
          <>
            <img src={product.image} alt={product.name} className="card-img-main" />
            {product.image2 ? <img src={product.image2} alt="" className="card-img-hover" /> : null}
          </>
        ) : (
          <span className="img-fallback">{product.name.slice(0, 1)}</span>
        )}
        {sold ? <span className="badge-sold">Agotado</span> : product.etiqueta ? (
          <span className="absolute top-2 left-2 rounded bg-[#E23A4A] px-2 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">{ETIQUETA_TEXTO[product.etiqueta]}</span>
        ) : null}
        <div className="card-quick-actions">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            aria-pressed={favorite}
            aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"}
            className={"quick-btn" + (favorite ? " active" : "")}
          >
            <Heart size={14} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
      <div className="card-body">
        <h3 onClick={onOpen}>{product.name}</h3>
        {brand ? <p className="desc">{brand}</p> : null}
        {product.inspirado ? <p className="inspire">Inspirado en {product.inspirado}</p> : null}
        <PriceBlock product={product} fromLabel={decant} />
        {typeof product.stock === "number" && product.stock > 0 && product.stock <= 5 ? (
          <p className="stock-low">Quedan {product.stock}</p>
        ) : null}
      </div>
      <div className="card-footer">
        {product.price <= 0 ? (
          <button type="button" onClick={onConsult} className="btn-order">Consultar</button>
        ) : decant ? (
          <button type="button" onClick={onOpen} disabled={sold} className="btn-order">
            <Ruler size={14} aria-hidden />
            {sold ? "Agotado" : "Elegir tamaño"}
          </button>
        ) : (
          <button type="button" onClick={onAdd} disabled={sold || capped} className={"btn-order" + (justAdded ? " added" : "")}>
            {justAdded ? <Check size={14} aria-hidden /> : <ShoppingBag size={14} aria-hidden />}
            {sold ? "Agotado" : justAdded ? "Agregado" : capped ? "Máximo" : "Agregar"}
          </button>
        )}
      </div>
    </article>
  );
}
