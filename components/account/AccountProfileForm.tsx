"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { PhoneInput } from "@/components/order/PhoneInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AccountProfileForm() {
  const { profile, getToken, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  if (!profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      await api.updateMe(token, {
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      await refreshProfile();
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="glass-card space-y-4 rounded-2xl p-4">
      <h2 className="font-semibold text-foreground">Profile</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="acct-firstName">First name</Label>
          <Input
            id="acct-firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="acct-lastName">Last name</Label>
          <Input
            id="acct-lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="acct-email">Email</Label>
        <Input id="acct-email" value={profile.email} readOnly className="opacity-80" />
      </div>
      <PhoneInput value={phone} onChange={setPhone} />
      {error && <p className="text-sm text-red-300">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      <Button type="submit" variant="primary" loading={saving} loadingText="Saving">
        Save changes
      </Button>
    </form>
  );
}
