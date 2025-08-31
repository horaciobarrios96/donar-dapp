"use client";

import { useEffect, useState, useMemo } from "react";
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { parseEther, isAddress, type Abi, zeroAddress } from "viem";
import { arbitrumSepolia } from "wagmi/chains";

// Importa el JSON con address + abi correctos
import Donaciones from "../contracts/Donaciones.json";
import type { DonationEvent } from "../data/events";

const CONTRACT = {
  address: Donaciones.address as `0x${string}`,
  abi: Donaciones.abi as Abi,
} as const;

// ===== Validaciones =====
const MIN_ETH_STR = "0.001"; // mínimo permitido en ETH como string
const MIN_WEI = parseEther(MIN_ETH_STR as `${number}`);

// ---- Helper de errores robusto ----
function prettyErr(err: unknown) {
  if (!err) return "Error desconocido";
  if (typeof err === "string") return err;
  // @ts-ignore
  if (err?.shortMessage) return (err as any).shortMessage as string;
  // @ts-ignore
  if (err?.message) return (err as any).message as string;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function formatEth(wei?: bigint) {
  if (!wei) return "0";
  const eth = Number(wei) / 1e18;
  return eth.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
const normalizeAmount = (s: string) => s.replace(",", ".").trim();

export default function DonationCard({ event }: { event: DonationEvent }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const correctChain = chainId === arbitrumSepolia.id;

  // Validaciones derivadas
  const isValidRecipient = isAddress(event.recipient) && event.recipient !== zeroAddress;
  const [amount, setAmount] = useState<string>("0.01");
  const [message, setMessage] = useState<string>("");

  // Parseo seguro del monto a wei
  const parsedWei = useMemo(() => {
    try {
      const norm = normalizeAmount(amount);
      if (!norm) return null;
      return parseEther(norm as `${number}`);
    } catch {
      return null;
    }
  }, [amount]);

  const amountTooSmall = !parsedWei || parsedWei < MIN_WEI;

  // 0) Leer paused
  const { data: paused } = useReadContract({
    abi: CONTRACT.abi,
    address: CONTRACT.address,
    functionName: "paused",
    chainId: arbitrumSepolia.id,
  });

  // 1) Leer total recibido (solo si el recipient es válido)
  const {
    data: recibido,
    refetch,
    isFetching,
  } = useReadContract({
    abi: CONTRACT.abi,
    address: CONTRACT.address,
    functionName: "receivedBy",
    args: [event.recipient as `0x${string}`],
    chainId: arbitrumSepolia.id,
    query: {
      enabled: isValidRecipient,
      refetchInterval: 8000,
    },
  });

  // 2) Simulación de donate(...) (se dispara al presionar el botón)
  const {
    error: simError,
    isFetching: simLoading,
    refetch: simulate,
  } = useSimulateContract({
    abi: CONTRACT.abi,
    address: CONTRACT.address,
    functionName: "donate",
    args: [event.recipient as `0x${string}`, message],
    value: !amountTooSmall && parsedWei ? parsedWei : undefined,
    chainId: arbitrumSepolia.id,
    query: { enabled: false },
  });

  // 3) Envío usando la request de la simulación
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  async function handleDonate() {
    if (!isConnected) {
      alert("Conecta tu wallet antes de donar.");
      return;
    }
    if (!correctChain) {
      alert("Cambia a Arbitrum Sepolia antes de donar.");
      return;
    }
    if (paused) {
      alert("El contrato está pausado. Intenta más tarde.");
      return;
    }
    if (!isValidRecipient) {
      alert("La dirección de destino no es válida.");
      return;
    }
    if (amountTooSmall) {
      alert(`El mínimo de donación es ${MIN_ETH_STR} ETH.`);
      return;
    }
    if (message.length > 200) {
      alert("El mensaje no puede superar 200 caracteres.");
      return;
    }

    try {
      // Simular antes de enviar (detecta 'Paused', 'Invalid recipient', etc.)
      const res = await simulate();
      if (res.error) {
        console.error("Simulación falló:", res.error);
        alert("La simulación falló: " + prettyErr(res.error));
        return;
      }

      // Enviar sólo si la simulación pasó
      await writeContract(res.data!.request);
    } catch (err) {
      console.error("Fallo al enviar:", err);
      alert("Fallo al enviar: " + prettyErr(err));
    }
  }

  // 4) Espera minado, refresca total y limpia mensaje
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: arbitrumSepolia.id,
  });

  useEffect(() => {
    if (isSuccess) {
      refetch();
      setMessage("");
    }
  }, [isSuccess, refetch]);

  const donating = isPending || isWaiting || simLoading;
  const disableDonate =
    donating || amountTooSmall || !isValidRecipient || !correctChain || !!paused;

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 12,
        padding: 16,
        width: 340,
        background: "#0b0b0b",
      }}
    >
      <img
        src={event.image}
        alt={event.title}
        style={{ width: "100%", borderRadius: 8 }}
      />
      <h3 style={{ margin: "12px 0 6px", fontWeight: 700 }}>{event.title}</h3>
      <div style={{ fontSize: 12, opacity: 0.8, wordBreak: "break-all" }}>
        {event.recipient}
      </div>

      {/* Avisos de validación arriba */}
      {!isValidRecipient && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            borderRadius: 8,
            background: "#331",
            border: "1px solid #633",
            fontSize: 12,
          }}
        >
          Dirección destino inválida. Corrige el recipient del evento.
        </div>
      )}
      {!correctChain && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            borderRadius: 8,
            background: "#331",
            border: "1px solid #633",
            fontSize: 12,
          }}
        >
          Estás en la red equivocada. Cambia a <b>Arbitrum Sepolia</b>.
          <div style={{ marginTop: 6 }}>
            <button
              onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #944",
              }}
            >
              Cambiar a Arbitrum Sepolia
            </button>
          </div>
        </div>
      )}
      {!!paused && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            borderRadius: 8,
            background: "#332",
            border: "1px solid #665",
            fontSize: 12,
          }}
        >
          El contrato está en pausa temporalmente.
        </div>
      )}

      {/* Total recibido */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => refetch()}
          disabled={isFetching || !isValidRecipient}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #444" }}
        >
          {isFetching ? "Consultando..." : "Refrescar"}
        </button>
        <div style={{ marginTop: 8 }}>
          Total recibido: <b>{formatEth(recibido as bigint)} ETH</b>
        </div>
      </div>

      {/* Donar */}
      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        <div>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Monto en ETH (ej. 0.02)"
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              background: "#111",
              border: "1px solid #333",
            }}
          />
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
            Mínimo permitido: {MIN_ETH_STR} ETH{" "}
            {amountTooSmall && " • Monto inválido"}
          </div>
        </div>

        <div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="Mensaje (opcional, máx. 200)"
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              background: "#111",
              border: "1px solid #333",
            }}
          />
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
            {message.length}/200 caracteres
          </div>
        </div>

        <button
          onClick={handleDonate}
          disabled={disableDonate}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #444",
            opacity: disableDonate ? 0.6 : 1,
          }}
          title={
            !isValidRecipient
              ? "Dirección destino inválida"
              : amountTooSmall
              ? `El mínimo es ${MIN_ETH_STR} ETH`
              : !correctChain
              ? "Cambia a Arbitrum Sepolia"
              : paused
              ? "Contrato pausado"
              : undefined
          }
        >
          {donating ? "Enviando..." : "Donar"}
        </button>

        {/* Info adicional */}
        {txHash && (
          <div style={{ fontSize: 12, opacity: 0.9, wordBreak: "break-all" }}>
            Tx: {txHash}
            <div style={{ marginTop: 6 }}>
              <a
                href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "underline" }}
              >
                Ver en Arbiscan (Arbitrum Sepolia)
              </a>
            </div>
          </div>
        )}
        {simError && (
          <div style={{ color: "#f66", fontSize: 12 }}>
            Simulación: {prettyErr(simError)}
          </div>
        )}
        
      </div>
    </div>
  );
}


