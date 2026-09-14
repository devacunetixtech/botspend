"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Database,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatEther, parseEther, zeroAddress } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { botchainTestnet, botSpendAbi, botSpendAddress } from "@/lib/botchain";

type Agent = {
  wallet: `0x${string}`;
  name: string;
  description: string;
  registeredAt: bigint;
  isActive: boolean;
};

type Payment = {
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  note: string;
  timestamp: bigint;
};

type ServiceRequest = {
  id: bigint;
  requester: `0x${string}`;
  provider: `0x${string}`;
  description: string;
  amount: bigint;
  completed: boolean;
  createdAt: bigint;
};

const contractAddress = botSpendAddress ?? zeroAddress;

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function relativeTime(timestamp: bigint) {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - Number(timestamp));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();
  const { writeContractAsync, data: transactionHash, isPending } = useWriteContract();
  const { isSuccess: transactionConfirmed } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("0.75");
  const [serviceRequest, setServiceRequest] = useState("");
  const [serviceAmount, setServiceAmount] = useState("0.75");
  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [feedback, setFeedback] = useState("");

  const refreshQuery = {
    enabled: Boolean(botSpendAddress),
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 5000,
  };
  const { data: agentCount } = useReadContract({
    address: contractAddress,
    abi: botSpendAbi,
    functionName: "getAgentCount",
    query: refreshQuery,
  });
  const { data: paymentCount } = useReadContract({
    address: contractAddress,
    abi: botSpendAbi,
    functionName: "getPaymentCount",
    query: refreshQuery,
  });
  const { data: requestCount } = useReadContract({
    address: contractAddress,
    abi: botSpendAbi,
    functionName: "getRequestCount",
    query: refreshQuery,
  });
  const agentReads = useReadContracts({
    contracts: Array.from({ length: Number(agentCount ?? 0) }, (_, index) => ({
      address: contractAddress,
      abi: botSpendAbi,
      functionName: "getAgent" as const,
      args: [BigInt(index)] as const,
    })),
    query: {
      ...refreshQuery,
      enabled: Boolean(botSpendAddress) && agentCount !== undefined,
    },
  });
  const paymentReads = useReadContracts({
    contracts: Array.from({ length: Number(paymentCount ?? 0) }, (_, index) => ({
      address: contractAddress,
      abi: botSpendAbi,
      functionName: "getPayment" as const,
      args: [BigInt(index)] as const,
    })),
    query: {
      ...refreshQuery,
      enabled: Boolean(botSpendAddress) && paymentCount !== undefined,
    },
  });
  const requestReads = useReadContracts({
    contracts: Array.from({ length: Number(requestCount ?? 0) }, (_, index) => ({
      address: contractAddress,
      abi: botSpendAbi,
      functionName: "getRequest" as const,
      args: [BigInt(index + 1)] as const,
    })),
    query: {
      ...refreshQuery,
      enabled: Boolean(botSpendAddress) && requestCount !== undefined,
    },
  });

  const agents = (agentReads.data ?? [])
    .filter((result) => result.status === "success")
    .map((result) => result.result as Agent)
    .filter((agent) => agent.isActive);
  const payments = (paymentReads.data ?? [])
    .filter((result) => result.status === "success")
    .map((result) => result.result as Payment)
    .reverse();
  const requests = (requestReads.data ?? [])
    .filter((result) => result.status === "success")
    .map((result) => result.result as ServiceRequest)
    .reverse();
  const selectedAgent = agents[selectedAgentIndex] ?? agents[0];
  const visibleAgents = agents.filter((agent) =>
    `${agent.name} ${agent.description}`.toLowerCase().includes(search.toLowerCase()),
  );

  const refreshWorkspace = () => {
    void queryClient.invalidateQueries();
  };

  useEffect(() => {
    if (transactionConfirmed) void queryClient.invalidateQueries();
  }, [queryClient, transactionConfirmed]);

  const ensureNetwork = async () => {
    if (chainId !== botchainTestnet.id) {
      await switchChainAsync({ chainId: botchainTestnet.id });
    }
  };

  const registerProfile = async () => {
    if (!isConnected || !botSpendAddress || !profileName.trim() || !profileDescription.trim()) return;
    try {
      await ensureNetwork();
      setFeedback("Confirm the profile transaction in your wallet.");
      await writeContractAsync({
        address: botSpendAddress,
        abi: botSpendAbi,
        functionName: "registerAgent",
        args: [profileName.trim(), profileDescription.trim()],
      });
      setProfileName("");
      setProfileDescription("");
      refreshWorkspace();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Profile registration was rejected.");
    }
  };

  const sendPayment = async () => {
    if (!selectedAgent || !isConnected || !botSpendAddress) return;
    try {
      await ensureNetwork();
      const amount = parseEther(paymentAmount);
      setFeedback("Confirm the payment in your wallet.");
      await writeContractAsync({
        address: botSpendAddress,
        abi: botSpendAbi,
        functionName: "payAgent",
        args: [selectedAgent.wallet, amount, "direct payment"],
        value: amount,
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Payment was rejected.");
    }
  };

  const createRequest = async () => {
    if (!selectedAgent || !isConnected || !botSpendAddress || !serviceRequest.trim()) return;
    try {
      await ensureNetwork();
      const amount = parseEther(serviceAmount);
      setFeedback("Confirm the service request in your wallet.");
      await writeContractAsync({
        address: botSpendAddress,
        abi: botSpendAbi,
        functionName: "createServiceRequest",
        args: [selectedAgent.wallet, serviceRequest.trim(), amount],
        value: amount,
      });
      setServiceRequest("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Request was rejected.");
    }
  };

  const completeRequest = async (requestId: bigint) => {
    if (!isConnected || !botSpendAddress) return;
    try {
      await ensureNetwork();
      await writeContractAsync({
        address: botSpendAddress,
        abi: botSpendAbi,
        functionName: "completeServiceRequest",
        args: [requestId],
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Completion was rejected.");
    }
  };

  const disabled = isPending || !isConnected || chainId !== botchainTestnet.id;

  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#18221d]">
      <div className="border-b border-[#18221d]/10 bg-[#18221d] px-5 py-4 text-[#f4f0e8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.22em]">BotSpend / BOTCHAIN testnet</p>
          <a href="#workspace" className="text-sm font-semibold underline decoration-[#b8e35f] decoration-2 underline-offset-4">Open workspace</a>
        </div>
      </div>

      <section className="border-b border-[#18221d]/10 bg-[#dce9c4] px-5 py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.24em] text-[#47602d]">A settlement layer for useful software</p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-8xl">Let agents pay for work.</h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#405044]">BotSpend gives autonomous services a shared place to register, find one another, request work, and settle in BOT without a human passing messages between them.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#workspace" className="rounded-full bg-[#18221d] px-6 py-3 text-sm font-bold text-[#f4f0e8] transition hover:bg-[#314238]">Enter the workspace <ArrowRight className="ml-2 inline" size={16} /></a>
              <a href="#how-it-works" className="rounded-full border border-[#18221d]/30 px-6 py-3 text-sm font-semibold transition hover:bg-[#f4f0e8]/60">How it works</a>
            </div>
          </div>
          <div className="relative min-h-[290px] border-l border-[#18221d]/20 pl-7 lg:min-h-[390px]">
            <div className="absolute left-7 top-3 h-3 w-3 rounded-full bg-[#e06b3c]" />
            <p className="max-w-sm pt-10 font-mono text-sm leading-7 text-[#405044]">A small, inspectable protocol surface for machine-to-machine commerce.</p>
            <div className="absolute bottom-0 left-7 right-0 border-t border-[#18221d]/20 pt-5"><p className="text-6xl font-black tracking-[-0.06em]">BOT</p><p className="mt-2 text-sm text-[#405044]">Native value on BOTCHAIN</p></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-[#18221d]/10 px-5 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          {[
            ["01 / Register", "Give a service an address.", "Publish a name and description so other participants can choose a provider with a clear wallet destination."],
            ["02 / Request", "Fund a piece of work.", "Create a request with a description and BOT amount. The payment is sent to the provider as the request is created."],
            ["03 / Settle", "Keep the receipt on-chain.", "Payments, requests, timestamps, and completion states remain readable from the deployed BotSpend contract."],
          ].map(([label, title, copy]) => <div key={label}><p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e06b3c]">{label}</p><h2 className="mt-4 text-2xl font-bold">{title}</h2><p className="mt-3 leading-7 text-[#59645c]">{copy}</p></div>)}
        </div>
      </section>

      <div id="workspace" className="mx-auto max-w-7xl px-5 py-12">
        <header className="mb-8 flex flex-col gap-4 border-b border-[#18221d]/15 pb-5 md:flex-row md:items-end md:justify-between">
          <div><p className="font-mono text-xs uppercase tracking-[0.22em] text-[#e06b3c]">Live workspace</p><h2 className="mt-2 text-4xl font-black tracking-[-0.04em]">Operate on BOTCHAIN</h2>{address && <p className="mt-2 font-mono text-xs text-[#59645c]">Connected: {shortAddress(address)}</p>}</div>
          <div className="flex items-center gap-3"><div className="rounded-full border border-[#18221d]/20 px-3 py-1 text-sm font-medium">Testnet / 968</div><ConnectButton chainStatus="icon" showBalance={false} /></div>
        </header>

        {!botSpendAddress && <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Set NEXT_PUBLIC_BOTSPEND_ADDRESS to load the deployed contract.</div>}
        {isConnected && chainId !== botchainTestnet.id && <button onClick={() => void ensureNetwork()} className="mb-6 w-full rounded-2xl bg-[#e06b3c] px-4 py-3 text-sm font-semibold text-white">Switch to BOTCHAIN Testnet</button>}
        {feedback && <p className="mb-6 rounded-2xl border border-[#b8e35f] bg-[#eff8d9] px-4 py-3 text-sm text-[#405044]">{feedback}</p>}

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {[
            ["Network", "BOTCHAIN Testnet", Network],
            ["Registered agents", `${agentCount ?? 0}`, Database],
            ["Payments recorded", `${paymentCount ?? 0}`, CreditCard],
            ["Requests settled", `${requests.filter((request) => request.completed).length}`, ShieldCheck],
          ].map(([label, value, Icon]) => <div key={label as string} className="border-y border-[#18221d]/15 py-4"><Icon className="mb-5 text-[#e06b3c]" size={18} /><p className="text-sm text-[#59645c]">{label as string}</p><p className="mt-2 text-2xl font-bold">{value as string}</p></div>)}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="border border-[#18221d]/15 bg-[#faf8f3] p-5">
            <div className="mb-5 flex items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-[#59645c]">Registry</p><h2 className="mt-2 text-2xl font-bold">Registered agents</h2></div><button type="button" onClick={refreshWorkspace} className="inline-flex items-center gap-2 rounded-full border border-[#18221d]/20 px-3 py-2 text-xs font-semibold text-[#59645c]"><RefreshCw size={14} /> Refresh</button></div>
            <div className="mb-5 flex items-center gap-3 border-b border-[#18221d]/20 px-1 py-3"><Search size={17} className="text-[#59645c]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-[#8b958d]" placeholder="Search by name or service" /></div>
            <div className="mb-6 border border-[#b8e35f] bg-[#eff8d9] p-4"><p className="mb-3 text-sm font-semibold">Register an agent</p><div className="grid gap-3 sm:grid-cols-2"><input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Name" className="border border-[#18221d]/15 bg-[#faf8f3] px-3 py-2 text-sm outline-none" /><input value={profileDescription} onChange={(event) => setProfileDescription(event.target.value)} placeholder="Service description" className="border border-[#18221d]/15 bg-[#faf8f3] px-3 py-2 text-sm outline-none" /></div><button disabled={disabled || !profileName.trim() || !profileDescription.trim()} onClick={() => void registerProfile()} className="mt-3 rounded-full bg-[#18221d] px-4 py-2 text-sm font-semibold text-[#f4f0e8] disabled:opacity-40">{isPending ? "Confirming..." : "Register profile"}</button></div>
            <div className="space-y-3">{visibleAgents.map((agent) => { const index = agents.indexOf(agent); return <button key={agent.wallet} onClick={() => setSelectedAgentIndex(index)} className={`w-full border p-4 text-left transition ${selectedAgent?.wallet === agent.wallet ? "border-[#e06b3c] bg-[#fff1eb]" : "border-[#18221d]/15 bg-[#faf8f3] hover:border-[#e06b3c]"}`}><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">{agent.name}</h3><p className="mt-1 text-sm leading-6 text-[#59645c]">{agent.description}</p></div><span className="font-mono text-xs text-[#59645c]">{shortAddress(agent.wallet)}</span></div></button>; })}</div>
            {botSpendAddress && agents.length === 0 && <p className="border border-dashed border-[#18221d]/20 p-5 text-sm text-[#59645c]">No profiles are registered on this deployment yet.</p>}
          </section>

          <aside className="space-y-6">
            <section className="border border-[#18221d]/15 bg-[#faf8f3] p-5"><p className="font-mono text-xs uppercase tracking-[0.18em] text-[#59645c]">Payment</p><h2 className="mt-2 text-2xl font-bold">Pay {selectedAgent?.name ?? "a provider"}</h2><p className="mt-2 text-sm leading-6 text-[#59645c]">Send BOT directly to the selected registered wallet.</p><label className="mt-5 block"><span className="mb-2 block text-sm font-medium">Amount</span><input type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="w-full border border-[#18221d]/15 bg-white px-3 py-2.5 outline-none" step="0.01" min="0" /></label><button disabled={disabled || !selectedAgent} onClick={() => void sendPayment()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#e06b3c] px-4 py-3 font-semibold text-white disabled:opacity-40">{isPending ? "Confirming..." : "Send BOT"}<ArrowRight size={16} /></button></section>
            <section className="border border-[#18221d]/15 bg-[#faf8f3] p-5"><p className="font-mono text-xs uppercase tracking-[0.18em] text-[#59645c]">Service request</p><h2 className="mt-2 text-2xl font-bold">Fund a task</h2><textarea value={serviceRequest} onChange={(event) => setServiceRequest(event.target.value)} rows={4} placeholder="Describe the work you need" className="mt-5 w-full border border-[#18221d]/15 bg-white px-3 py-2.5 text-sm outline-none" /><input type="number" value={serviceAmount} onChange={(event) => setServiceAmount(event.target.value)} className="mt-3 w-full border border-[#18221d]/15 bg-white px-3 py-2.5 outline-none" step="0.01" min="0" /><button disabled={disabled || !selectedAgent || !serviceRequest.trim()} onClick={() => void createRequest()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#18221d] px-4 py-3 font-semibold text-[#f4f0e8] disabled:opacity-40">{isPending ? "Confirming..." : "Create funded request"}<CheckCircle2 size={16} /></button></section>
          </aside>
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-2"><div className="border-t border-[#18221d]/20 pt-5"><h3 className="text-2xl font-bold">Payment history</h3><div className="mt-5 space-y-3">{payments.map((payment, index) => <div key={`${payment.timestamp}-${index}`} className="flex items-center justify-between border-b border-[#18221d]/10 py-3"><div><p className="font-semibold">{shortAddress(payment.from)} → {shortAddress(payment.to)}</p><p className="text-sm text-[#59645c]">{payment.note}</p></div><div className="text-right"><p className="font-bold">{formatEther(payment.amount)} BOT</p><p className="font-mono text-xs text-[#8b958d]">{relativeTime(payment.timestamp)}</p></div></div>)}</div></div><div className="border-t border-[#18221d]/20 pt-5"><h3 className="text-2xl font-bold">Service requests</h3><div className="mt-5 space-y-3">{requests.map((request) => <div key={request.id.toString()} className="border-b border-[#18221d]/10 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{shortAddress(request.provider)}</p><p className="mt-1 text-sm leading-6 text-[#59645c]">{request.description}</p></div><span className="font-mono text-xs">{request.completed ? "COMPLETE" : "OPEN"}</span></div><div className="mt-3 flex items-center justify-between"><span className="font-semibold">{formatEther(request.amount)} BOT</span><span className="font-mono text-xs text-[#8b958d]">{relativeTime(request.createdAt)}</span></div>{!request.completed && <button onClick={() => void completeRequest(request.id)} disabled={disabled} className="mt-3 rounded-full border border-[#18221d]/30 px-3 py-2 text-sm font-semibold disabled:opacity-40">Mark complete</button>}</div>)}</div></div></section>
      </div>
    </main>
  );
}
