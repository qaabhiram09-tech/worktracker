import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import AdminPanel from "./AdminPanel";
import Tracker from "./Tracker";

const Centered = ({ children }) => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif", color: "#94a3b8", fontSize: 14, padding: 16, textAlign: "center" }}>
    {children}
  </div>
);

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSuspended(false);
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setProfile(null); setProfileLoading(false); return; }

    setProfileLoading(true);
    (async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (error || !data) {
        await supabase.auth.signOut({ scope: "local" });
        setProfile(null);
        setProfileLoading(false);
        return;
      }
      if (data.status === "suspended") {
        await supabase.auth.signOut({ scope: "local" });
        setSuspended(true);
        setProfile(null);
        setProfileLoading(false);
        return;
      }
      setProfile(data);
      setProfileLoading(false);
    })();
  }, [session]);

  if (session === undefined || profileLoading) {
    return <Centered>Loading…</Centered>;
  }

  if (suspended) {
    return (
      <Centered>
        <div>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚫</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9", marginBottom: 6 }}>Account suspended</div>
          <div>Your account has been suspended. Contact your administrator.</div>
        </div>
      </Centered>
    );
  }

  if (!session || !profile) {
    return <Login />;
  }

  const onSignOut = () => supabase.auth.signOut({ scope: "local" });

  if (profile.role === "admin") {
    return <AdminPanel onSignOut={onSignOut} />;
  }

  return <Tracker userId={profile.id} userEmail={profile.email} onSignOut={onSignOut} />;
}
