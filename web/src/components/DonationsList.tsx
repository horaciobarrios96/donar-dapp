"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { formatEther, type Abi } from "viem";

import Donaciones from "../contracts/Donaciones.json";

const CONTRACT = {
  address: Donaciones.address as `0x${string}`,
  abi: Donaciones.abi as Abi,
} as const;

type DonationLog = {
  donor: string;
  recipient: string;
  amount: string;
  message: string;
  txHash: string;
};

export default function DonationsList() {
  const client = usePublicClient({ chainId: arbitrumSepolia.id });
  const [logs, setLogs] = useState<DonationLog[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadLogs() {
    if (!client) return; // 👈 evita error si client aún no está listo
    setLoading(true);
    try {
      const events = await client.getLogs({
        address: CONTRACT.address,
        event: {
          type: "event",
          name: "Donated",
          inputs: [
            { indexed: true, type: "address", name: "donor" },
            { indexed: true, type: "address", name: "recipient" },
            { indexed: false, type: "uint256", name: "amount" },
            { indexed: false, type: "string", name: "message" },
          ],
        },
        fromBlock: BigInt(0), // puedes limitar desde un bloque específico si quieres
        toBlock: "latest",
      });

      const parsed = events.map((e) => ({
        donor: (e.args?.donor as string) ?? "",
        recipient: (e.args?.recipient as string) ?? "",
        amount: formatEther(e.args?.amount as bigint),
        message: (e.args?.message as string) ?? "",
        txHash: e.transactionHash,
      }));

      setLogs(parsed.reverse().slice(0, 10)); // mostrar últimos 10
    } catch (err) {
      console.error("Error cargando logs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [client]);

  return (
    <div className="w-full max-w-4xl mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Donaciones recientes</h2>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-3 py-1 rounded border border-gray-500"
        >
          {loading ? "Cargando..." : "Refrescar"}
        </button>
      </div>

      {logs.length === 0 && !loading && (
        <p className="text-sm opacity-70">Aún no hay donaciones registradas.</p>
      )}

      <ul className="space-y-3">
        {logs.map((log, i) => (
          <li
            key={i}
            className="p-3 border border-gray-600 rounded bg-[#111]"
          >
            <div className="text-sm">
              <b>{log.amount} ETH</b> de {log.donor.slice(0, 6)}…{log.donor.slice(-4)}
              {" → "}
              {log.recipient.slice(0, 6)}…{log.recipient.slice(-4)}
            </div>
            {log.message && (
              <div className="text-xs opacity-80 mt-1">💬 {log.message}</div>
            )}
            <a
              href={`https://sepolia.arbiscan.io/tx/${log.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs underline opacity-70"
            >
              Ver en Arbiscan
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
