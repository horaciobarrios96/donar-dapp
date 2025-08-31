"use client";

import { useReadContract } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { type Abi } from "viem";

// usa el mismo JSON del contrato que ya cargaste en la card
import Donaciones from "../contracts/Donaciones.json";

const CONTRACT = {
  address: Donaciones.address as `0x${string}`,
  abi: Donaciones.abi as Abi,
} as const;

function formatEth(wei?: bigint) {
  if (!wei) return "0";
  const eth = Number(wei) / 1e18;
  return eth.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function StatsBar() {
  const {
    data: totalDonated,
    refetch: refetchTotal,
    isFetching: loadingTotal,
  } = useReadContract({
    abi: CONTRACT.abi,
    address: CONTRACT.address,
    functionName: "totalDonated",
    chainId: arbitrumSepolia.id,
    query: { enabled: true, refetchInterval: 10000 },
  });

  const {
    data: donationsCount,
    refetch: refetchCount,
    isFetching: loadingCount,
  } = useReadContract({
    abi: CONTRACT.abi,
    address: CONTRACT.address,
    functionName: "donationsCount",
    chainId: arbitrumSepolia.id,
    query: { enabled: true, refetchInterval: 10000 },
  });

  const refreshing = loadingTotal || loadingCount;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        border: "1px solid #333",
        background: "#0b0b0b",
      }}
    >
      <div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Total recaudado</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {formatEth(totalDonated as bigint)} ETH
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, opacity: 0.8 }}># de donaciones</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {(donationsCount as bigint)?.toString() ?? "0"}
        </div>
      </div>
      <button
        onClick={() => {
          refetchTotal();
          refetchCount();
        }}
        disabled={refreshing}
        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #444" }}
      >
        {refreshing ? "Actualizando..." : "Refrescar"}
      </button>
    </div>
  );
}
