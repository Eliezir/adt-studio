import { Trans } from "@lingui/react/macro"

export function TestBanner() {
  return (
    <div className="bg-yellow-100 p-4 rounded">
      <h2><Trans>Welcome to ADT Studio</Trans></h2>
      <p><Trans>This is a test banner for CI validation</Trans></p>
    </div>
  )
}
