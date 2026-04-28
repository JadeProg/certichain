import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

const CONTRACT_ADDRESS = "0x87A3170cD03a005653328fbE498Cc68149799C55";
const METAMASK_URL = "https://metamask.io/pt-BR";

const ABI = [
  "function registerCertificate(bytes32 fileHash) public",
  "function verifyCertificate(bytes32 fileHash) public view returns (bool)",
];

function App() {
  const [account, setAccount] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  // 🆕 NOVO ESTADO
  const [showMetaMaskPage, setShowMetaMaskPage] = useState(false);

  // 🔥 NOVA FUNÇÃO
  function redirectToMetaMask() {
    setShowMetaMaskPage(true);

    setTimeout(() => {
      window.location.href = METAMASK_URL;
    }, 2500);
  }

  async function connectWallet() {
    if (!window.ethereum) {
      redirectToMetaMask();
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setAccount(accounts[0]);
    setStatus("Carteira conectada com sucesso.");
  }

  async function getContract(useSigner = true) {
    const provider = new ethers.BrowserProvider(window.ethereum);

    if (useSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    }

    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  }

  async function checkIfRegistered(hash) {
    if (!window.ethereum) {
      setIsRegistered(false);
      return;
    }

    const contract = await getContract(false);
    const result = await contract.verifyCertificate(hash);

    setIsRegistered(result);

    if (result) {
      setStatus("Este certificado já está registrado na blockchain.");
    }
  }

  async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setTxHash("");
    setIsRegistered(false);

    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const hash =
      "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    setFileHash(hash);
    setStatus("Hash gerado com sucesso.");

    await checkIfRegistered(hash);
  }

  async function registerCertificate() {
    if (!window.ethereum) {
      redirectToMetaMask();
      return;
    }

    if (!account) {
      setStatus("Conecte a MetaMask primeiro.");
      return;
    }

    if (!fileHash) {
      setStatus("Selecione um PDF primeiro.");
      return;
    }

    if (isRegistered) {
      setStatus("Este certificado já está registrado.");
      return;
    }

    const contract = await getContract(true);

    setStatus("Enviando transação para a blockchain...");

    const tx = await contract.registerCertificate(fileHash);
    setTxHash(tx.hash);

    await tx.wait();

    setIsRegistered(true);
    setStatus("Certificado registrado com sucesso.");
  }

  async function verifyCertificate() {
    if (!window.ethereum) {
      redirectToMetaMask();
      return;
    }

    if (!fileHash) {
      setStatus("Selecione um PDF primeiro.");
      return;
    }

    const contract = await getContract(false);
    const isValid = await contract.verifyCertificate(fileHash);

    setIsRegistered(isValid);

    setStatus(
      isValid
        ? "Certificado válido na blockchain."
        : "Certificado NÃO encontrado."
    );
  }

  // 🆕 TELA BONITINHA
  if (showMetaMaskPage) {
    return (
      <main className="metamaskPage">
        <div className="metamaskCard">
          <div className="metamaskIcon">🦊</div>
          <h1>MetaMask necessária</h1>
          <p>
            Para usar o sistema, você precisa instalar ou conectar sua carteira.
          </p>
          <span>Redirecionando...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="logoCard">🔐</div>
        <h1>CertiVault</h1>
        <p className="subtitle">
          Registre e valide certificados PDF usando blockchain.
        </p>

        <button className="walletButton" onClick={connectWallet}>
          {account ? "Carteira conectada" : "Conectar MetaMask"}
        </button>

        {account && (
          <p className="account">
            {account.slice(0, 6)}...{account.slice(-4)}
          </p>
        )}
      </section>

      <section className="grid">
        <div className="section">
          <div className="icon">📄</div>
          <h2>Enviar certificado</h2>

          <label className="uploadBox">
            <input type="file" accept="application/pdf" onChange={handleFile} />
            <strong>Selecionar PDF</strong>
            <small>{fileName || "Nenhum arquivo"}</small>
          </label>
        </div>

        <div className="section">
          <div className="icon">⛓️</div>
          <h2>Hash do arquivo</h2>

          {fileHash && (
            <div className="hashBox">
              <span>SHA-256</span>
              <p>{fileHash}</p>
            </div>
          )}

          <div className="actions">
            {!isRegistered && (
              <button onClick={registerCertificate}>
                Registrar na blockchain
              </button>
            )}

            <button onClick={verifyCertificate}>Verificar</button>
          </div>

          {status && <p className="status">{status}</p>}

          {txHash && (
            <a
              className="explorer"
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
            >
              Ver no Etherscan
            </a>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;