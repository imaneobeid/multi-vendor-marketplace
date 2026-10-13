export const money = (n) => `$${Number(n).toFixed(2)}`;
export const orderRef = (id) => String(id).slice(-6).toUpperCase();
export const formatDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
