"use client";

import { useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import type { Abi } from "viem";
import Donaciones from "../contracts/Donaciones.json";

const CONTRACT = {
  address: Donaciones.address as `0x${string}`,
  abi: Donaciones.abi as Abi,
} as const;

export default function AdminControls() {
  const { address, isConnected } = useAccount();

  // 1) Leer owner() y paused()
  const { data: owner } = useReadContract({
    abi: CONTRACT.abi,
    address: CONTRACT.address,
    functionName: "owner",
    chainId: arbitrumSepolia.id,
    query: { enabled: true, refetchInterval: 12000 },
  });

  const {
    data: paused,
    refetch: refetchPaused,
    isFetching: fetchingPaused,
  } = useReadContract({
    abi: CONTRACT.abi,
    address: CONTRACT.address,
    functionName: "paused",
    chainId: arbitrumSepolia.id,
    query: { enabled: true, refetchInterval: 12000 },
  });

  const isOwner =
    isConnected &&
    address &&
    owner &&
    address.toLowerCase() === (owner as string).toLowerCase();

  // 2) Simular setPaused(!paused)
  const {
    data: simData,
    error: simError,
    refetch: simulateToggle,
    isFetching: simLoading,
  } = useSimulateContract({
    abi: CONTRACT.abi,
    address: CONTRACT.address,
    functionName: "setPaused",
    args: [!(paused as boolean)],
    chainId: arbitrumSepolia.id,
    query: { enabled: false },
  });

  // 3) Enviar tx con el request de la simulación
  const {
    writeContract,
    data: txHash,
    isPending: sending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: arbitrumSepolia.id,
  });

  useEffect(() => {
    if (isSuccess) refetchPaused();
  }, [isSuccess, refetchPaused]);

  async function handleToggle() {
    if (!isOwner) {
      alert("Solo el propietario del contrato puede usar esta función.");
      return;
    }
    const res = await simulateToggle();
    if (res.error) {
      const msg =
        (res.error as any)?.shortMessage ||
        (res.error as Error).message ||
        "Fallo en simulación";
      alert("La simulación falló: " + msg);
      return;
    }
    writeContract(res.data!.request);
  }

  if (!isOwner) {
    return null; // No mostrar nada si no es el owner
  }

  const working = fetchingPaused || simLoading || sending || waiting;

  return (
    <div className="w-full max-w-3xl mb-6 p-3 rounded border border-gray-600 bg-[#0b0b0b]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm opacity-80">Estado del contrato</div>
          <div className="text-lg font-semibold">
            {paused ? "⏸️ Pausado" : "▶️ Activo"}
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={working}
          className="px-3 py-2 rounded border border-gray-500"
        >
          {working
            ? "Procesando…"
            : paused
            ? "Reanudar donaciones"
            : "Pausar donaciones"}
        </button>
      </div>

      {(simError || writeError) && (
        <div className="text-xs text-red-400 mt-2">
          {(simError as Error)?.message || (writeError as Error)?.message}
        </div>
      )}

      {txHash && (
        <div className="text-xs opacity-80 mt-2">
          Tx:{" "}
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Ver en Arbiscan
          </a>
        </div>
      )}
    </div>
  );
}
