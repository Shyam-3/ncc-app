import { ROLES } from '@/shared/config/constants';

interface RoleSelectProps {
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
}

export default function RoleSelect({ value, onChange, disabled = false }: RoleSelectProps) {
  const roleEntries = Object.entries(ROLES).map(([_, roleValue]) => roleValue);
  const uniqueRoles = Array.from(new Set(roleEntries));

  return (
    <div className="form-group">
      <label htmlFor="role">Role</label>
      <select
        id="role"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Select a role</option>
        {uniqueRoles.map((role: string) => (
          <option key={role} value={role}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
