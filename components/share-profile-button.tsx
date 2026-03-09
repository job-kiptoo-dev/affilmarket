"use client";

export function ShareProfileButton({ token }: { token: string }) {
  const handleClick = async () => {
    const url = `${window.location.origin}?aff=${token}`;
    await navigator.clipboard.writeText(url);
    alert("Affiliate link copied!");
  };

  return (
    <button
      onClick={handleClick}
      className="bg-white/20 hover:bg-white/30 transition-colors px-4 py-1.5 rounded-lg text-sm font-medium"
    >
      Share Profile
    </button>
  );
}
