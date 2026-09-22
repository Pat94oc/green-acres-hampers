import Link from 'next/link';
import { LogoutButton } from './logout-button';

const links = [
  ['/production', 'Production'],
  ['/in-progress', 'In Progress'],
  ['/ready', 'Ready'],
  ['/done', 'Done'],
  ['/orders', 'Orders'],
];

export function Nav({ displayName }: { displayName: string }) {
  return <aside className="sidebar">
    <div className="brand">GREEN ACRES<div>Hamper Operations</div></div>
    <nav>{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    <Link className="new" href="/new-order">+ New Order</Link>
    <div className="sidebar-user"><span>{displayName}</span><LogoutButton /></div>
  </aside>;
}
