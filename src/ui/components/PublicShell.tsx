import { ReactNode } from "react";
import PublicTopBar from "./PublicTopBar";

export type PublicShellProps = {
  children: ReactNode;
};

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="admin-shell-canvas">
      <div className="admin-shell">
        <PublicTopBar />
        <div className="space-y-6">
          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default PublicShell;
