import { WalletType } from '@/js/wallets/types'
import { getTransactionsForAddresses } from '@luxfi/wallet-sdk'

import { BlockchainId, Network, SortOrder } from '@luxfi/cloud'
import { filterDuplicateCloudTxs } from '@luxfi/wallet-sdk'
import { sortCloudTxs } from '@luxfi/wallet-sdk'
import { BlockchainIds, Networks, SortOrders } from '@/utils/typeconvert'

const PAGE_SIZE = 100
const SORT = SortOrders.DESC

export async function getCloudHistory(
    wallet: WalletType,
    networkId: number,
    isMainnet: boolean,
    limit?: number
) {
    // Reverse the list so we get history for the most recent address first
    const xInternal = wallet.getAllChangeAddressesX()
    const xExternal = wallet.getAllExternalAddressesX()
    const xvmAddrs = []
    // Combine X addresses and reverse ordering so most recent is first
    while (xInternal.length || xExternal.length) {
        const internal = xInternal.pop()
        const external = xExternal.pop()
        internal && xvmAddrs.push(internal)
        external && xvmAddrs.push(external)
    }

    const pvmAddrs: string[] = wallet.getAllAddressesP().reverse()

    // this shouldn't ever happen, but to avoid getting every transaction...
    if (xvmAddrs.length === 0) {
        return []
    }

    const txsCloudX = await getTransactionsForAddresses(
        {
            addresses: xvmAddrs,
            blockchainId: BlockchainIds.X_CHAIN,
            network: isMainnet ? Networks.MAINNET : Networks.TESTNET,
            pageSize: PAGE_SIZE,
            sortOrder: SORT,
        },
        limit
    )

    const txsCloudP = await getTransactionsForAddresses(
        {
            addresses: pvmAddrs,
            blockchainId: BlockchainIds.P_CHAIN,
            network: isMainnet ? Networks.MAINNET : Networks.TESTNET,
            pageSize: PAGE_SIZE,
            sortOrder: SORT,
        },
        limit
    )

    const externalAddrs = xExternal.length > pvmAddrs.length ? xExternal.reverse() : pvmAddrs

    const txsCloudC = await getTransactionsForAddresses(
        {
            addresses: [wallet.getEvmAddressBech(), ...externalAddrs],
            blockchainId: BlockchainIds.C_CHAIN,
            network: isMainnet ? Networks.MAINNET : Networks.TESTNET,
            pageSize: PAGE_SIZE,
            sortOrder: SORT,
        },
        limit
    )

    // Join X and P chain transactions
    const joined = [...txsCloudX, ...txsCloudP, ...txsCloudC]
    // Filter duplicates
    const filtered = filterDuplicateCloudTxs(joined)
    // Sort by date
    const sorted = sortCloudTxs(filtered)

    // Trimmed
    const trimmed = sorted.slice(0, limit)

    return trimmed
}
