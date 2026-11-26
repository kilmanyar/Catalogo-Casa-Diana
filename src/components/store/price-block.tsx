import { cashDiscount, money, type Product } from "@/lib/catalog";

export function PriceBlock({ product, large, fromLabel }: { product: Product; large?: boolean; fromLabel?: boolean }) {
  const off = cashDiscount(product);
  if (product.price <= 0) {
    return <p className="price">Consultar</p>;
  }
  return (
    <div className={"price-block" + (large ? " price-block-lg" : "")}>
      <p className="price">{fromLabel ? "Desde " : ""}₲ {money(product.price)}{product.precioAntes ? <s className="ml-2 text-sm font-normal text-muted">₲ {money(product.precioAntes)}</s> : null}</p>
      {off > 0 ? (
        <>
          <p className="price-discount-row">
            <span className="discount-badge">-{off}%</span>
            <span className="price-cash-amount">₲ {money(product.priceCash)}</span>
          </p>
          <p className="price-cash-label">Descuento pagando en efectivo o transferencia</p>
        </>
      ) : null}
    </div>
  );
}
