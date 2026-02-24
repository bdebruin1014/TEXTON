import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, updateProfile, updatePassword } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      await updateProfile({ full_name: fullName });
      setProfileSuccess(true);
      toast.success("Profile updated");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
      toast.error("Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setPasswordSaving(true);
    try {
      await updatePassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password changed");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
      toast.error("Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  const initials = fullName
    ? fullName
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-medium text-foreground">Account Settings</h1>
      <p className="mt-1 text-sm text-muted">Manage your profile and security settings.</p>

      {/* Avatar + email */}
      <div className="mt-8 flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-lg text-xl font-medium"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-700))",
            color: "var(--color-primary-accent)",
          }}
        >
          {initials}
        </div>
        <div>
          <div className="font-semibold text-foreground">{fullName || "No name set"}</div>
          <div className="text-sm text-muted">{user?.email}</div>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleProfileSave} className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>

        {profileError && (
          <div className="mt-3 rounded-lg bg-destructive-bg px-3 py-2 text-sm text-destructive">{profileError}</div>
        )}
        {profileSuccess && (
          <div className="mt-3 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">Profile updated.</div>
        )}

        <div className="mt-4">
          <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-foreground">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setProfileSuccess(false);
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
          <input
            type="email"
            value={user?.email ?? ""}
            disabled
            className="w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-muted"
          />
          <p className="mt-1 text-xs text-muted">Contact an admin to change your email address.</p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            {profileSaving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>

      {/* Password change form */}
      <form onSubmit={handlePasswordChange} className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Change Password</h2>

        {passwordError && (
          <div className="mt-3 rounded-lg bg-destructive-bg px-3 py-2 text-sm text-destructive">{passwordError}</div>
        )}
        {passwordSuccess && (
          <div className="mt-3 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">Password changed.</div>
        )}

        <div className="mt-4">
          <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-foreground">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordSuccess(false);
            }}
            required
            minLength={8}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="At least 8 characters"
          />
        </div>

        <div className="mt-4">
          <label htmlFor="confirmNewPassword" className="mb-1.5 block text-sm font-medium text-foreground">
            Confirm New Password
          </label>
          <input
            id="confirmNewPassword"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Repeat new password"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            {passwordSaving ? "Changing..." : "Change Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
