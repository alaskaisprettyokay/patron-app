"use client";

import { useState, useCallback } from "react";

interface WorldIDVerifyProps {
  onVerified: (proof: WorldIDProof) => void;
  action?: string;
  signal?: string;
}

interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}

const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID || "";
const IS_CONFIGURED = WORLD_APP_ID && !WORLD_APP_ID.startsWith("app_your") && WORLD_APP_ID !== "app_demo";

export function WorldIDVerify({ onVerified, action = "verify-human", signal }: WorldIDVerifyProps) {
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = useCallback(
    (result: WorldIDProof) => {
      setVerified(true);
      setVerifying(false);
      setShowDemoConfirm(false);
      onVerified(result);
    },
    [onVerified]
  );

  const handleDemoStart = () => {
    setShowDemoConfirm(true);
  };

  const handleDemoConfirm = () => {
    setVerifying(true);
    setTimeout(() => {
      handleSuccess({
        merkle_root: "0x" + "1".repeat(64),
        nullifier_hash: "0x" + "2".repeat(64),
        proof: "0x" + "3".repeat(512),
        verification_level: "device",
      });
    }, 1000);
  };

  if (verified) {
    return (
      <span className="text-xs font-mono text-accent">
        [x] Verified human
      </span>
    );
  }

  if (!IS_CONFIGURED) {
    if (showDemoConfirm) {
      return (
        <div className="flex flex-col gap-3">
          <div className="ink-block p-4 text-center">
            <div className="text-2xl mb-2">🌐</div>
            <p className="text-xs text-ink-faint mb-1">World ID (demo mode)</p>
            <p className="text-sm text-ink-light mb-3">
              in production, this opens the World App for biometric verification.
            </p>
            <button
              onClick={handleDemoConfirm}
              disabled={verifying}
              className="btn-primary text-sm w-full"
            >
              {verifying ? "verifying..." : "confirm identity (demo)"}
            </button>
          </div>
          <button
            onClick={() => setShowDemoConfirm(false)}
            className="text-xs text-ink-faint hover:text-ink"
          >
            cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={handleDemoStart}
          className="btn-secondary text-sm"
        >
          Verify with World ID
        </button>
        <p className="text-ink-faint text-xs">Demo mode</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <WorldIDWidget appId={WORLD_APP_ID} onSuccess={handleSuccess} action={action} signal={signal} />
      {error && <p className="text-accent text-xs">{error}</p>}
    </div>
  );
}

function WorldIDWidget({
  appId,
  onSuccess,
  action,
  signal,
}: {
  appId: string;
  onSuccess: (proof: WorldIDProof) => void;
  action: string;
  signal?: string;
}) {
  const [Widget, setWidget] = useState<React.ComponentType<any> | null>(null);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    setLoaded(true);
    import("@worldcoin/idkit")
      .then((mod) => setWidget(() => mod.IDKitWidget))
      .catch(() => {});
  }

  if (!Widget) {
    return (
      <button disabled className="btn-secondary text-sm opacity-50">
        Loading World ID...
      </button>
    );
  }

  return (
    <Widget
      app_id={appId}
      action={action}
      signal={signal}
      onSuccess={(result: any) =>
        onSuccess({
          merkle_root: result.merkle_root,
          nullifier_hash: result.nullifier_hash,
          proof: result.proof,
          verification_level: result.verification_level || "device",
        })
      }
      verification_level="device"
    >
      {({ open }: { open: () => void }) => (
        <button onClick={open} className="btn-secondary text-sm">
          Verify with World ID
        </button>
      )}
    </Widget>
  );
}
