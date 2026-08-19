"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const [plans, setPlans] = useState<any[]>([]);
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
    { id: "1", name: "Technical Day", domain: "TECHNICAL", durationHours: 24, price: "5.00", currency: "USD" },
    { id: "2", name: "Technical Monthly", domain: "TECHNICAL", durationHours: null, price: "29.00", currency: "USD" },
    { id: "3", name: "HR Monthly", domain: "HR", durationHours: null, price: "19.00", currency: "USD" },
  ];

  const handleCheckout = async (planId: String) => {
    // Simple mock checkout flow that directly calls success
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first!");
      router.push("/login");
      return;
    }

    // decode JWT locally just to get userId (in a real app, backend handles this via Bearer token)
    let userId = "dummy_user_id";
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId;
    } catch(e) {}

    try {
      const res = await fetch(`http://localhost:4000/api/billing/checkout/success`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId }),
      });
      if (res.ok) {
        alert("Subscription successful!");
        router.push("/");
      } else {
        alert("Checkout failed");
      }
    } catch(e) {
      alert("Network error during checkout");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-24 text-white">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">Simple, transparent pricing</h1>
        <p className="mb-16 text-lg text-zinc-400">Unlock the AI Interview Assistant for the domain you need.</p>
        
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-col items-start rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-left shadow-2xl backdrop-blur-sm transition hover:border-zinc-700">
              <span className="mb-2 inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                {plan.domain}
              </span>
              <h3 className="mb-2 text-2xl font-bold">{plan.name}</h3>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold">${plan.price}</span>
                <span className="text-zinc-500">/{plan.durationHours ? "24h" : "mo"}</span>
              </div>
              
              <ul className="mb-8 flex flex-col gap-4 text-zinc-300">
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Live Interview Assistant
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
                className="mt-auto w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-500"
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
