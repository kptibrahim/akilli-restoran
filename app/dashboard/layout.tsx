import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { ThemeProvider } from "@/components/ThemeProvider";

const LAYOUT_CSS = `
  .dash-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--ast-bg, #141210);
  }
  .dash-sidebar {
    display: none;
    background: var(--ast-sidebar-bg, #1C1710);
    border-right: 1px solid var(--ast-sidebar-border, rgba(200,148,52,0.12));
  }
  .dash-content {
    flex: 1;
    min-width: 0;
    padding-bottom: 6rem;
  }
  .dash-mobile {
    display: flex;
  }
  @media (min-width: 768px) {
    .dash-shell {
      flex-direction: row;
      align-items: flex-start;
    }
    .dash-sidebar {
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      width: 256px;
      min-width: 256px;
      height: 100vh;
      overflow-y: auto;
      z-index: 30;
    }
    .dash-content {
      padding-bottom: 2rem;
    }
    .dash-mobile {
      display: none;
    }
  }
`;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase
    .from("Restoran")
    .select("id, isim, slug, renk, logo")
    .eq("userId", user.id)
    .single();

  return (
    <ThemeProvider>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: LAYOUT_CSS }} />
      <div className="dash-shell">
        <DashboardNav
          userEmail={user.email ?? ""}
          restoran={restoran ?? null}
          restoranId={restoran?.id}
          restoranLogo={restoran?.logo ?? null}
        />
        <main className="dash-content">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
