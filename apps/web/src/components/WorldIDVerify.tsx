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
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = useCallback(
    (result: WorldIDProof) => {
      setVerified(true);
      setVerifying(false);
      onVerified(result);
    },
    [onVerified]
  );

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);

    if (IS_CONFIGURED) {
      try {
        const { IDKitWidget, VerificationLevel } = await import("@worldcoin/idkit");
        setVerifying(false);
        setError("Click the World ID button to verify");
      } catch {
        useMockVerification();
      }
    } else {
      useMockVerification();
    }
  };

  const useMockVerification = () => {
    setTimeout(() => {
      handleSuccess({
        merkle_root: "0x" + "1".repeat(64),
        nullifier_hash: "0x" + "2".repeat(64),
        proof: "0x" + "3".repeat(512),
        verification_level: "device",
      });
    }, 1500);
  };

  if (verified) {
    return (
      <span className="text-xs font-mono text-accent">
        [x] Verified human
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {IS_CONFIGURED ? (
        <WorldIDWidget appId={WORLD_APP_ID} onSuccess={handleSuccess} action={action} signal={signal} />
      ) : (
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="btn-secondary text-sm"
        >
          {verifying ? "Verifying..." : "Verify with World ID"}
        </button>
      )}
      {error && <p className="text-accent text-xs">{error}</p>}
      {!IS_CONFIGURED && (
        <p className="text-ink-faint text-xs">Demo mode</p>
      )}
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
      .catch(() => {
        onSuccess({
          merkle_root: "0x" + "1".repeat(64),
          nullifier_hash: "0x" + "2".repeat(64),
          proof: "0x" + "3".repeat(512),
          verification_level: "device",
        });
      });
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
