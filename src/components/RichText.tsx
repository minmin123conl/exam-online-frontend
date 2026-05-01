import React from "react";
import { API_BASE } from "../api";

/**
 * Renders question/option text that may include inline markers:
 *   [IMG:<url>]     -> <img src=...>
 *   [MATH:<text>]   -> <span class="formula">...</span>
 *   [TABLE:<b64>]   -> <table>... (base64-encoded JSON: List<List<string>>)
 *
 * URLs starting with "/uploads/" are resolved relative to the API base.
 */

function decodeTable(b64: string): string[][] | null {
  try {
    // atob handles ASCII; payload is utf-8 → decode via Uint8Array.
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder("utf-8").decode(bytes);
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.every((r) => Array.isArray(r))) {
      return parsed as string[][];
    }
    return null;
  } catch {
    return null;
  }
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const re = /\[(IMG|MATH):([^\]]+)\]/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] === "IMG") {
      const url = m[2].startsWith("http") ? m[2] : m[2].startsWith("/") ? `${API_BASE}${m[2]}` : m[2];
      nodes.push(
        <img key={`${keyPrefix}-img-${key++}`} src={url} alt="" className="rt-img" loading="lazy" />,
      );
    } else if (m[1] === "MATH") {
      nodes.push(
        <span key={`${keyPrefix}-math-${key++}`} className="rt-formula" title="Công thức (OMML)">
          {m[2]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  // Split on [TABLE:...] markers first; tables are block-level.
  const tableRe = /\[TABLE:([A-Za-z0-9+/=]+)\]/g;
  const blocks: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let blockKey = 0;
  while ((m = tableRe.exec(text)) !== null) {
    if (m.index > last) {
      blocks.push(
        <span key={`text-${blockKey++}`}>{renderInline(text.slice(last, m.index), `t${blockKey}`)}</span>,
      );
    }
    const rows = decodeTable(m[1]);
    if (rows && rows.length > 0) {
      blocks.push(
        <table key={`tbl-${blockKey++}`} className="rt-table">
          <tbody>
            {rows.map((row, i) => (
              <tr key={`r${i}`}>
                {row.map((cell, j) => (
                  <td key={`c${j}`}>{renderInline(cell, `t${blockKey}-${i}-${j}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
    } else {
      // Fallback: render the marker literally if decoding failed.
      blocks.push(<span key={`bad-${blockKey++}`}>{m[0]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    blocks.push(<span key={`tail-${blockKey++}`}>{renderInline(text.slice(last), `tail${blockKey}`)}</span>);
  }
  return <span className={className}>{blocks}</span>;
}
