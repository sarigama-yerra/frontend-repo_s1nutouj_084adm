import { useMemo, useState } from 'react'

function normalizeNumber(raw, defaultCountryCode) {
  // Remove spaces, dashes, parentheses
  let s = String(raw).trim()
  if (!s) return ''
  // Convert Bengali numerals to Latin if present
  const bnMap = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  }
  s = s.replace(/[০-৯]/g, ch => bnMap[ch] || ch)
  // Keep + and digits only
  s = s.replace(/[^+\d]/g, '')

  if (!s) return ''

  if (s.startsWith('00')) {
    s = '+' + s.slice(2)
  }
  if (s.startsWith('+')) {
    // Already in international format; also strip extra + if any
    s = '+' + s.replace(/\+/g, '').replace(/^(\d+)/, '$1')
  } else {
    // Local format → prepend default country code
    const cc = defaultCountryCode.startsWith('+') ? defaultCountryCode : '+' + defaultCountryCode
    // Remove leading zeros in local numbers
    const local = s.replace(/^0+/, '')
    s = cc + local
  }
  // Basic sanity: must be + then 8-15 digits
  if (!/^\+\d{8,15}$/.test(s)) return ''
  return s
}

function digitsOnly(e164) {
  // For wa.me we need digits only (no plus)
  return e164.replace(/\D/g, '')
}

function buildCustomLink(template, e164) {
  if (!template) return ''
  const d = digitsOnly(e164)
  return template
    .replaceAll('{number}', e164)
    .replaceAll('{digits}', d)
}

function App() {
  const [input, setInput] = useState('')
  const [countryCode, setCountryCode] = useState('+880')
  const [customTemplate, setCustomTemplate] = useState('')
  const [message, setMessage] = useState('')

  const rows = useMemo(() => {
    const parts = input
      .split(/\n|,|\t|;|\s+/)
      .map(x => x.trim())
      .filter(Boolean)
    const normalized = parts
      .map(p => normalizeNumber(p, countryCode))
      .filter(Boolean)
    // Deduplicate preserving order
    const seen = new Set()
    const uniq = []
    for (const n of normalized) {
      if (!seen.has(n)) { seen.add(n); uniq.push(n) }
    }
    return uniq.map(n => ({
      e164: n,
      digits: digitsOnly(n),
      tel: `tel:${n}`,
      sms: `sms:${n}${message ? `?body=${encodeURIComponent(message)}` : ''}`,
      wa: `https://wa.me/${digitsOnly(n)}${message ? `?text=${encodeURIComponent(message)}` : ''}`,
      custom: buildCustomLink(customTemplate, n),
    }))
  }, [input, countryCode, customTemplate, message])

  const exportCSV = () => {
    const header = ['number_e164', 'digits', 'tel', 'sms', 'whatsapp', 'custom_link']
    const lines = [header.join(',')]
    rows.forEach(r => {
      const row = [r.e164, r.digits, r.tel, r.sms, r.wa, r.custom]
        .map(v => '"' + String(v || '').replace(/"/g, '""') + '"')
        .join(',')
      lines.push(row)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'numbers.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyAll = async () => {
    const text = rows.map(r => r.e164).join('\n')
    try { await navigator.clipboard.writeText(text) } catch (_) {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Bulk Number Formatter & Link Builder</h1>
          <p className="text-gray-600 mt-2">Paste many phone numbers, clean them, remove duplicates, and get quick action links.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl shadow p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Numbers (any separator)</label>
            <textarea
              className="w-full h-48 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 017XXXXXXXX, +8801XXXXXXXXX, 01XXXXXXXXX\nUse commas or new lines"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={() => setInput('')} className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200">Clear</button>
              <button onClick={copyAll} className="px-3 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">Copy All Formatted</button>
              <button onClick={exportCSV} className="px-3 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700">Export CSV</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Country Code</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                placeholder="+880"
              />
              <p className="text-xs text-gray-500 mt-1">Used when a number doesn't start with + or 00.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quick message (optional)</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Message for SMS/WhatsApp links"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Custom link template (optional)</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={customTemplate}
                onChange={e => setCustomTemplate(e.target.value)}
                placeholder="Example: https://example.com/contact?to={number}"
              />
              <p className="text-xs text-gray-500 mt-1">Use {`{number}`} for E.164 (+8801...) and {`{digits}`} for digits only.</p>
              <p className="text-xs text-amber-600 mt-1">Use responsibly. Do not use to probe, scrape or violate any platform policies.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-800">Results</span>
              <span className="ml-2 text-sm text-gray-500">{rows.length} unique</span>
            </div>
            <div className="text-xs text-gray-500">Click an action to open</div>
          </div>

          <div className="max-h-[50vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-5 py-2 font-medium text-gray-600">#</th>
                  <th className="text-left px-5 py-2 font-medium text-gray-600">Number</th>
                  <th className="text-left px-5 py-2 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.e164} className="border-t">
                    <td className="px-5 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-5 py-2 font-mono">{r.e164}</td>
                    <td className="px-5 py-2">
                      <div className="flex flex-wrap gap-2">
                        <a className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700" href={r.tel}>Call</a>
                        <a className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700" href={r.sms}>SMS</a>
                        <a className="px-2 py-1 rounded bg-green-50 hover:bg-green-100 text-green-700" href={r.wa} target="_blank" rel="noreferrer">WhatsApp</a>
                        {r.custom && (
                          <a className="px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700" href={r.custom} target="_blank" rel="noreferrer">Custom</a>
                        )}
                        <button
                          onClick={async () => { try { await navigator.clipboard.writeText(r.e164) } catch (_) {} }}
                          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                        >Copy</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-gray-400">No numbers yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          Built for organizing contacts. Please respect privacy and obtain consent before messaging.
        </div>
      </div>
    </div>
  )
}

export default App
