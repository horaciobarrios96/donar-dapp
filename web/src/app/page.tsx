'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import DonationCard from '../components/DonationCard';
import { events } from '../data/events';
import StatsBar from '../components/StatsBar'; // ← existente
import DonationsList from '../components/DonationsList'; // ← existente
import AdminControls from '../components/AdminControls'; // ← NUEVO

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 flex flex-col items-center">
      {/* Header + Connect */}
      <div className="text-center space-y-3 mb-10">
        <h1 className="text-3xl font-bold">Donaciones en Sepolia</h1>
        <p className="opacity-80">Conecta tu wallet para comenzar</p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>

      {/* Resumen global del contrato */}
      <div className="w-full max-w-3xl mb-6">
        <StatsBar />
      </div>

      {/* NUEVO: Controles de admin (solo owner) */}
      <div className="w-full max-w-3xl mb-6">
        <AdminControls />
      </div>

      {/* Grid de eventos */}
      <div className="w-full max-w-6xl">
        <h2 className="text-xl font-semibold mb-4 text-center">
          Selecciona un evento y consulta lo recibido
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <DonationCard key={e.recipient} event={e} />
          ))}
        </div>
      </div>

      {/* Listado de donaciones */}
      <div className="w-full max-w-6xl mt-10">
        <DonationsList />
      </div>
    </main>
  );
}
