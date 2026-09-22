import { Nav } from './nav';
import { requireHamperUser } from '@/lib/auth';

export async function Shell({ children }: { children: React.ReactNode }) {
  const { member } = await requireHamperUser();
  return <div className="shell"><Nav displayName={member.display_name}/><main className="main">{children}</main></div>;
}
