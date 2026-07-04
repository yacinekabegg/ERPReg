export function AccessDenied() {
  return (
    <div className="notice">
      <strong>Accès refusé.</strong> Ce module n'est pas ouvert à votre rôle.
    </div>
  );
}

export function ModuleNotice({
  sprint,
  children,
}: {
  sprint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="notice">
      <div style={{ marginBottom: 6 }}>
        <span className="badge muted">{sprint}</span>
      </div>
      {children}
    </div>
  );
}
