import { ReactNode } from "react";
import PublicTopBar from "./PublicTopBar";

export type PublicShellProps = {
  children: ReactNode;
  tightTop?: boolean;
};

export function PublicShell({ children, tightTop = false }: PublicShellProps) {
  return (
    <div className="admin-shell-canvas">
      <div className={`admin-shell ${tightTop ? "admin-shell--tight" : ""}`.trim()}>
        <PublicTopBar />
        <div className="space-y-6">
          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default PublicShell;
