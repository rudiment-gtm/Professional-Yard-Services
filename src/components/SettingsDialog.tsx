import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/components/AuthProvider';
import { useMembers, useInviteMember } from '@/hooks/useMembers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SettingsTab = 'profile' | 'members';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'members', label: 'Members' },
];

function ProfileTab() {
  const { user, profile, updateProfile } = useAuthContext();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await updateProfile({ display_name: displayName });
    setSavingProfile(false);
    if (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'unknown error'}`);
    } else {
      toast.success('Profile updated');
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Passwords must match and not be empty');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(`Failed to change password: ${error.message}`);
    } else {
      toast.success('Password changed');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const initials = (profile?.display_name || user?.email || '?').slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold">Profile</h3>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
          {initials}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email ?? ''} disabled />
        </div>
      </div>
      <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
        {savingProfile ? 'Saving…' : 'Save changes'}
      </Button>

      <div className="pt-4 border-t space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Change password
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={handleSavePassword} disabled={savingPassword}>
          {savingPassword ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

function MembersTab() {
  const { data: members = [], isLoading } = useMembers();
  const inviteMember = useInviteMember();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'rep'>('rep');

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMember.mutate(
      { email: inviteEmail.trim(), role: inviteRole },
      { onSuccess: () => setInviteEmail('') },
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Members</h3>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="teammate@professionalyardservices.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          className="flex-1 min-w-[200px]"
        />
        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'rep')}>
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rep">Rep</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button className="shrink-0" onClick={handleInvite} disabled={!inviteEmail.trim() || inviteMember.isPending}>
          {inviteMember.isPending ? 'Inviting…' : 'Invite'}
        </Button>
      </div>

      {/* Stacked rows rather than a fixed-column table — ProYard's real
          emails (e.g. accountmanager@professionalyardservices.com) are
          long enough that any column-width table risks either clipping
          the Role/Status cells or illegibly truncating the email. Wrapping
          the email on its own full-width line sidesteps that entirely,
          at any dialog width. */}
      <div className="rounded-lg border divide-y">
        {isLoading ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">Loading…</p>
        ) : members.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">No members yet.</p>
        ) : (
          members.map((m) => (
            <div key={m.user_id} className="px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                {m.display_name ? (
                  <>
                    <p className="font-medium text-sm">{m.display_name}</p>
                    <p className="text-xs text-muted-foreground break-words">{m.email}</p>
                  </>
                ) : (
                  <p className="font-medium text-sm break-words">{m.email}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
                <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {m.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState<SettingsTab>('profile');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden">
        <div className="flex min-h-[420px]">
          <div className="w-40 bg-muted/30 border-r p-3 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pb-2">Settings</p>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-1.5 text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                  tab === t.key ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-0 p-6 overflow-y-auto">
            {tab === 'profile' && <ProfileTab />}
            {tab === 'members' && <MembersTab />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
