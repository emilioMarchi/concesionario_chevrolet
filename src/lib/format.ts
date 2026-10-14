export function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'Consultar';
  return '$' + price.toLocaleString('es-AR');
}