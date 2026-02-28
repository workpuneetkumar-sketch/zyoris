"use client";

import { AppShell } from "../../components/Shell";
import { useAuthorizedClient, useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const client = useAuthorizedClient();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    async function load() {
      try {
        const res = await client.get<Profile>("/auth/me");
        setProfile(res.data);
      } catch {
        // ignore for now
      }
    }
    load();
  }, [user, client, router]);

  if (!user) return null;

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">My profile</div>
          <div className="topbar-subtitle">Account, role, and workspace metadata.</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="panel-title">Account details</div>
        <table className="table">
          <tbody>
            <tr>
              <th>Email</th>
              <td>{profile?.email ?? user.email}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{profile?.name ?? user.name}</td>
            </tr>
            <tr>
              <th>Role</th>
              <td>{profile?.role ?? user.role}</td>
            </tr>
            {profile && (
              <>
                <tr>
                  <th>Created at</th>
                  <td>{new Date(profile.createdAt).toLocaleString()}</td>
                </tr>
                <tr>
                  <th>Last updated</th>
                  <td>{new Date(profile.updatedAt).toLocaleString()}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

