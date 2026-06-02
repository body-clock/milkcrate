export function TotpQrSection({ qrCode }: { qrCode: string }) {
  return (
    <div className="mb-6 flex justify-center">
      <div className="rounded-lg border border-mc-border bg-white p-4">
        <img src={qrCode} alt="QR code for authenticator app setup" className="h-48 w-48" />
      </div>
    </div>
  )
}
