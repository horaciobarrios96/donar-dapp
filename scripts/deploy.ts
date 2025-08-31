import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("⛽ Iniciando despliegue de Donaciones...");

  const Donaciones = await ethers.getContractFactory("Donaciones");
  const donaciones = await Donaciones.deploy();

  // Espera a que quede minado
  await donaciones.waitForDeployment();

  const address = await donaciones.getAddress();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("✅ Donaciones desplegado en:", address);
  console.log("🌐 Red:", network.name || "sepolia", " | chainId:", chainId);

  // Guarda un JSON con la info para el front
  const outDir = path.join(process.cwd(), "deployed");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outFile = path.join(outDir, `Donaciones-sepolia.json`);
  const data = {
    name: "Donaciones",
    address,
    network: "sepolia",
    chainId,
    // Ruta del ABI en artifacts (la usaremos en el siguiente paso para el front)
    abiArtifact: "artifacts/contracts/Donaciones.sol/Donaciones.json"
  };
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2), "utf-8");
  console.log(`📝 Guardado: ${outFile}`);
}

main().catch((err) => {
  console.error("❌ Error en despliegue:", err);
  process.exit(1);
});
