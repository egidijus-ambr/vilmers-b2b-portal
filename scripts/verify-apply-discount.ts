import { applyDiscount } from "../src/configurator/lib/price-utils"

const cases: Array<[number, number | null | undefined, { discounted: number; hasDiscount: boolean }]> = [
  [100, null, { discounted: 100, hasDiscount: false }],
  [100, 0, { discounted: 100, hasDiscount: false }],
  [100, 15, { discounted: 85, hasDiscount: true }],
  [1234.56, 12, { discounted: 1086.41, hasDiscount: true }],
  [100, 100, { discounted: 0, hasDiscount: true }],
  [100, -5, { discounted: 100, hasDiscount: false }],
  [100, 150, { discounted: 0, hasDiscount: true }],
]

let failed = 0
for (const [regular, pct, expected] of cases) {
  const actual = applyDiscount(regular, pct)
  const ok =
    Math.abs(actual.discounted - expected.discounted) < 0.005 &&
    actual.hasDiscount === expected.hasDiscount
  console.log(
    `${ok ? "PASS" : "FAIL"}  applyDiscount(${regular}, ${pct}) => ${JSON.stringify(actual)}`
  )
  if (!ok) failed++
}
process.exit(failed === 0 ? 0 : 1)
