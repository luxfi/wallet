/**
 * Where to send a vulnerability report. The address comes from the runtime
 * brand config, so a white-label deployment overlaying `brand.json` publishes
 * its own without touching this file.
 */
import { getBrand } from "../../lib/brand"

export default function Security() {
  const brand = getBrand().brand

  return (
    <main style={page}>
      <h1 style={title}>Reporting a security problem</h1>

      <p style={para}>
        Email{" "}
        <a href={`mailto:${brand.securityEmail}`} style={link}>
          {brand.securityEmail}
        </a>
        . Tell us what you found and how to reproduce it. Send it to us before you tell anyone else,
        and do not open a public issue.
      </p>

      <p style={para}>
        A real report from a stranger is worth more than another internal review. We read every one.
      </p>

      <h2 style={h2}>What happens next</h2>
      <p style={para}>
        Someone will read your report and reply. If we can reproduce the problem we will tell you
        what we are doing about it, and tell you again once it is fixed. If we cannot reproduce it we
        will say so and ask you for what we are missing.
      </p>

      <h2 style={h2}>While you are looking</h2>
      <p style={para}>
        Test against accounts and funds that are your own. Do not read, change, or move anything that
        belongs to someone else. If you reach it by accident, stop, and say so in your report.
      </p>
      <p style={para}>
        Do not run anything that degrades the service for other people. No load testing, no denial of
        service, no mass automated scanning, and no social engineering of our staff or our users.
      </p>

      <h2 style={h2}>For scanners</h2>
      <p style={para}>
        This page is the policy named by{" "}
        <a href="/.well-known/security.txt" style={link}>
          /.well-known/security.txt
        </a>
        , per RFC 9116.
      </p>
    </main>
  )
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: "24px 16px",
  maxWidth: 640,
  margin: "0 auto",
}
const title: React.CSSProperties = { fontSize: 28, fontWeight: 600, margin: "8px 0 16px" }
const h2: React.CSSProperties = { fontSize: 18, fontWeight: 600, margin: "28px 0 8px" }
const para: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.8)",
  margin: "0 0 12px",
}
const link: React.CSSProperties = { color: "#fff" }
