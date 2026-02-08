import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  (window as any).Buffer = (window as any).Buffer || Buffer;
}

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

type Cluster = "devnet" | "mainnet-beta";
const cluster: Cluster =
  (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as Cluster) || "devnet";

const connection = new Connection(clusterApiUrl(cluster), "confirmed");

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}

function getProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const phantom =
    (window as any).phantom?.solana || (window as any).solana;
  if (phantom?.isPhantom) return phantom as PhantomProvider;
  return null;
}

export function isPhantomInstalled(): boolean {
  return getProvider() !== null;
}

export async function signRegistration(
  patientName: string
): Promise<{ signature: string; publicKey: string }> {
  const provider = getProvider();
  if (!provider) {
    throw new Error(
      "Phantom wallet not found. Please install the Phantom browser extension."
    );
  }

  const { publicKey } = await provider.connect();

  const memo = `CareGlobe Patient Registration: ${patientName} | ${new Date().toISOString()}`;

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo),
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = publicKey;

  // Sign locally, then we send ourselves so network is guaranteed
  const signed = await provider.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return { signature, publicKey: publicKey.toBase58() };
}

export function getExplorerUrl(signature: string): string {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
