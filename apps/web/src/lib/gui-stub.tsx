/**
 * Minimal @hanzo/gui v7 web primitives stub.
 *
 * The published @hanzo/gui@7.0.0 npm tarball ships without dist/; its
 * `package.json:exports` point at `./dist/esm/index.mjs` which doesn't
 * exist on disk. Until the upstream republishes a fixed v7, we ship
 * these no-frills primitives so the wallet web build resolves.
 *
 * The API mirrors what the screen Blues consumed from @hanzo/gui — flex
 * stacks (YStack vertical, XStack horizontal), Button, Text, Input, Card.
 * Tokenized props (`gap="$3"`, `p="$5"`, `col="$neutral2"`) map to CSS
 * variables set by `loadBrandConfig()` on `:root`. Anything tokenized that
 * isn't a CSS var yet falls through to the literal string and the browser
 * ignores it — no crashes.
 */
import * as React from "react"

type CSSish = React.CSSProperties & { [k: string]: any }

function tokenize(v: any): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v === "number") return `${v}px`
  if (typeof v === "string" && v.startsWith("$")) return `var(--${v.slice(1)})`
  return String(v)
}

function pickStyle(props: Record<string, any>): { style: CSSish; rest: Record<string, any> } {
  const style: CSSish = {}
  const rest: Record<string, any> = {}
  for (const [k, v] of Object.entries(props)) {
    switch (k) {
      case "p": style.padding = tokenize(v); break
      case "px": style.paddingLeft = style.paddingRight = tokenize(v); break
      case "py": style.paddingTop = style.paddingBottom = tokenize(v); break
      case "m": style.margin = tokenize(v); break
      case "mx": style.marginLeft = style.marginRight = tokenize(v); break
      case "my": style.marginTop = style.marginBottom = tokenize(v); break
      case "gap": style.gap = tokenize(v); break
      case "ai": style.alignItems = v; break
      case "jc": style.justifyContent = v; break
      case "flex": style.flex = v; break
      case "maxWidth": style.maxWidth = tokenize(v); break
      case "minWidth": style.minWidth = tokenize(v); break
      case "width": style.width = tokenize(v); break
      case "height": style.height = tokenize(v); break
      case "bg": style.background = tokenize(v); break
      case "col": style.color = tokenize(v); break
      case "fontSize": style.fontSize = tokenize(v); break
      case "fontWeight": style.fontWeight = v; break
      case "br": style.borderRadius = tokenize(v); break
      case "bw": style.borderWidth = tokenize(v); break
      case "bc": style.borderColor = tokenize(v); break
      case "style": Object.assign(style, v as CSSish); break
      default: rest[k] = v
    }
  }
  return { style, rest }
}

function makeStack(direction: "row" | "column"): React.FC<any> {
  return function Stack({ children, ...props }: any) {
    const { style, rest } = pickStyle(props)
    return (
      <div
        {...rest}
        style={{
          display: "flex",
          flexDirection: direction,
          ...style,
        }}
      >
        {children}
      </div>
    )
  }
}

export const Stack = makeStack("column")
export const YStack = makeStack("column")
export const XStack = makeStack("row")

export const Card: React.FC<any> = ({ children, ...props }) => {
  const { style, rest } = pickStyle(props)
  return (
    <div
      {...rest}
      style={{
        background: "var(--surface2, #f5f5f5)",
        borderRadius: "var(--radius-card, 12px)",
        padding: "var(--card-padding, 16px)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export const Text: React.FC<any> = ({ children, ...props }) => {
  const { style, rest } = pickStyle(props)
  return <span {...rest} style={style}>{children}</span>
}

export const Button: React.FC<any> = ({ children, onPress, onClick, ...props }) => {
  const { style, rest } = pickStyle(props)
  return (
    <button
      type="button"
      onClick={onPress ?? onClick}
      {...rest}
      style={{
        background: "var(--accent1, #000)",
        color: "var(--neutralContrast, #fff)",
        padding: "8px 16px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        fontSize: "14px",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export const Input: React.FC<any> = ({ ...props }) => {
  const { style, rest } = pickStyle(props)
  return (
    <input
      {...rest}
      style={{
        background: "var(--surface3, #ebebeb)",
        color: "var(--neutral1, #000)",
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid var(--surface3, #ebebeb)",
        fontSize: "14px",
        ...style,
      }}
    />
  )
}

export const TouchableArea = Button
export const Spacer: React.FC<{ size?: any }> = ({ size = 8 }) => (
  <div style={{ height: tokenize(size), width: tokenize(size) }} />
)
export const Separator: React.FC<any> = (props) => {
  const { style, rest } = pickStyle(props)
  return (
    <hr
      {...rest}
      style={{ border: 0, borderTop: "1px solid var(--surface3, #ebebeb)", margin: 0, ...style }}
    />
  )
}

export interface HanzoguiConfig {
  brand?: any
  [k: string]: any
}

export const HanzoguiProvider: React.FC<{ config?: HanzoguiConfig; children?: React.ReactNode }> = ({
  children,
}) => <>{children}</>
