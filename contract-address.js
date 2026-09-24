// Set this once to the address emitted by the singleton contract deployment.
export const CONTRACT_ADDRESS = '5945455af17740ed58789367447af626d3241b830f581ef0b10949d72e67e287';

export function requireContractAddress() {
  if (!/^[0-9a-f]{64}$/i.test(CONTRACT_ADDRESS)) {
    throw new Error('The shared auction contract has not been configured. Deploy the multi-auction contract once, then set CONTRACT_ADDRESS in contract-address.js.');
  }
  return CONTRACT_ADDRESS.toLowerCase();
}
