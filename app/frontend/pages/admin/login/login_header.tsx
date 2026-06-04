import BrandMark from "@/components/brand_mark";

export default function LoginHeader() {
  return (
    <div className="mb-8 text-center">
      <BrandMark className="mb-2" />
      <h1 className="text-xl font-semibold text-mc-text">Sign in to admin</h1>
      <p className="mt-1 text-sm text-mc-text-dim">Milkcrate store operations dashboard</p>
    </div>
  );
}
