"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CheckoutStatusHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      alert("Payment successful! Your plan is now active.");
      router.replace("/pricing");
    } else if (checkout === "cancelled") {
      alert("Checkout cancelled.");
      router.replace("/pricing");
    }
  }, [searchParams, router]);

  return null;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [checkingOutPlanId, setCheckingOutPlanId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // For Phase 1, we fetch plans from our mocked cloud backend API
    // If the API isn't running, we fallback to some static data for the UI
    fetch("http://localhost:4000/api/billing/plans")
      .then(res => res.json())
      .then(data => setPlans(data.length > 0 ? data : getFallbackPlans()))
      .catch(() => setPlans(getFallbackPlans()));
  }, []);

  const getFallbackPlans = () => [
    { id: "1", name: "Technical Day", domain: "TECHNICAL", durationHours: 24, price: "299", currency: "INR" },
    { id: "2", name: "Technical Monthly", domain: "TECHNICAL", durationHours: null, price: "1999", currency: "INR" },
  ];

  const handleCheckout = async (planId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first!");
      router.push("/login");
      return;
    }

    setCheckingOutPlanId(planId);
    try {
      const res = await fetch(`http://localhost:4000/api/billing/checkout/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ planId }),
      });

      if (res.status === 401) {
        alert("Your session expired. Please log in again.");
        router.push("/login");
        return;
      }
      if (res.status === 503) {
        alert("Payments aren't configured on the server yet.");
        return;
      }

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Checkout failed");
      }
    } catch (e) {
      alert("Network error during checkout");
    } finally {
      setCheckingOutPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-24 text-white">
      <Suspense fallback={null}>
        <CheckoutStatusHandler />
      </Suspense>
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">Simple, transparent pricing</h1>
        <p className="mb-16 text-lg text-zinc-400">One plan. Covers both technical and coding interviews.</p>

        <div className="grid gap-8 md:grid-cols-2 max-w-2xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-col items-start rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-left shadow-2xl backdrop-blur-sm transition hover:border-zinc-700">
              <span className="mb-2 inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                Technical & Coding
              </span>
              <h3 className="mb-2 text-2xl font-bold">{plan.name}</h3>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold">₹{plan.price}</span>
                <span className="text-zinc-500">/{plan.durationHours ? "24h" : "mo"}</span>
              </div>

              <ul className="mb-8 flex flex-col gap-4 text-zinc-300">
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Live Interview Assistant
                </li>
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Technical & coding interview formats
                </li>
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Real-time Transcripts
                </li>
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  AI Feedback & Summary
                </li>
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={checkingOutPlanId === plan.id}
                className="mt-auto w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {checkingOutPlanId === plan.id ? "Redirecting…" : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
