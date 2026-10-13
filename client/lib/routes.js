// Where each kind of account lands after logging in
export const homeFor = (role) =>
  ({ vendor: '/vendor/dashboard', admin: '/admin' }[role] || '/');
