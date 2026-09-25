// ─────────────────────────────────────────────────────────────────────────────
// ProofXShield — Fresh Contract Deploy Helper
// Run in the browser DevTools console while the app is open and your Midnight
// wallet (Lace or 1AM) is connected on Preprod.
//
// Requirements:
//   • App running at http://localhost:3000 or http://localhost:5173
//   • Wallet connected on Midnight Preprod
//   • Wallet has enough NIGHT + DUST for a deploy transaction
//
// Usage: copy everything in this file, paste it into the browser DevTools
//        console, and press Enter.
// ─────────────────────────────────────────────────────────────────────────────

(async () => {

  // ── 1. Locate the wallet API the app stored on window ─────────────────────
  const walletApi =
    window.__midnightWalletApi ||
    window.midnight?.mnLace ||
    window.midnight?.mn1AM ||
    Object.values(window.midnight ?? {}).find(
      (v) => typeof v?.enable === 'function' || typeof v?.getConfiguration === 'function'
    );

  if (!walletApi) {
    console.error(
      '[deploy-helper] No wallet API found on window.midnight.\n' +
      'Open the app, connect your Lace/1AM wallet first, then paste this again.'
    );
    return;
  }

  // ── 2. Enable the wallet if the connector requires it ─────────────────────
  let api = walletApi;
  if (typeof walletApi.enable === 'function') {
    console.log('[deploy-helper] Enabling wallet…');
    api = await walletApi.enable();
  }

  // ── 3. Confirm we are on Preprod ──────────────────────────────────────────
  const config = await api.getConfiguration();
  console.log('[deploy-helper] Wallet network:', config.networkId);
  if (config.networkId !== 'preprod') {
    console.error(
      `[deploy-helper] Wallet is on "${config.networkId}" — switch to Midnight Preprod first.`
    );
    return;
  }

  // ── 4. Import proof-client helpers already loaded by the app ──────────────
  const pcMod =
    await import('/proof-client.js').catch(() => null) ||
    await import('/src/proof-client.js').catch(() => null);

  if (!pcMod) {
    console.error(
      '[deploy-helper] Could not import proof-client.js.\n' +
      'Make sure the app dev server is running and you are on the correct port.'
    );
    return;
  }

  const { createAuctionSession, getAuctionPrivateStatePassword, waitForWalletTransactions } = pcMod;

  // ── 5. Import deployContract from the bundled Midnight SDK ────────────────
  let deployContract;
  try {
    ({ deployContract } = await import('@midnight-ntwrk/midnight-js-contracts'));
  } catch {
    console.error(
      '[deploy-helper] Could not import deployContract from the Midnight SDK.\n' +
      'Run from the built + served app (yarn build && yarn server).'
    );
    return;
  }

  // ── 6. Build the compiled contract descriptor ─────────────────────────────
  const { CompiledContract } = await import('@midnight-ntwrk/midnight-js-protocol/compact-js');
  const { Contract } = await import('/contract/managed/proofxshield/contract/index.js');

  const compiledContract = CompiledContract
    .make('ProofXShieldAuction', Contract)
    .pipe(CompiledContract.withVacantWitnesses);

  // ── 7. Wait for any pending wallet transactions to clear ──────────────────
  console.log('[deploy-helper] Checking for pending transactions…');
  await waitForWalletTransactions(api, (msg) => console.log('[deploy-helper]', msg));

  // ── 8. Build session providers from the connected wallet ──────────────────
  console.log('[deploy-helper] Building providers…');
  const storagePassword = await getAuctionPrivateStatePassword(api);
  const session = await createAuctionSession(api, storagePassword);

  // ── 9. Deploy — approve the transaction in your wallet popup ──────────────
  console.log('[deploy-helper] Deploying — approve the transaction in your wallet…');
  let contractAddress;
  try {
    const deployed = await deployContract(session.providers, { compiledContract });
    contractAddress = deployed.deployTxData.public.contractAddress?.toLowerCase();
  } finally {
    await session.dispose().catch(() => {});
  }

  if (!contractAddress || !/^[0-9a-f]{64}$/.test(contractAddress)) {
    console.error('[deploy-helper] Unexpected address returned:', contractAddress);
    return;
  }

  // ── 10. Print result ──────────────────────────────────────────────────────
  console.log('%c✅ Deployed!', 'color:#22c55e;font-weight:bold;font-size:16px');
  console.log('%cNew contract address:', 'font-weight:bold', contractAddress);
  console.log(
    '\n%cUpdate contract-address.js:%c\n\n' +
    `  export const CONTRACT_ADDRESS = '${contractAddress}';\n`,
    'font-weight:bold', 'font-weight:normal'
  );

  // Store on window for easy copy
  window.__newContractAddress = contractAddress;
  console.log("Run  copy(window.__newContractAddress)  to copy it to your clipboard.");

  return contractAddress;
})();
