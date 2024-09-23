import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRunesClient } from '../../api/runes/provider';
import { PsbtSummary } from '../../transactions/bitcoin/types';
import { parseSummaryForRunes } from '../../utils/runes';

vi.mock('../../api/esplora/esploraAPiProvider');
vi.mock('../../api/runes/provider');

describe('parseSummaryForRunes', () => {
  const context = {
    changeAddress: 'paymentAddress',
    paymentAddress: {
      address: 'paymentAddress',
      addInput: vi.fn(),
    },
    ordinalsAddress: {
      address: 'ordinalsAddress',
      addInput: vi.fn(),
    },
    addOutputAddress: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(getRunesClient).mockReturnValue({
      getRuneInfo: async (nameOrId: string | bigint) => {
        if (nameOrId === 'DUMMYRUNE' || nameOrId === '1:1')
          return {
            entry: {
              block: BigNumber(0),
              burned: BigNumber(0),
              divisibility: BigNumber(0),
              etching: 'txid0',
              mints: BigNumber(1),
              number: BigNumber(0),
              premine: BigNumber(0),
              spaced_rune: 'DUMMYRUNE',
              symbol: 'A',
              terms: {
                amount: BigNumber(10000),
                cap: BigNumber(10),
                height: [null, BigNumber(900000)],
                offset: [null, null],
              },
            },
            id: '1:1',
            mintable: true,
            parent: 'AINSCRIPTIONID',
          };
        if (nameOrId === 'DUMMYRUNE2' || nameOrId === '2:2')
          return {
            entry: {
              block: BigNumber(1),
              burned: BigNumber(10),
              divisibility: BigNumber(1),
              etching: 'txid1',
              mints: BigNumber(0),
              number: BigNumber(1),
              premine: BigNumber(10000),
              spaced_rune: 'DUMMYRUNE2',
              symbol: 'B',
              terms: {
                amount: null,
                cap: null,
                height: [null, null],
                offset: [null, null],
              },
            },
            id: '2:2',
            mintable: false,
            parent: null,
          };
        if (nameOrId === 'DUMMYRUNE3' || nameOrId === '3:3')
          return {
            entry: {
              block: BigNumber(2),
              burned: BigNumber(20),
              divisibility: BigNumber(38),
              etching: 'txid2',
              mints: BigNumber(20),
              number: BigNumber(2),
              premine: BigNumber(20000),
              spaced_rune: 'DUMMYRUNE3',
              symbol: 'C',
              terms: {
                amount: BigNumber(1000),
                cap: BigNumber(10),
                height: [null, BigNumber(1000)],
                offset: [null, null],
              },
            },
            id: '3:3',
            mintable: true,
            parent: null,
          };
        if (nameOrId === 'DUMMYRUNE4' || nameOrId === '4:4')
          return {
            entry: {
              block: BigNumber(2),
              burned: BigNumber(20),
              divisibility: BigNumber(0),
              etching: 'txid4',
              mints: BigNumber(20),
              number: BigNumber(2),
              premine: BigNumber(20000),
              spaced_rune: 'DUMMYRUNE4',
              symbol: 'D',
              terms: {
                amount: BigNumber(10000),
                cap: BigNumber(10),
                height: [null, BigNumber(1000)],
                offset: [null, null],
              },
            },
            id: '4:4',
            mintable: false,
            parent: 'DINSCRIPTIONID',
          };
      },
    } as any);
  });

  it('returns empty summary if no runes on inputs or rune script', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            hasRunes: () => false,
            getRuneBalances: () => {},
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: false,
      mint: undefined,
      transfers: [],
      receipts: [],
      burns: [],
    });
  });

  it('returns empty summary if no runes on inputs but rune script exists', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            hasRunes: () => false,
            getRuneBalances: () => {},
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(1),
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(102),
              output: BigNumber(2),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: false,
      mint: undefined,
      transfers: [],
      receipts: [],
      burns: [],
    });
  });

  it('returns empty, non-mintable mint if claim of unknown ID', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            hasRunes: () => false,
            getRuneBalances: () => {},
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(1),
          mint: '5:5',
          edicts: [],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: false,
      mint: {
        amount: 0n,
        divisibility: 0,
        symbol: '',
        inscriptionId: '',
        runeIsMintable: false,
        runeIsOpen: false,
        runeName: '',
      },
      transfers: [],
      receipts: [],
      burns: [],
    });
  });

  it('sends funds to first non-op_return output when no rune script present', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(100),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          script: ['RETURN', 'BOB'],
          scriptHex: '6a4c4d52554e450',
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 100n,
          divisibility: 0,
          runeName: 'DUMMYRUNE',
          sourceAddress: 'ordinalsAddress',
          destinationAddresses: ['recipient1'],
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
          hasSufficientBalance: true,
        },
      ],
      receipts: [],
      burns: [],
    });
  });

  it('parses burns when rune script marks as burnt', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(100),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Cenotaph: {
          flaws: 1,
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [],
      receipts: [],
      burns: [
        {
          amount: 100n,
          divisibility: 0,
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
          runeName: 'DUMMYRUNE',
          sourceAddresses: ['ordinalsAddress'],
        },
      ],
    });
  });

  it('parses burn when output on edict is the op_return output', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(100),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(1),
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(101),
              output: BigNumber(0),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [],
      receipts: [],
      mint: undefined,
      burns: [
        {
          amount: 100n,
          divisibility: 0,
          inscriptionId: 'AINSCRIPTIONID',
          symbol: 'A',
          runeName: 'DUMMYRUNE',
          sourceAddresses: ['ordinalsAddress'],
        },
      ],
    });
  });

  it('parses send to self correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(100),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(1),
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(50),
              output: BigNumber(1),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [],
      receipts: [],
      mint: undefined,
      burns: [],
    });
  });

  it('parses send to payments address correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(100),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'paymentAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(2),
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(50),
              output: BigNumber(1),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          sourceAddress: 'ordinalsAddress',
          destinationAddresses: ['paymentAddress'],
          runeName: 'DUMMYRUNE',
          amount: 50n,
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
          divisibility: 0,
          hasSufficientBalance: true,
        },
      ],
      receipts: [
        {
          amount: 50n,
          destinationAddress: 'paymentAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
          divisibility: 0,
          runeName: 'DUMMYRUNE',
          sourceAddresses: ['ordinalsAddress'],
        },
      ],
      mint: undefined,
      burns: [],
    });
  });

  it('parses recover from payments correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'paymentAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(100),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(50),
              output: BigNumber(1),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          sourceAddress: 'paymentAddress',
          destinationAddresses: ['ordinalsAddress'],
          runeName: 'DUMMYRUNE',
          amount: 100n,
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
          divisibility: 0,
          hasSufficientBalance: true,
        },
      ],
      receipts: [
        {
          amount: 100n,
          destinationAddress: 'ordinalsAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
          divisibility: 0,
          runeName: 'DUMMYRUNE',
          sourceAddresses: ['paymentAddress'],
        },
      ],
      mint: undefined,
      burns: [],
    });
  });

  it('parses send to multiple recipients correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(1000),
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE2: BigNumber(1000),
              DUMMYRUNE3: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'recipient2',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(3),
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(500),
              output: BigNumber(1),
            },
            {
              id: '1:1',
              amount: BigNumber(500),
              output: BigNumber(2),
            },
            {
              id: '2:2',
              amount: BigNumber(1500),
              output: BigNumber(2),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 1000n,
          destinationAddresses: ['recipient1', 'recipient2'],
          divisibility: 0,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE',
          sourceAddress: 'ordinalsAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
        {
          amount: 1500n,
          destinationAddresses: ['recipient2'],
          divisibility: 1,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE2',
          sourceAddress: 'ordinalsAddress',
          symbol: 'B',
          inscriptionId: '',
        },
      ],
      receipts: [],
      mint: undefined,
      burns: [],
    });
  });

  it('parses send to and from multiple recipients and self correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(1000),
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
        {
          extendedUtxo: {
            address: 'sender1',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE3: BigNumber(100),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'recipient2',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'changeAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(4),
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(500),
              output: BigNumber(1),
            },
            {
              id: '1:1',
              amount: BigNumber(500),
              output: BigNumber(2),
            },
            {
              id: '2:2',
              amount: BigNumber(1500),
              output: BigNumber(2),
            },
            {
              id: '3:3',
              amount: BigNumber(100),
              output: BigNumber(3),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 1000n,
          destinationAddresses: ['recipient1', 'recipient2'],
          divisibility: 0,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE',
          sourceAddress: 'ordinalsAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
        {
          amount: 2000n,
          destinationAddresses: ['recipient2', 'changeAddress'],
          divisibility: 1,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE2',
          sourceAddress: 'ordinalsAddress',
          symbol: 'B',
          inscriptionId: '',
        },
      ],
      receipts: [
        {
          amount: 100n,
          destinationAddress: 'ordinalsAddress',
          divisibility: 38,
          runeName: 'DUMMYRUNE3',
          sourceAddresses: ['sender1'],
          symbol: 'C',
          inscriptionId: '',
        },
      ],
      mint: undefined,
      burns: [],
    });
  });

  it('parses swaps correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(1000),
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
        {
          extendedUtxo: {
            address: 'otherAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE3: BigNumber(100),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'otherAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(3),
          edicts: [
            {
              id: '2:2',
              amount: BigNumber(1500),
              output: BigNumber(2),
            },
            {
              id: '3:3',
              amount: BigNumber(100),
              output: BigNumber(1),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 1500n,
          destinationAddresses: ['otherAddress'],
          divisibility: 1,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE2',
          sourceAddress: 'ordinalsAddress',
          symbol: 'B',
          inscriptionId: '',
        },
      ],
      receipts: [
        {
          amount: 100n,
          destinationAddress: 'ordinalsAddress',
          divisibility: 38,
          runeName: 'DUMMYRUNE3',
          sourceAddresses: ['otherAddress'],
          symbol: 'C',
          inscriptionId: '',
        },
      ],
      mint: undefined,
      burns: [],
    });
  });

  it('parses mint  correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          mint: '1:1',
          edicts: [],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [],
      receipts: [
        {
          amount: 10000n,
          destinationAddress: 'ordinalsAddress',
          divisibility: 0,
          runeName: 'DUMMYRUNE',
          sourceAddresses: [],
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
      ],
      mint: {
        amount: 10000n,
        divisibility: 0,
        runeIsMintable: true,
        runeIsOpen: true,
        runeName: 'DUMMYRUNE',
        symbol: 'A',
        inscriptionId: 'AINSCRIPTIONID',
      },
      burns: [],
    });
  });

  it('parses mint and send correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          mint: '1:1',
          pointer: BigNumber(2),
          edicts: [
            {
              id: '2:2',
              amount: BigNumber(500),
              output: BigNumber(1),
            },
            {
              id: '1:1',
              amount: BigNumber(1000),
              output: BigNumber(1),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 500n,
          destinationAddresses: ['recipient1'],
          divisibility: 1,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE2',
          sourceAddress: 'ordinalsAddress',
          symbol: 'B',
          inscriptionId: '',
        },
      ],
      receipts: [
        {
          amount: 9000n,
          destinationAddress: 'ordinalsAddress',
          divisibility: 0,
          runeName: 'DUMMYRUNE',
          sourceAddresses: [],
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
      ],
      mint: {
        amount: 10000n,
        divisibility: 0,
        runeIsMintable: true,
        runeIsOpen: true,
        runeName: 'DUMMYRUNE',
        symbol: 'A',
        inscriptionId: 'AINSCRIPTIONID',
      },
      burns: [],
    });
  });

  it('parses non-mintable correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          mint: '4:4',
          edicts: [],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [],
      receipts: [],
      mint: {
        amount: 10000n,
        divisibility: 0,
        runeIsMintable: false,
        runeIsOpen: true,
        runeName: 'DUMMYRUNE4',
        symbol: 'D',
        inscriptionId: 'DINSCRIPTIONID',
      },
      burns: [],
    });
  });

  it('parses send more than max balance correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(1500),
              output: BigNumber(1),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 1000n,
          destinationAddresses: ['recipient1'],
          divisibility: 0,
          hasSufficientBalance: false,
          runeName: 'DUMMYRUNE',
          sourceAddress: 'ordinalsAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
      ],
      receipts: [],
      mint: undefined,
      burns: [],
    });
  });

  it('parses receive more than max balance correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'senderAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(1500),
              output: BigNumber(1),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: false,
      transfers: [],
      receipts: [
        {
          amount: 1000n,
          destinationAddress: 'ordinalsAddress',
          divisibility: 0,
          runeName: 'DUMMYRUNE',
          sourceAddresses: ['senderAddress'],
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
      ],
      mint: undefined,
      burns: [],
    });
  });

  it('parses send with zero amount correctly - send max', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(10000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(0),
              output: BigNumber(1),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 10000n,
          destinationAddresses: ['recipient1'],
          divisibility: 0,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE',
          sourceAddress: 'ordinalsAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
      ],
      receipts: [],
      mint: undefined,
      burns: [],
    });
  });

  it('parses send to output length correctly - evenly distribute full amount to non-script outputs', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(10003),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'recipient2',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'recipient3',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(0),
              output: BigNumber(5),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 7503n,
          destinationAddresses: ['recipient1', 'recipient2', 'recipient3'],
          divisibility: 0,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE',
          sourceAddress: 'ordinalsAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
      ],
      receipts: [],
      mint: undefined,
      burns: [],
    });
  });

  it('parses send to output length correctly - distribute specific amount to non-script outputs', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(10003),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'recipient2',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'recipient3',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(4),
          edicts: [
            {
              id: '1:1',
              amount: BigNumber(100),
              output: BigNumber(5),
            },
          ],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 300n,
          destinationAddresses: ['recipient1', 'recipient2', 'recipient3'],
          divisibility: 0,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE',
          sourceAddress: 'ordinalsAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
      ],
      receipts: [],
      mint: undefined,
      burns: [],
    });
  });

  it('parses change output correctly when set correctly', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(1000),
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE2: BigNumber(1000),
              DUMMYRUNE3: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'recipient2',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          pointer: BigNumber(2),
          edicts: [],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 1000n,
          destinationAddresses: ['recipient2'],
          divisibility: 0,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE',
          sourceAddress: 'ordinalsAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
        {
          amount: 2000n,
          destinationAddresses: ['recipient2'],
          divisibility: 1,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE2',
          sourceAddress: 'ordinalsAddress',
          symbol: 'B',
          inscriptionId: '',
        },
        {
          amount: 1000n,
          destinationAddresses: ['recipient2'],
          divisibility: 38,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE3',
          sourceAddress: 'ordinalsAddress',
          symbol: 'C',
          inscriptionId: '',
        },
      ],
      receipts: [],
      mint: undefined,
      burns: [],
    });
  });

  it('parses change to first non op return output if change output not set', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(1000),
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE2: BigNumber(1000),
              DUMMYRUNE3: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
        {
          type: 'address',
          address: 'recipient1',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'recipient2',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
        {
          type: 'address',
          address: 'ordinalsAddress',
          amount: 100,
          inscriptions: [],
          satributes: [],
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          edicts: [],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [
        {
          amount: 1000n,
          destinationAddresses: ['recipient1'],
          divisibility: 0,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE',
          sourceAddress: 'ordinalsAddress',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
        },
        {
          amount: 2000n,
          destinationAddresses: ['recipient1'],
          divisibility: 1,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE2',
          sourceAddress: 'ordinalsAddress',
          symbol: 'B',
          inscriptionId: '',
        },
        {
          amount: 1000n,
          destinationAddresses: ['recipient1'],
          divisibility: 38,
          hasSufficientBalance: true,
          runeName: 'DUMMYRUNE3',
          sourceAddress: 'ordinalsAddress',
          symbol: 'C',
          inscriptionId: '',
        },
      ],
      receipts: [],
      mint: undefined,
      burns: [],
    });
  });

  it('parses change as burn if only op_return output exists', async () => {
    const summary: PsbtSummary = {
      inputs: [
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE: BigNumber(1000),
              DUMMYRUNE2: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
        {
          extendedUtxo: {
            address: 'ordinalsAddress',
            hasRunes: () => true,
            getRuneBalances: () => ({
              DUMMYRUNE2: BigNumber(1000),
              DUMMYRUNE3: BigNumber(1000),
            }),
          } as any,
          inscriptions: [],
          satributes: [],
        },
      ],
      outputs: [
        {
          type: 'script',
          scriptHex: '6a4c4d52554e450',
          script: ['RETURN', '4c4d52554e450'],
          amount: 0,
        },
      ],
      hasSigHashNone: false,
      runeOp: {
        Runestone: {
          edicts: [],
        },
      },
    };

    const runes = await parseSummaryForRunes(context, summary, 'Mainnet');
    expect(runes).toEqual({
      inputsHadRunes: true,
      transfers: [],
      receipts: [],
      mint: undefined,
      burns: [
        {
          amount: 1000n,
          divisibility: 0,
          runeName: 'DUMMYRUNE',
          symbol: 'A',
          inscriptionId: 'AINSCRIPTIONID',
          sourceAddresses: ['ordinalsAddress'],
        },
        {
          amount: 2000n,
          divisibility: 1,
          runeName: 'DUMMYRUNE2',
          symbol: 'B',
          inscriptionId: '',
          sourceAddresses: ['ordinalsAddress'],
        },
        {
          amount: 1000n,
          divisibility: 38,
          runeName: 'DUMMYRUNE3',
          symbol: 'C',
          inscriptionId: '',
          sourceAddresses: ['ordinalsAddress'],
        },
      ],
    });
  });
});
