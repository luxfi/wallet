/**
 * FeePreview — gas / fee estimate per chain.
 *
 *   EVM   → wagmi `useEstimateGas` × `useGasPrice`
 *   Lux P → flat fee from chain config (no gas market on P-Chain)
 *   Lux X → flat fee from chain config
 *   Sol   → static lamport fee (5000); UX upgrades to priority fee later
 *
 * Presentational only — asks the relevant hook for an estimate. If the
 * hook is loading we show "Estimating…"; if it errored we surface the
 * message inline so the user knows why submission is blocked.
 */
import { useEstimateGas, useGasPrice } from "wagmi"
import { CHAINS, formatUnits, parseUnits, type Asset } from "../../lib/asset"

export interface FeePreviewProps {
  asset: Asset
  to: string
  amount: string
}

const LUX_FLAT_FEE_NLUX = 1_000_000n // 0.001 LUX in 9-dec native units (placeholder per chain config)
const SOL_FLAT_FEE_LAMPORTS = 5000n  // 0.000005 SOL

export default function FeePreview({ asset, to, amount }: FeePreviewProps) {
  const chain = CHAINS[asset.chainId]
  if (!chain) return null

  if (chain.kind === "evm") {
    return <EvmFee asset={asset} to={to} amount={amount} />
  }

  if (chain.kind === "solana") {
    return (
      <FeeRow
        loading={false}
        symbol={chain.nativeSymbol}
        amount={formatUnits(SOL_FLAT_FEE_LAMPORTS.toString(), 9)}
      />
    )
  }

  // Lux P/X — flat platform fee.
  return (
    <FeeRow
      loading={false}
      symbol={chain.nativeSymbol}
      amount={formatUnits(LUX_FLAT_FEE_NLUX.toString(), 9)}
    />
  )
}

function EvmFee({
  asset,
  to,
  amount,
}: {
  asset: Asset
  to: string
  amount: string
}) {
  const chain = CHAINS[asset.chainId]
  const isHexAddr = /^0x[0-9a-fA-F]{40}$/.test(to)
  let value: bigint | undefined
  try {
    value = amount ? parseUnits(amount, asset.decimals) : 0n
  } catch {
    value = undefined
  }
  const enabled = isHexAddr && value !== undefined

  const gas = useEstimateGas({
    to: enabled ? (to as `0x${string}`) : undefined,
    value,
    chainId: chain?.evmChainId,
    query: { enabled },
  })
  const price = useGasPrice({
    chainId: chain?.evmChainId,
    query: { enabled },
  })

  if (!enabled) {
    return <FeeRow loading={false} symbol={chain!.nativeSymbol} amount="—" />
  }
  if (gas.isLoading || price.isLoading) {
    return <FeeRow loading symbol={chain!.nativeSymbol} amount="" />
  }
  if (gas.error || price.error) {
    return (
      <p
        style={{
          color: "var(--red10, #c44)",
          fontSize: "0.75rem",
          margin: 0,
        }}
      >
        Fee estimate failed:{" "}
        {(gas.error ?? price.error)?.message ?? "unknown"}
      </p>
    )
  }
  if (gas.data === undefined || price.data === undefined) {
    return <FeeRow loading={false} symbol={chain!.nativeSymbol} amount="—" />
  }

  const feeWei = gas.data * price.data
  return (
    <FeeRow
      loading={false}
      symbol={chain!.nativeSymbol}
      amount={formatUnits(feeWei.toString(), 18)}
    />
  )
}

function FeeRow({
  loading,
  symbol,
  amount,
}: {
  loading: boolean
  symbol: string
  amount: string
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ color: "var(--color10, #888)" }}>Network fee</span>
      <span
        style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
      >
        {loading ? "Estimating…" : `${amount} ${symbol}`}
      </span>
    </div>
  )
}
